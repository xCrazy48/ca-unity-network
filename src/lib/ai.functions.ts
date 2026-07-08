import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const MODEL = "google/gemini-2.5-flash";

function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  return createLovableAiGatewayProvider(key)(MODEL);
}

async function gatherContext(supabase: any, userId: string) {
  const [profile, examConfig, papers, chapters, progress, mocks, mistakes, tasks] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("exam_config").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("papers").select("*").order("sort_order"),
    supabase.from("chapters").select("*"),
    supabase.from("chapter_progress").select("*").eq("user_id", userId),
    supabase.from("mock_tests").select("*").eq("user_id", userId).order("test_date", { ascending: false }).limit(10),
    supabase.from("mistakes").select("*").eq("user_id", userId).eq("status", "open").limit(20),
    supabase.from("tasks").select("*").eq("user_id", userId).gte("scheduled_date", new Date().toISOString().slice(0, 10)).limit(20),
  ]);

  return {
    profile: profile.data,
    examConfig: examConfig.data,
    papers: papers.data ?? [],
    chapters: chapters.data ?? [],
    progress: progress.data ?? [],
    mocks: mocks.data ?? [],
    mistakes: mistakes.data ?? [],
    tasks: tasks.data ?? [],
  };
}

function buildContextString(ctx: Awaited<ReturnType<typeof gatherContext>>) {
  const paperDates = (ctx.examConfig?.paper_dates as Record<string, string> | undefined) ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = ctx.papers
    .map((p: any) => ({ code: p.code, name: p.name, date: paperDates[p.code] }))
    .filter((p: any) => p.date && p.date >= today)
    .sort((a: any, b: any) => a.date.localeCompare(b.date));

  const chapterMap = new Map(ctx.chapters.map((c: any) => [c.id, c]));
  const progressLines = ctx.progress.map((p: any) => {
    const ch: any = chapterMap.get(p.chapter_id);
    return `- ${ch?.paper_code ?? "?"} / ${ch?.name ?? "?"}: ${p.status}, confidence ${p.confidence ?? 0}/100`;
  });

  const mockLines = ctx.mocks.map((m: any) =>
    `- ${m.paper_code} ${m.test_date}: ${m.score}/${m.max_score} (${Math.round((Number(m.score) / Number(m.max_score)) * 100)}%) — weak: ${m.weak_areas ?? "n/a"}`
  );

  return `# Student Context
Attempt: ${ctx.profile?.attempt_session ?? "?"} · Group: ${ctx.profile?.group_target ?? "?"}
Daily study hours: ${ctx.profile?.daily_study_hours ?? "?"}
Upcoming papers:
${upcoming.map((p: any) => `- ${p.name} (${p.code}) on ${p.date}`).join("\n") || "- none set"}

Chapter progress (${ctx.progress.length}):
${progressLines.slice(0, 30).join("\n") || "- no progress logged"}

Recent mocks (${ctx.mocks.length}):
${mockLines.join("\n") || "- no mocks logged"}

Open mistakes: ${ctx.mistakes.length}
Scheduled tasks: ${ctx.tasks.length}
`;
}

export const getDailyBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await gatherContext(context.supabase, context.userId);
    const model = getGateway();
    const { text } = await generateText({
      model,
      system:
        "You are CA Unity Network, an elite CA Intermediate exam coach. Be direct, specific, and actionable. Reference ICAI Study Material, RTPs, MTPs, and PYQs by name when relevant. Never invent chapter names — only use ones in the context. Use short paragraphs and bullet lists. Max 220 words.",
      prompt: `Write today's morning brief for this student. Structure:\n1) One-line status\n2) Top 3 priorities today (with paper codes)\n3) One risk to watch\n4) A short motivational close.\n\n${buildContextString(ctx)}`,
    });
    return { brief: text, generatedAt: new Date().toISOString() };
  });

export const getWeeklyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await gatherContext(context.supabase, context.userId);
    const model = getGateway();
    const { text } = await generateText({
      model,
      system:
        "You are CA Unity Network, an elite CA Intermediate exam coach. Deliver a candid weekly review. Cite specific chapters/papers only from the provided context. Max 300 words.",
      prompt: `Weekly review for this student. Sections:\n- What worked\n- What slipped\n- Diagnosed weak chapters (from mocks + confidence)\n- Recommended focus for next 7 days (paper-by-paper)\n- One habit to fix.\n\n${buildContextString(ctx)}`,
    });
    return { review: text, generatedAt: new Date().toISOString() };
  });

const RevisionPlanInput = z.object({
  paperCode: z.string(),
  windowDays: z.union([z.literal(7), z.literal(3), z.literal(1)]),
});

export const generateRevisionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => RevisionPlanInput.parse(v))
  .handler(async ({ context, data }) => {
    const ctx = await gatherContext(context.supabase, context.userId);
    const paper = ctx.papers.find((p: any) => p.code === data.paperCode);
    const paperChapters = ctx.chapters.filter((c: any) => c.paper_code === data.paperCode);
    const progressByChapter = new Map(ctx.progress.map((p: any) => [p.chapter_id, p]));
    const chapterLines = paperChapters
      .map((c: any) => {
        const p: any = progressByChapter.get(c.id);
        return `- ${c.name} (weightage ${c.weightage_min}-${c.weightage_max}%): ${p?.status ?? "not started"}, confidence ${p?.confidence ?? 0}`;
      })
      .join("\n");

    const mode = data.windowDays === 1 ? "RESCUE MODE — highest-yield ONLY" : "balanced coverage + weak-area focus";

    const model = getGateway();
    const { text } = await generateText({
      model,
      system:
        "You are CA Unity Network, an elite CA Intermediate coach. Build precise, day-by-day revision plans citing ICAI Study Material, RTPs, MTPs, and PYQs. Never invent chapter names.",
      prompt: `Build a ${data.windowDays}-day revision plan for ${paper?.name ?? data.paperCode} (${mode}).\nDaily study hours available: ${ctx.profile?.daily_study_hours ?? 8}.\n\nChapters:\n${chapterLines}\n\nOutput format — for each day:\n**Day N**\n- Morning: <topics + ICAI resource>\n- Afternoon: <topics + practice>\n- Evening: <RTP/MTP/PYQ + revision>\nEnd with a 3-line "final checklist".`,
    });
    return { plan: text, paperCode: data.paperCode, windowDays: data.windowDays };
  });

const DiagnoseInput = z.object({ paperCode: z.string().optional() });

export const diagnoseWeakChapters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => DiagnoseInput.parse(v))
  .handler(async ({ context, data }) => {
    const ctx = await gatherContext(context.supabase, context.userId);
    const scoped = data.paperCode
      ? {
          ...ctx,
          mocks: ctx.mocks.filter((m: any) => m.paper_code === data.paperCode),
          chapters: ctx.chapters.filter((c: any) => c.paper_code === data.paperCode),
        }
      : ctx;

    const model = getGateway();
    const { text } = await generateText({
      model,
      system:
        "You are CA Unity Network. Diagnose weak chapters from mock scores + confidence + open mistakes. Output ONLY chapters that appear in the provided context. Be concise.",
      prompt: `Diagnose weak chapters${data.paperCode ? ` for ${data.paperCode}` : ""}. For each weak chapter output:\n- Chapter · Paper\n- Why it's weak (1 line, cite evidence)\n- Fix action (1 line, cite ICAI resource)\n\n${buildContextString(scoped)}`,
    });
    return { diagnosis: text };
  });
