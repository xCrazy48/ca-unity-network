import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * MFA enforcement is currently disabled project-wide.
 *
 * This alias keeps existing imports of `requireSupabaseAuthWithMfa` working
 * while behaving exactly like `requireSupabaseAuth`. If MFA is later made
 * mandatory, replace this with a middleware that composes on top of
 * `requireSupabaseAuth` and enforces `aal2` for users who have enrolled a
 * TOTP factor.
 */
export const requireSupabaseAuthWithMfa = requireSupabaseAuth;
