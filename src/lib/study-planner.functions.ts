import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateStudyPlanWithAi, type SyllabusPaper } from "@/lib/study-planner.server";
import { FINAL_CHAPTERS } from "@/lib/icai-syllabus";

type TimetableBlock = {
  start: string;
  end: string;
  subject: string;
  activity: string;
  focus_area: string | null;
};

type PlanDayType = "study" | "revision" | "holiday" | "buffer";

type PlanDay = {
  date: string; // YYYY-MM-DD
  type: PlanDayType;
  wake: string | null;
  sleep: string | null;
  note: string | null;
  blocks: TimetableBlock[];
};

const GenerateInput = z.object({
  exam_name: z.string().min(1).max(120),
  exam_date: z.string().min(1),
  preparation_level: z.enum(["beginner", "intermediate", "advanced", "revision"]),
  daily_hours: z.number().min(0.5).max(16),
  schedule_preference: z.string().max(400).optional().nullable(),
  weak_subjects: z.array(z.string()).default([]),
  strong_subjects: z.array(z.string()).default([]),
  notes: z.string().max(1000).optional().nullable(),
  // New optional preferences — AI decides when omitted
  study_style: z.enum(["aggressive", "balanced", "relaxed", "ranker"]).optional().nullable(),
  attempt: z.string().max(60).optional().nullable(),
  coaching_hours: z.number().min(0).max(12).optional().nullable(),
  working: z.boolean().optional().nullable(),
  preferred_slots: z.array(z.enum(["early_morning", "morning", "afternoon", "evening", "night"])).optional().default([]),
  subjects_per_day: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().nullable(),
  max_session_hours: z.union([z.literal(1), z.literal(1.5), z.literal(2)]).optional().nullable(),
  revision_frequency: z.enum(["daily", "every_2_days", "weekly"]).optional().nullable(),
  buffer_days: z.number().int().min(0).max(30).optional().nullable(),
  weekly_holiday: z.enum(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]).optional().nullable(),
  break_minutes: z.union([z.literal(15), z.literal(30), z.literal(45)]).optional().nullable(),
});

