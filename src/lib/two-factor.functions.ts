import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuthWithMfa } from "@/integrations/supabase/require-mfa";

// Generate a random human-friendly recovery code (10 chars, dashes for readability).
function randomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Regenerate the user's 10 recovery codes. Returns the plaintext codes exactly once.
export const generateRecoveryCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuthWithMfa])
  .handler(async ({ context }) => {
    const codes = Array.from({ length: 10 }, () => randomCode());
    const rows = await Promise.all(
      codes.map(async (c) => ({ user_id: context.userId, code_hash: await sha256Hex(c) })),
    );

    // Wipe existing unused codes first, then insert new set.
    const del = await context.supabase
      .from("two_factor_recovery_codes")
      .delete()
      .eq("user_id", context.userId)
      .is("used_at", null);
    if (del.error) throw new Error(del.error.message);

    const ins = await context.supabase.from("two_factor_recovery_codes").insert(rows);
    if (ins.error) throw new Error(ins.error.message);

    return { codes };
  });

// Consume a recovery code. Returns whether it was valid (and marks used).
export const consumeRecoveryCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuthWithMfa])
  .inputValidator((d: { code: string }) => {
    if (!d?.code || typeof d.code !== "string") throw new Error("Invalid code");
    return { code: d.code.trim().toUpperCase() };
  })
  .handler(async ({ data, context }) => {
    const hash = await sha256Hex(data.code);
    const { data: row, error } = await context.supabase
      .from("two_factor_recovery_codes")
      .select("id, used_at")
      .eq("user_id", context.userId)
      .eq("code_hash", hash)
      .is("used_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { valid: false };

    const upd = await context.supabase
      .from("two_factor_recovery_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);
    if (upd.error) throw new Error(upd.error.message);
    return { valid: true };
  });

// Flip the two_factor_enabled flag in user_settings after Supabase MFA verify succeeds client-side.
export const setTwoFactorFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuthWithMfa])
  .inputValidator((d: { enabled: boolean }) => ({ enabled: !!d?.enabled }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_settings")
      .upsert({
        user_id: context.userId,
        two_factor_enabled: data.enabled,
        two_factor_verified_at: data.enabled ? new Date().toISOString() : null,
      } as never);
    if (error) throw new Error(error.message);

    // Wipe recovery codes when 2FA is disabled
    if (!data.enabled) {
      await context.supabase.from("two_factor_recovery_codes").delete().eq("user_id", context.userId);
    }
    return { ok: true };
  });
