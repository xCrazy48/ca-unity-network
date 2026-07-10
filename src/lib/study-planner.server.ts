import { generateObject, generateText, NoObjectGeneratedError } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const MODEL = "google/gemini-2.5-flash";

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
      week: z.number(),
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

export type StudyPlanAiInput = {
  exam_name: string;
  exam_date: string;
  preparation_level: "beginner" | "intermediate" | "advanced" | "revision";
  daily_hours: number;
  schedule_preference?: string | null;
  weak_subjects: string[];
  strong_subjects: string[];
  notes?: string | null;
};

export type StudyPlanAiOutput = z.infer<typeof PlanSchema>;

function createModel(lovableApiKey: string) {
  return createLovableAiGatewayProvider(lovableApiKey)(MODEL);
}

function buildPrompt(data: StudyPlanAiInput, daysLeft: number, weeksLeft: number) {
  return `Build a realistic, executable study plan.

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
3. weekly_goals — one entry per week, up to 8 weeks, with 3-5 concrete goals each. Focus each week on specific subjects/chapters.
4. monthly_goals — one entry per remaining month with 3-5 milestone goals.

Rules: Be specific. Reference actual subjects. Never invent syllabus not implied by the exam name. Weak subjects get more time and earlier placement in the day. Include a mock test cycle in the final weeks.`;
}

function extractJsonObject(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function normalizePlan(candidate: unknown): StudyPlanAiOutput {
  const plan = PlanSchema.parse(candidate);
  if (plan.daily_timetable.length === 0) {
    throw new Error("Generated plan had no timetable blocks.");
  }

  return {
    strategy: plan.strategy,
    daily_timetable: plan.daily_timetable.slice(0, 12),
    weekly_goals: plan.weekly_goals.slice(0, 8),
    monthly_goals: plan.monthly_goals.slice(0, 6),
  };
}

export async function generateStudyPlanWithAi(
  data: StudyPlanAiInput,
  lovableApiKey: string,
  daysLeft: number,
  weeksLeft: number,
): Promise<StudyPlanAiOutput> {
  const model = createModel(lovableApiKey);
  const prompt = buildPrompt(data, daysLeft, weeksLeft);
  const system =
    "You are CA Unity Network's study planner for CA Inter and CA Final students. Produce practical, syllabus-aware plans with concrete time blocks.";

  try {
    const { object } = await generateObject({
      model,
      schema: PlanSchema,
      system,
      prompt,
      maxOutputTokens: 4096,
      temperature: 0.5,
    });
    return normalizePlan(object);
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      try {
        return normalizePlan(extractJsonObject(error.text));
      } catch {
        // Try a plain text repair pass below.
      }
    }

    const { text } = await generateText({
      model,
      system: `${system} Return only valid JSON. No markdown, no explanation.`,
      prompt: `${prompt}

Return this exact JSON shape:
{
  "strategy": "string",
  "daily_timetable": [{ "start": "HH:MM", "end": "HH:MM", "subject": "string", "activity": "string", "focus_area": "string or null" }],
  "weekly_goals": [{ "week": 1, "label": "string", "goals": ["string"] }],
  "monthly_goals": [{ "month": "string", "goals": ["string"] }]
}`,
      maxOutputTokens: 4096,
      temperature: 0.4,
    });

    try {
      return normalizePlan(extractJsonObject(text));
    } catch {
      throw new Error("Could not generate a timetable right now. Please try again with fewer notes or a simpler schedule.");
    }
  }
}