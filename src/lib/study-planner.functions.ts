import { createServerFn } from "@tanstack/react-start";
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const MODEL = "google/gemini-2.5-flash";

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  return createLovableAiGatewayProvider(key)(MODEL);
}

const PlanSchema = z.object({
  strategy: z.string(),
  daily_timetable: z.array(
    z.object({
      start: z.string(),
      end: z.string(),
      subject: z.string(),
      activity: z.string(),
      focus_area: z.string().nullable(),
    }),
  ),
  weekly_goals: z.array(
    z.object({
      week: z.number().int(),
      label: z.string(),
      goals: z.array(z.string()),
    }),
  ),
  monthly_goals: z.array(
    z.object({
      month: z.string(),
      goals: z.array(z.string()),
    }),
  ),
});

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

    const prompt = `You are an elite study coach. Build a realistic, executable study plan.

Exam: ${data.exam_name}
Exam date: ${data.exam_date} (${daysLeft} days / ~${weeksLeft} weeks away)
Preparation level: ${data.preparation_level}
Daily study capacity: ${data.daily_hours} hours
Schedule preference: ${data.schedule_preference || "no preference"}
Weak subjects: ${data.weak_subjects.join(", ") || "none listed"}
Strong subjects: ${data.strong_subjects.join(", ") || "none listed"}
Extra notes: ${data.notes || "none"}

Produce:
1. strategy — 3-6 sentence overall approach (concept-building → practice → revision phases based on time left).
2. daily_timetable — a full day of time-blocks fitting within ${data.daily_hours} hours of study (plus short breaks). Prioritise weak subjects. Include realistic clock times (24h "HH:MM").
3. weekly_goals — one entry per week (up to 8 weeks, or fewer if exam is closer), with 3-5 concrete goals each. Focus each week on specific subjects/chapters.
4. monthly_goals — one entry per remaining month with 3-5 milestone goals.

Rules: Be specific. Reference actual subjects. Never invent syllabus not implied by the exam name. Weak subjects get more time and earlier placement in the day. Include a mock test cycle in the final weeks.`;

    let plan: z.infer<typeof PlanSchema>;
    try {
      const res = await generateObject({
        model: gateway(),
        schema: PlanSchema,
        prompt,
      });
      plan = res.object;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        throw new Error("Could not generate a plan. Try adjusting inputs and retry.");
      }
      throw err;
    }

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

