import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateStudyPlanWithAi, type SyllabusPaper } from "@/lib/study-planner.server";
import { FINAL_CHAPTERS } from "@/lib/icai-syllabus";

const GenerateInput = z.object({
  exam_name: z.string().min(1).max(120),
  exam_date: z.string().min(1),
  preparation_level: z.enum(["beginner", "intermediate", "advanced", "revision"]),
  daily_hours: z.number().min(0.5).max(16),
  schedule_preference: z.string().max(400).optional().nullable(),
  weak_subjects: z.array(z.string()).default([]),
  strong_subjects: z.array(z.string()).default([]),
  notes: z.string().max(1000).optional().nullable(),
});

async function loadSyllabus(
  supabase: any,
  level: "inter" | "final",
  group: "group_1" | "group_2" | "both",
): Promise<SyllabusPaper[]> {

  const { data: papers } = await supabase
    .from("papers")
    .select("code,name,paper_group,level,sort_order")
    .eq("level", level)
    .order("sort_order");
  const filtered = (papers ?? []).filter(
    (p: any) => group === "both" || p.paper_group === group,
  );
  const codes = filtered.map((p: any) => p.code);
  const { data: chaptersRows } = await supabase
    .from("chapters")
    .select("paper_code,name,weightage_min,weightage_max,sort_order")
    .in("paper_code", codes.length ? codes : ["__none__"])
    .order("sort_order");
  const byPaper = new Map<string, { name: string; weightage_min: number | null; weightage_max: number | null }[]>();
  for (const c of chaptersRows ?? []) {
    const arr = byPaper.get(c.paper_code) ?? [];
    arr.push({ name: c.name, weightage_min: c.weightage_min, weightage_max: c.weightage_max });
    byPaper.set(c.paper_code, arr);
  }
  return filtered.map((p: any) => {
    let chapters = byPaper.get(p.code) ?? [];
    if (chapters.length === 0 && FINAL_CHAPTERS[p.code]) {
      chapters = FINAL_CHAPTERS[p.code].map((c) => ({
        name: c.name,
        weightage_min: c.weightage_min,
        weightage_max: c.weightage_max,
      }));
    }
    return {
      code: p.code,
      name: p.name,
      group: p.paper_group,
      chapters,
    };
  });
}

export const generateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => GenerateInput.parse(v))
  .handler(async ({ context, data }) => {
    const examDate = new Date(data.exam_date);
    const today = new Date();
    const daysLeft = Math.max(
      1,
      Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("level,exam_group")
      .eq("id", context.userId)
      .maybeSingle();
    const level = (profile?.level === "final" ? "final" : "inter") as "inter" | "final";
    const group = ((profile?.exam_group as string) || "both") as "group_1" | "group_2" | "both";
    const syllabus = await loadSyllabus(context.supabase, level, group);

    const hasChapters = syllabus.some((p) => p.chapters.length > 0);
    if (syllabus.length === 0 || !hasChapters) {
      throw new Error(
        "ICAI New Scheme syllabus data is missing for your papers. Please open Exam Calendar and select your level & group, then try again. If the problem persists, contact support.",
      );
    }

    const plan = await generateStudyPlanWithAi(
      { ...data, student_level: level, student_group: group, syllabus },
      key,
      daysLeft,
      weeksLeft,
    );


    // Deactivate previous active plan
    await context.supabase
      .from("study_plans")
      .update({ is_active: false })
      .eq("user_id", context.userId)
      .eq("is_active", true);

    const { data: row, error } = await context.supabase
      .from("study_plans")
      .insert({
        user_id: context.userId,
        exam_name: data.exam_name,
        exam_date: data.exam_date,
        preparation_level: data.preparation_level,
        daily_hours: data.daily_hours,
        schedule_preference: data.schedule_preference ?? null,
        weak_subjects: data.weak_subjects,
        strong_subjects: data.strong_subjects,
        notes: data.notes ?? null,
        strategy: plan.strategy,
        daily_timetable: plan.daily_timetable,
        weekly_goals: plan.weekly_goals,
        monthly_goals: plan.monthly_goals,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("award_xp", { _user_id: context.userId, _amount: 30 });
    await supabaseAdmin.from("notifications").insert({
      user_id: context.userId,
      title: "Study plan ready — +30 XP",
      body: `${data.exam_name} · ${daysLeft} days · ${plan.daily_timetable.length} daily blocks`,
      category: "achievement",
    });

    return { id: row.id, plan: row };
  });

export const deleteStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("study_plans")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const activateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("study_plans")
      .update({ is_active: false })
      .eq("user_id", context.userId)
      .eq("is_active", true);
    const { error } = await context.supabase
      .from("study_plans")
      .update({ is_active: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SyncInput = z.object({
  plan_id: z.string().uuid(),
  days: z.number().int().min(1).max(30).default(7),
  start_date: z.string().optional(),
});

type TimetableBlock = {
  start: string;
  end: string;
  subject: string;
  activity: string;
  focus_area: string | null;
};

function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export const syncPlanToTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => SyncInput.parse(v))
  .handler(async ({ context, data }) => {
    const { data: plan, error: pErr } = await context.supabase
      .from("study_plans")
      .select("*")
      .eq("id", data.plan_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!plan) throw new Error("Plan not found");

    const blocks = ((plan.daily_timetable as unknown) as TimetableBlock[]) ?? [];
    if (blocks.length === 0) throw new Error("This plan has no daily timetable to sync.");

    const start = data.start_date ? new Date(data.start_date) : new Date();
    start.setHours(0, 0, 0, 0);

    const rows: Array<{
      user_id: string;
      title: string;
      description: string;
      scheduled_date: string;
      duration_minutes: number | null;
      priority: "medium";
      ai_generated: true;
      sort_order: number;
    }> = [];

    for (let d = 0; d < data.days; d++) {
      const day = new Date(start.getTime() + d * 86400000);
      const iso = day.toISOString().slice(0, 10);
      blocks.forEach((b, i) => {
        rows.push({
          user_id: context.userId,
          title: `${b.start}–${b.end} · ${b.subject}`,
          description: [b.activity, b.focus_area].filter(Boolean).join(" — "),
          scheduled_date: iso,
          duration_minutes: minutesBetween(b.start, b.end),
          priority: "medium",
          ai_generated: true,
          sort_order: i,
        });
      });
    }

    const { error } = await context.supabase.from("tasks").insert(rows);
    if (error) throw new Error(error.message);
    return { inserted: rows.length, days: data.days };
  });

