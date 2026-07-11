import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side MFA enforcement.
 *
 * Composes with `requireSupabaseAuth`. If the authenticated user has 2FA
 * enabled in `user_settings` but the current session's JWT assurance level
 * is not `aal2`, the request is rejected. This prevents a valid aal1
 * (password-only) session from accessing protected server functions before
 * the TOTP challenge has actually been verified.
 */
export const requireSupabaseAuthWithMfa = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const aal = (context.claims as { aal?: string } | undefined)?.aal;

    if (aal !== "aal2") {
      const { data, error } = await context.supabase
        .from("user_settings")
        .select("two_factor_enabled")
        .eq("user_id", context.userId)
        .maybeSingle();

      if (error) {
        // Fail closed on unexpected read errors so a broken policy can't
        // silently downgrade the MFA check.
        throw new Error("Unauthorized: could not verify MFA status");
      }

      if (data?.two_factor_enabled) {
        throw new Error(
          "Unauthorized: two-factor authentication required (aal2)",
        );
      }
    }

    return next({ context });
  });
