import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuthWithMfa } from "@/integrations/supabase/require-mfa";

function ipFromRequest(): string | null {
  const req = getRequest();
  if (!req) return null;
  const h = req.headers;
  const fwd = h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for");
  if (!fwd) return null;
  const first = fwd.split(",")[0].trim();
  return first || null;
}

function countryFromRequest(): string | null {
  const req = getRequest();
  return req?.headers.get("cf-ipcountry") ?? null;
}

// Record a login/session event. IP + country from Cloudflare edge headers.
export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuthWithMfa])
  .inputValidator((d: {
    event_type: "login" | "logout" | "failed_login" | "session_start" | "session_end";
    provider?: string;
    device?: string;
    browser?: string;
    os?: string;
    user_agent?: string;
    session_duration_seconds?: number;
  }) =>
    z.object({
      event_type: z.enum(["login", "logout", "failed_login", "session_start", "session_end"]),
      provider: z.string().max(32).optional(),
      device: z.string().max(64).optional(),
      browser: z.string().max(64).optional(),
      os: z.string().max(64).optional(),
      user_agent: z.string().max(1024).optional(),
      session_duration_seconds: z.number().int().min(0).max(86400 * 30).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ip = ipFromRequest();
    const country = countryFromRequest();

    const { error } = await context.supabase.from("login_history").insert({
      user_id: context.userId,
      event_type: data.event_type,
      provider: data.provider ?? null,
      device: data.device ?? null,
      browser: data.browser ?? null,
      os: data.os ?? null,
      user_agent: data.user_agent ?? null,
      ip_address: ip,
      country,
      session_duration_seconds: data.session_duration_seconds ?? null,
    });
    if (error) throw new Error(error.message);

    // Update last_login_at on successful login
    if (data.event_type === "login") {
      await context.supabase
        .from("profiles")
        .update({ last_login_at: new Date().toISOString(), last_active_at: new Date().toISOString() })
        .eq("id", context.userId);
    }
    return { ok: true };
  });

// Record generic activity (page visits, feature usage)
export const recordActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuthWithMfa])
  .inputValidator((d: {
    activity_type: string;
    page_path?: string;
    duration_seconds?: number;
    metadata?: Record<string, unknown>;
  }) =>
    z.object({
      activity_type: z.string().min(1).max(64),
      page_path: z.string().max(256).optional(),
      duration_seconds: z.number().int().min(0).max(86400).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_activity").insert({
      user_id: context.userId,
      activity_type: data.activity_type,
      page_path: data.page_path ?? null,
      duration_seconds: data.duration_seconds ?? null,
      metadata: (data.metadata ?? {}) as never,
    });
    if (error) throw new Error(error.message);

    await context.supabase
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", context.userId);

    return { ok: true };
  });

// Logout from all devices — revokes all refresh tokens via Supabase Admin API.
export const logoutAllDevices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuthWithMfa])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.signOut(context.userId, "global");
    if (error) throw new Error(error.message);

    await context.supabase.from("login_history").insert({
      user_id: context.userId,
      event_type: "logout",
      provider: "all_devices",
    });
    return { ok: true };
  });
