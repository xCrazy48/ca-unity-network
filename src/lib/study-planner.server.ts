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

export type SyllabusPaper = {
  code: string;
  name: string;
  group: string;
  chapters: { name: string; weightage_min: number | null; weightage_max: number | null }[];
};

export type StudyPlanAiInput = {
  exam_name: string;
  exam_date: string;
  preparation_level: "beginner" | "intermediate" | "advanced" | "revision";
  daily_hours: number;
  schedule_preference?: string | null;
  weak_subjects: string[];
  strong_subjects: string[];
  notes?: string | null;
  student_level?: "inter" | "final" | null;
  student_group?: "group_1" | "group_2" | "both" | null;
  syllabus?: SyllabusPaper[];
};

export type StudyPlanAiOutput = z.infer<typeof PlanSchema>;

function createModel(lovableApiKey: string) {
  return createLovableAiGatewayProvider(lovableApiKey, true)(MODEL);
}

function formatSyllabus(syllabus: SyllabusPaper[] | undefined) {
  if (!syllabus || syllabus.length === 0) return "No paper syllabus attached — infer only from the exam name and do NOT invent chapters.";
  return syllabus
    .map((p) => {
      const chapters = p.chapters
        .map((c) => {
          const w =
            c.weightage_min != null && c.weightage_max != null
              ? ` (${c.weightage_min}–${c.weightage_max}%)`
              : "";
          return `    - ${c.name}${w}`;
        })
        .join("\n");
      return `- ${p.name} [${p.code}, ${p.group}]\n${chapters}`;
    })
    .join("\n");
}

function buildPrompt(data: StudyPlanAiInput, daysLeft: number, weeksLeft: number) {
  const levelLabel = data.student_level === "final" ? "CA Final" : data.student_level === "inter" ? "CA Intermediate" : "CA";
  const groupLabel = data.student_group === "group_1" ? "Group 1" : data.student_group === "group_2" ? "Group 2" : "Both Groups";
  const syllabusBlock = formatSyllabus(data.syllabus);

  return `Build a realistic, executable study plan for a ${levelLabel} (${groupLabel}) student following the ICAI NEW SCHEME (effective May 2024, current BoS Study Material).

Exam: ${data.exam_name}
Exam date: ${data.exam_date} (${daysLeft} days / ~${weeksLeft} weeks away)
Preparation level: ${data.preparation_level}
Daily study capacity: ${data.daily_hours} hours
Schedule preference: ${data.schedule_preference || "no preference"}
Weak subjects: ${data.weak_subjects.join(", ") || "none listed"}
Strong subjects: ${data.strong_subjects.join(", ") || "none listed"}
Extra notes: ${data.notes || "none"}

AUTHORITATIVE ICAI NEW SCHEME SYLLABUS (choose chapters ONLY from this list — do not invent, rename, or reference Old Scheme papers):
${syllabusBlock}

Produce:
1. strategy — 3-6 sentence overall approach (concept-building → practice → revision phases based on time left). Explicitly mention it is aligned to the ICAI New Scheme.
2. daily_timetable — a full day of time-blocks fitting within ${data.daily_hours} hours of study (plus short breaks). Prioritise weak subjects. Include realistic clock times (24h "HH:MM"). Every "focus_area" MUST be a chapter name copied verbatim from the syllabus above.
3. weekly_goals — one entry per week, up to 8 weeks, with 3-5 concrete goals. Reference specific chapters from the syllabus. Sequence high-weightage chapters earlier; give heavier weightage bands more revision cycles.
4. monthly_goals — one entry per remaining month with 3-5 milestone goals tied to syllabus coverage %, mocks, RTP/MTP, and revision rounds.

Hard rules:
- Only use paper names and chapter names shown in the syllabus block above.
- Do NOT reference deprecated Old Scheme papers (e.g. "EIS-SM", "Financial Reporting under AS-only", "IPCC", "Corporate & Economic Laws" as a standalone Inter paper, "Enterprise Information Systems", etc.).
- Weak subjects get more time and earlier placement in the day.
- Include a mock test cycle (MTP/RTP) in the final weeks and a full revision loop in the last 2 weeks.`;
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
    "You are CA Unity Network's study planner for CA Intermediate and CA Final students on the ICAI NEW SCHEME (effective May 2024). Only reference papers and chapters from the current ICAI Study Material / BoS / New Scheme syllabus provided in the prompt. Never mention Old Scheme papers. Produce practical, weightage-aware plans with concrete time blocks.";


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
    if (!NoObjectGeneratedError.isInstance(error)) throw error;

    if (error.text) {
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