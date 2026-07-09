import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  started_at: z.string(),
  ended_at: z.string(),
  planned_minutes: z.number().int().min(1).max(240),
  actual_seconds: z.number().int().min(0).max(4 * 3600),
  focus_mode: z.boolean(),
  interrupted: z.boolean(),
});

export const logFocusSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("focus_sessions").insert({
      user_id: context.userId,
      started_at: data.started_at,
      ended_at: data.ended_at,
      planned_minutes: data.planned_minutes,
      actual_seconds: data.actual_seconds,
      focus_mode: data.focus_mode,
      interrupted: data.interrupted,
      phase: "focus",
    });
    if (error) throw new Error(error.message);

    let awarded = 0;
    if (!data.interrupted && data.actual_seconds >= 30) {
      awarded = Math.min(60, Math.round(data.actual_seconds / 60));
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("award_xp" as never, {
        _user_id: context.userId,
        _amount: awarded,
      } as never);
    }
    return { ok: true, xp: awarded };
  });