const SLOT_LABELS: Record<string, string> = {
  early_morning: "Early morning (5–8 AM)",
  morning: "Morning (8 AM–12 PM)",
  afternoon: "Afternoon (12–4 PM)",
  evening: "Evening (4–8 PM)",
  night: "Night (8 PM onward)",
};
const STYLE_BRIEFS: Record<string, string> = {
  aggressive: "AGGRESSIVE MODE: prioritise fastest syllabus completion. Longer sessions, smaller buffers, fewer holidays. Suitable for late starters.",
  balanced: "BALANCED MODE: healthy mix of learning, revision and practice. Moderate daily workload.",
  relaxed: "RELAXED MODE: lighter daily load, more buffer days, frequent short revisions, lower burnout risk.",
  ranker: "RANKER MODE: heavy revision cycles, spaced repetition, extra mocks (MTP/RTP), daily recall sessions, focus on high-weightage topics, strict discipline.",
};
const DAY_LABELS: Record<string, string> = { sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" };
const DAY_IDX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function buildPreferenceNotes(data: z.infer<typeof GenerateInput>): string {
  const parts: string[] = [];
  if (data.study_style) parts.push(STYLE_BRIEFS[data.study_style]);
  if (data.attempt) parts.push(`Attempt: ${data.attempt}.`);
  if (typeof data.coaching_hours === "number" && data.coaching_hours > 0) parts.push(`Coaching: ~${data.coaching_hours}h/day — schedule study around it.`);
  if (data.working) parts.push("Student is working / in articleship — realistic weekday load, heavier weekend sessions.");
  if (data.preferred_slots?.length) parts.push(`Preferred study slots: ${data.preferred_slots.map((s) => SLOT_LABELS[s]).join(", ")}.`);
  if (data.subjects_per_day) parts.push(`Target ${data.subjects_per_day} subject(s) per day.`);
  if (data.max_session_hours) parts.push(`Max continuous session: ${data.max_session_hours}h before a break.`);
  if (data.revision_frequency) parts.push(`Revision frequency: ${data.revision_frequency.replace(/_/g, " ")}.`);
  if (typeof data.buffer_days === "number") parts.push(`Reserve ~${data.buffer_days} buffer day(s) before exam.`);
  if (data.weekly_holiday) parts.push(`Weekly holiday: ${DAY_LABELS[data.weekly_holiday]}.`);
  if (data.break_minutes) parts.push(`Break duration: ${data.break_minutes} min.`);
  parts.push("Any preference not stated → decide intelligently as an experienced CA mentor. Do not ask the user; produce the best plan.");
  return parts.join(" ");
}

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

    const preferenceNotes = buildPreferenceNotes(data);
    const mergedNotes = [data.notes, preferenceNotes].filter(Boolean).join(" \n\n");

    const plan = await generateStudyPlanWithAi(
      { ...data, notes: mergedNotes, student_level: level, student_group: group, syllabus },
      key,
      daysLeft,
      weeksLeft,
    );

    // Build initial plan_days: expand daily_timetable across days up to the exam.
    const capped = Math.min(daysLeft, 90);
    const bufferDays = Math.min(
      capped - 1,
      Math.max(0, typeof data.buffer_days === "number" ? data.buffer_days : 3),
    );
    const holidayIdx = data.weekly_holiday ? DAY_IDX[data.weekly_holiday] : -1;
    const planDays: PlanDay[] = [];
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i < capped; i++) {
      const d = new Date(startDate.getTime() + i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      let type: PlanDayType = "study";
      if (i >= capped - bufferDays) type = "revision";
      if (holidayIdx >= 0 && d.getUTCDay() === holidayIdx && type !== "revision") type = "holiday";
      planDays.push({
        date: iso,
        type,
        wake: "06:30",
        sleep: "23:00",
        note: null,
        blocks: type === "study" || type === "revision" ? plan.daily_timetable.map((b) => ({ ...b })) : [],
      });
    }

    // Deactivate previous active plan
    await context.supabase
      .from("study_plans")
      .update({ is_active: false })
      .eq("user_id", context.userId)
      .eq("is_active", true);

    const { data: row, error } = await (context.supabase as any)
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
        plan_days: planDays,
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

    const planDays = ((plan.plan_days as unknown) as PlanDay[] | null) ?? null;
    const fallbackBlocks = ((plan.daily_timetable as unknown) as TimetableBlock[]) ?? [];
    if ((!planDays || planDays.length === 0) && fallbackBlocks.length === 0) {
      throw new Error("This plan has no daily timetable to sync.");
    }

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
      let blocks: TimetableBlock[] = fallbackBlocks;
      let dayLabel = "";
      if (planDays) {
        const found = planDays.find((p) => p.date === iso);
        if (found) {
          if (found.type === "holiday") continue; // skip holidays
          blocks = found.blocks?.length ? found.blocks : fallbackBlocks;
          dayLabel = found.type !== "study" ? ` [${found.type}]` : "";
        }
      }
      blocks.forEach((b, i) => {
        rows.push({
          user_id: context.userId,
          title: `${b.start}–${b.end} · ${b.subject}${dayLabel}`,
          description: [b.activity, b.focus_area].filter(Boolean).join(" — "),
          scheduled_date: iso,
          duration_minutes: minutesBetween(b.start, b.end),
          priority: "medium",
          ai_generated: true,
          sort_order: i,
        });
      });
    }

    if (rows.length === 0) throw new Error("No study days in that range (all holidays?).");

    const { error } = await context.supabase.from("tasks").insert(rows);
    if (error) throw new Error(error.message);
    return { inserted: rows.length, days: data.days };
  });

const TimetableBlockSchema = z.object({
  start: z.string(),
  end: z.string(),
  subject: z.string(),
  activity: z.string(),
  focus_area: z.string().nullable(),
});

const PlanDaySchema = z.object({
  date: z.string(),
  type: z.enum(["study", "revision", "holiday", "buffer"]),
  wake: z.string().nullable(),
  sleep: z.string().nullable(),
  note: z.string().nullable(),
  blocks: z.array(TimetableBlockSchema),
});

const UpdatePlanInput = z.object({
  id: z.string().uuid(),
  daily_timetable: z.array(TimetableBlockSchema).optional(),
  plan_days: z.array(PlanDaySchema).optional(),
  strategy: z.string().max(2000).optional(),
  daily_hours: z.number().min(0.5).max(16).optional(),
});

