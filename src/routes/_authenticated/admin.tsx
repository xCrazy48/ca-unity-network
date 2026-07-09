import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, TrendingUp, Activity, Globe2, Monitor } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { getAdminStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · CA Unity Network" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

type Stats = {
  total_users?: number;
  new_signups_7d?: number;
  new_signups_30d?: number;
  dau?: number;
  mau?: number;
  google_logins_30d?: number;
  email_logins_30d?: number;
  avg_study_minutes_7d?: number;
  total_study_sessions?: number;
  question_accuracy?: number;
  top_pages?: Array<{ page_path: string; visits: number }>;
  top_countries?: Array<{ country: string; logins: number }>;
  top_browsers?: Array<{ browser: string; logins: number }>;
  top_devices?: Array<{ device: string; logins: number }>;
};

function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchStats = useServerFn(getAdminStats);

  useEffect(() => {
    fetchStats()
      .then((r) => setStats(r.stats as Stats))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [fetchStats]);

  if (loading) return <AppShell><div className="text-muted-foreground">Loading stats…</div></AppShell>;
  if (!stats) return <AppShell><div className="text-muted-foreground">Unable to load admin stats.</div></AppShell>;

  return (
    <AppShell>
      <h1 className="font-display text-4xl font-semibold">Admin dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Aggregated platform metrics. Refreshed on load.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={<Users className="h-4 w-4" />} label="Total users" value={stats.total_users ?? 0} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Signups (7d)" value={stats.new_signups_7d ?? 0} />
        <Kpi icon={<Activity className="h-4 w-4" />} label="DAU" value={stats.dau ?? 0} />
        <Kpi icon={<Activity className="h-4 w-4" />} label="MAU" value={stats.mau ?? 0} />
        <Kpi label="Signups (30d)" value={stats.new_signups_30d ?? 0} />
        <Kpi label="Google logins (30d)" value={stats.google_logins_30d ?? 0} />
        <Kpi label="Email logins (30d)" value={stats.email_logins_30d ?? 0} />
        <Kpi label="Study sessions" value={stats.total_study_sessions ?? 0} />
        <Kpi label="Avg study min (7d)" value={stats.avg_study_minutes_7d ?? 0} />
        <Kpi label="Q accuracy (30d)" value={`${stats.question_accuracy ?? 0}%`} />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <TopList icon={<Globe2 className="h-4 w-4" />} title="Top countries (30d)" rows={(stats.top_countries ?? []).map((r) => ({ label: r.country, value: r.logins }))} />
        <TopList icon={<Monitor className="h-4 w-4" />} title="Top browsers (30d)" rows={(stats.top_browsers ?? []).map((r) => ({ label: r.browser, value: r.logins }))} />
        <TopList title="Top devices (30d)" rows={(stats.top_devices ?? []).map((r) => ({ label: r.device, value: r.logins }))} />
        <TopList title="Top pages (30d)" rows={(stats.top_pages ?? []).map((r) => ({ label: r.page_path, value: r.visits }))} />
      </div>
    </AppShell>
  );
}

function Kpi({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
    </div>
  );
}

function TopList({ icon, title, rows }: { icon?: React.ReactNode; title: string; rows: Array<{ label: string; value: number }> }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className="truncate">{r.label}</span>
              <span className="font-mono text-muted-foreground">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
