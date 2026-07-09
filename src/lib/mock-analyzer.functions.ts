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

const AnalysisSchema = z.object({
  test_name: z.string().nullable(),
  paper_code: z.string().nullable(),
  overall_score: z.number().nullable(),
  max_score: z.number().nullable(),
  accuracy: z.number().nullable(),
  attempted: z.number().int().nullable(),
  correct: z.number().int().nullable(),
  incorrect: z.number().int().nullable(),
  unattempted: z.number().int().nullable(),
  time_taken_minutes: z.number().int().nullable(),
  subject_scores: z.array(z.object({ name: z.string(), score: z.number(), max: z.number() })),
  section_scores: z.array(z.object({ name: z.string(), score: z.number(), max: z.number() })),
  chapter_performance: z.array(z.object({ chapter: z.string(), accuracy: z.number().nullable(), notes: z.string().nullable() })),
  strong_areas: z.array(z.string()),
  weak_areas: z.array(z.string()),
  improvement_suggestions: z.array(z.string()),
  readiness_score: z.number().nullable(),
});

async function awardXpInline(userId: string, amount: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("award_xp", { _user_id: userId, _amount: amount });
}

async function insertNotification(userId: string, title: string, body: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("notifications").insert({ user_id: userId, title, body, category: "achievement" });
}

const AnalyzeUploadInput = z.object({
  file_path: z.string().min(1),
  file_mime: z.string().min(1),
  test_name: z.string().optional().nullable(),
  paper_code: z.string().optional().nullable(),
});

export const analyzeMockFromUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => AnalyzeUploadInput.parse(v))
  .handler(async ({ context, data }) => {
    // Download the uploaded file (user-scoped supabase client honors RLS)
    const dl = await context.supabase.storage.from("mock-uploads").download(data.file_path);
    if (dl.error || !dl.data) throw new Error(dl.error?.message ?? "Could not read file");
    const buf = new Uint8Array(await dl.data.arrayBuffer());
    // btoa on binary strings — safe for reasonably sized files (< 20MB)
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    const dataUrl = `data:${data.file_mime};base64,${b64}`;

    const isPdf = data.file_mime === "application/pdf";
    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          "You are an expert exam-analytics engine. Parse this mock test result (scorecard / PDF / screenshot) and extract every metric you can find. Never invent numbers — leave a field null if not present. Chapter and subject names must come from the document. Give 3-6 concise improvement suggestions.",
      },
    ];
    if (isPdf) {
      content.push({ type: "file", file: { filename: "mock.pdf", file_data: dataUrl } });
    } else {
      content.push({ type: "image_url", image_url: { url: dataUrl } });
    }

    let parsed: z.infer<typeof AnalysisSchema>;
    try {
      const res = await generateObject({
        model: gateway(),
        schema: AnalysisSchema,
        messages: [{ role: "user", content: content as never }],
      });
      parsed = res.object;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        throw new Error("Could not parse this result. Try a clearer image or use manual entry.");
      }
      throw err;
    }

    const acc =
      parsed.accuracy ??
      (parsed.attempted && parsed.correct ? (parsed.correct / parsed.attempted) * 100 : null);

    const readiness =
      parsed.readiness_score ??
      (parsed.overall_score != null && parsed.max_score
        ? Math.round((parsed.overall_score / parsed.max_score) * 100)
        : null);

    const { data: row, error } = await context.supabase
      .from("mock_analyses")
      .insert({
        user_id: context.userId,
        source: "upload",
        file_path: data.file_path,
        file_mime: data.file_mime,
        test_name: data.test_name || parsed.test_name,
        paper_code: data.paper_code || parsed.paper_code,
        overall_score: parsed.overall_score,
        max_score: parsed.max_score,
        accuracy: acc,
        attempted: parsed.attempted,
        correct: parsed.correct,
        incorrect: parsed.incorrect,
        unattempted: parsed.unattempted,
        time_taken_minutes: parsed.time_taken_minutes,
        subject_scores: parsed.subject_scores,
        section_scores: parsed.section_scores,
        chapter_performance: parsed.chapter_performance,
        strong_areas: parsed.strong_areas,
        weak_areas: parsed.weak_areas,
        improvement_suggestions: parsed.improvement_suggestions,
        readiness_score: readiness,
        raw_ai_response: parsed as unknown as Record<string, unknown>,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await awardXpInline(context.userId, 40);
    await insertNotification(
      context.userId,
      "Mock analysed — +40 XP",
      `${row.test_name ?? "Your mock"} · readiness ${readiness ?? "—"}%`,
    );
    return { id: row.id, analysis: row };
  });

const ManualInput = z.object({
  test_name: z.string().min(1),
  paper_code: z.string().optional().nullable(),
  overall_score: z.number(),
  max_score: z.number().min(1),
  attempted: z.number().int().nullable().optional(),
  correct: z.number().int().nullable().optional(),
  incorrect: z.number().int().nullable().optional(),
  unattempted: z.number().int().nullable().optional(),
  time_taken_minutes: z.number().int().nullable().optional(),
  subject_scores: z.array(z.object({ name: z.string(), score: z.number(), max: z.number() })).optional(),
  weak_areas_text: z.string().optional(),
});

export const saveManualMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ManualInput.parse(v))
  .handler(async ({ context, data }) => {
    const acc =
      data.attempted && data.correct != null ? (data.correct / data.attempted) * 100 : null;
    const readiness = Math.round((data.overall_score / data.max_score) * 100);
    const weakList = data.weak_areas_text
      ? data.weak_areas_text.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const { data: row, error } = await context.supabase
      .from("mock_analyses")
      .insert({
        user_id: context.userId,
        source: "manual",
        test_name: data.test_name,
        paper_code: data.paper_code ?? null,
        overall_score: data.overall_score,
        max_score: data.max_score,
        accuracy: acc,
        attempted: data.attempted ?? null,
        correct: data.correct ?? null,
        incorrect: data.incorrect ?? null,
        unattempted: data.unattempted ?? null,
        time_taken_minutes: data.time_taken_minutes ?? null,
        subject_scores: data.subject_scores ?? [],
        section_scores: [],
        chapter_performance: [],
        strong_areas: [],
        weak_areas: weakList,
        improvement_suggestions: [],
        readiness_score: readiness,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await awardXpInline(context.userId, 25);
    return { id: row.id, analysis: row };
  });

export const deleteMockAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { data: row } = await context.supabase
      .from("mock_analyses")
      .select("file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.file_path) {
      await context.supabase.storage.from("mock-uploads").remove([row.file_path]);
    }
    const { error } = await context.supabase.from("mock_analyses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