export const updateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => UpdatePlanInput.parse(v))
  .handler(async ({ context, data }) => {
    const patch: {
      updated_at: string;
      daily_timetable?: unknown;
      plan_days?: unknown;
      strategy?: string;
      daily_hours?: number;
    } = { updated_at: new Date().toISOString() };
    if (data.daily_timetable) patch.daily_timetable = data.daily_timetable;
    if (data.plan_days) patch.plan_days = data.plan_days;
    if (data.strategy !== undefined) patch.strategy = data.strategy;
    if (data.daily_hours !== undefined) patch.daily_hours = data.daily_hours;
    const { error } = await (context.supabase as any)
      .from("study_plans")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const RegenerateDayInput = z.object({
  plan_id: z.string().uuid(),
  date: z.string(),
  focus_hint: z.string().max(400).optional().nullable(),
});

export const regenerateDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => RegenerateDayInput.parse(v))
  .handler(async ({ context, data }) => {
    const { data: plan, error } = await context.supabase
      .from("study_plans")
      .select("*")
      .eq("id", data.plan_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!plan) throw new Error("Plan not found");

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

    const examDate = new Date(plan.exam_date);
    const target = new Date(data.date);
    const daysLeft = Math.max(1, Math.ceil((examDate.getTime() - target.getTime()) / 86400000));

    const notes = [
      plan.notes,
      data.focus_hint ? `Regenerate just this day. Focus: ${data.focus_hint}` : "Regenerate just this day.",
    ]
      .filter(Boolean)
      .join(" ");

    const fresh = await generateStudyPlanWithAi(
      {
        exam_name: plan.exam_name,
        exam_date: plan.exam_date,
        preparation_level: plan.preparation_level as "beginner" | "intermediate" | "advanced" | "revision",
        daily_hours: plan.daily_hours,
        schedule_preference: plan.schedule_preference,
        weak_subjects: (plan.weak_subjects as string[]) ?? [],
        strong_subjects: (plan.strong_subjects as string[]) ?? [],
        notes,
        student_level: level,
        student_group: group,
        syllabus,
      },
      key,
      daysLeft,
      Math.max(1, Math.ceil(daysLeft / 7)),
    );

    // Merge into plan_days
    const existing = ((plan.plan_days as unknown) as PlanDay[] | null) ?? [];
    const idx = existing.findIndex((d) => d.date === data.date);
    const newBlocks = fresh.daily_timetable.map((b) => ({ ...b }));
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], type: "study", blocks: newBlocks };
    } else {
      existing.push({
        date: data.date,
        type: "study",
        wake: "06:30",
        sleep: "23:00",
        note: null,
        blocks: newBlocks,
      });
      existing.sort((a, b) => a.date.localeCompare(b.date));
    }
    const { error: upErr } = await (context.supabase as any)
      .from("study_plans")
      .update({ plan_days: existing, updated_at: new Date().toISOString() })
      .eq("id", data.plan_id)
      .eq("user_id", context.userId);
    if (upErr) throw new Error(upErr.message);

    return { blocks: newBlocks };
  });

const RegenerateRemainingInput = z.object({
  plan_id: z.string().uuid(),
  from_date: z.string().optional(),
  focus_hint: z.string().max(400).optional().nullable(),
});

export const regenerateRemaining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => RegenerateRemainingInput.parse(v))
  .handler(async ({ context, data }) => {
    const { data: plan, error } = await context.supabase
      .from("study_plans")
      .select("*")
      .eq("id", data.plan_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!plan) throw new Error("Plan not found");

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

    const from = data.from_date ? new Date(data.from_date) : new Date();
    from.setUTCHours(0, 0, 0, 0);
    const examDate = new Date(plan.exam_date);
    const daysLeft = Math.max(1, Math.ceil((examDate.getTime() - from.getTime()) / 86400000));

    const fresh = await generateStudyPlanWithAi(
      {
        exam_name: plan.exam_name,
        exam_date: plan.exam_date,
        preparation_level: plan.preparation_level as "beginner" | "intermediate" | "advanced" | "revision",
        daily_hours: plan.daily_hours,
        schedule_preference: plan.schedule_preference,
        weak_subjects: (plan.weak_subjects as string[]) ?? [],
        strong_subjects: (plan.strong_subjects as string[]) ?? [],
        notes: [plan.notes, data.focus_hint, "Rebuild only the REMAINING days (not the whole plan). Adjust intelligently for time lost."].filter(Boolean).join(" "),
        student_level: level,
        student_group: group,
        syllabus,
      },
      key,
      daysLeft,
      Math.max(1, Math.ceil(daysLeft / 7)),
    );

    const existing = ((plan.plan_days as unknown) as PlanDay[] | null) ?? [];
    const past = existing.filter((d) => d.date < from.toISOString().slice(0, 10));
    const capped = Math.min(daysLeft, 90);
    const bufferDays = Math.min(capped - 1, 3);
    const nextDays: PlanDay[] = [];
    for (let i = 0; i < capped; i++) {
      const d = new Date(from.getTime() + i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const type: PlanDayType = i >= capped - bufferDays ? "revision" : "study";
      nextDays.push({
        date: iso,
        type,
        wake: "06:30",
        sleep: "23:00",
        note: null,
        blocks: fresh.daily_timetable.map((b) => ({ ...b })),
      });
    }
    const merged = [...past, ...nextDays];

    const { error: upErr } = await (context.supabase as any)
      .from("study_plans")
      .update({
        plan_days: merged,
        daily_timetable: fresh.daily_timetable,
        strategy: fresh.strategy,
        weekly_goals: fresh.weekly_goals,
        monthly_goals: fresh.monthly_goals,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.plan_id)
      .eq("user_id", context.userId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, from: from.toISOString().slice(0, 10), days: nextDays.length };
  });

