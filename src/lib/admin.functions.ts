import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuthWithMfa } from "@/integrations/supabase/require-mfa";

async function requireAdmin(supabase: unknown, userId: string) {
  const sb = supabase as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
  // has_role now lives in private schema; we call it via a public wrapper for admins.
  // Since private.has_role isn't exposed to authenticated, load service role.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
  return true;
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuthWithMfa])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    // Call via the user's authenticated client so auth.uid() is populated
    // inside public.get_admin_stats (which re-checks admin role).
    const { data, error } = await (context.supabase as unknown as {
      rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc("get_admin_stats");
    if (error) throw new Error(error.message);
    return { stats: (data ?? {}) as Record<string, string | number | boolean | null | Array<Record<string, string | number>>> };
  });


export const logAdminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuthWithMfa])
  .inputValidator((d: { action: string; target_type?: string; target_id?: string; metadata?: Record<string, unknown> }) => {
    if (!d?.action) throw new Error("Missing action");
    return d;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("admin_logs").insert({
      actor_id: context.userId,
      action: data.action,
      target_type: data.target_type ?? null,
      target_id: data.target_id ?? null,
      metadata: (data.metadata ?? {}) as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listUsersWithRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuthWithMfa])
  .inputValidator((d: { search?: string; limit?: number }) => ({ search: (d?.search ?? "").trim(), limit: Math.min(d?.limit ?? 50, 200) }))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("profiles").select("id, full_name, referral_code, created_at").order("created_at", { ascending: false }).limit(data.limit);
    if (data.search) q = q.ilike("full_name", `%${data.search}%`);
    const { data: profiles, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return { users: [] };
    const { data: roles, error: rErr } = await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids);
    if (rErr) throw new Error(rErr.message);
    const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const emailMap = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role as string);
      roleMap.set(r.user_id, arr);
    }
    return {
      users: (profiles ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name ?? "",
        email: emailMap.get(p.id) ?? "",
        referral_code: p.referral_code ?? "",
        roles: roleMap.get(p.id) ?? [],
        created_at: p.created_at,
      })),
    };
  });

export const setUserAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuthWithMfa])
  .inputValidator((d: { user_id: string; make_admin: boolean }) => {
    if (!d?.user_id) throw new Error("Missing user_id");
    return { user_id: d.user_id, make_admin: !!d.make_admin };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId && !data.make_admin) {
      throw new Error("You cannot demote yourself.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.make_admin) {
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: "admin" as never });
      if (error && !`${error.message}`.toLowerCase().includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    await supabaseAdmin.from("admin_logs").insert({
      actor_id: context.userId,
      action: data.make_admin ? "promote_admin" : "demote_admin",
      target_type: "user",
      target_id: data.user_id,
      metadata: {} as never,
    });
    return { ok: true };
  });
