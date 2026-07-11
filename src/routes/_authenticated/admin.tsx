import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, TrendingUp, Activity, Globe2, Monitor, Search, ShieldCheck, ShieldOff,
  BookOpen, Target, AlertCircle, Clock, RefreshCw, Calendar,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAdminStats, listUsersWithRoles, setUserAdminRole } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · CA Unity Network" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

type Series = Array<{ day: string; count: number }>;
type Stats = {
  total_users?: number;
  signups_today?: number;
  new_signups_7d?: number;
  new_signups_30d?: number;
  dau?: number;
  wau?: number;
  mau?: number;
  google_logins_30d?: number;
  email_logins_30d?: number;
  returning_users?: number;
  timetables_total?: number;
  timetables_active?: number;
  timetables_synced?: number;
  avg_study_hours?: number;
  most_selected_attempt?: string | null;
  mocks_total?: number;
  mocks_avg_pct?: number;
  mocks_high_pct?: number;
  mocks_low_pct?: number;
  mocks_by_paper?: Array<{ paper_code: string; attempts: number; avg_pct: number }>;
  mistakes_total?: number;
  mistakes_today?: number;
  mistakes_top_paper?: string | null;
  mistakes_by_paper?: Array<{ paper_code: string; total: number }>;
  page_visits_total?: number;
  page_visits_today?: number;
  signups_series?: Series;
  active_series?: Series;
  top_pages?: Array<{ page_path: string; visits: number }>;
  top_countries?: Array<{ country: string; logins: number }>;
  top_browsers?: Array<{ browser: string; logins: number }>;
  top_devices?: Array<{ device: string; logins: number }>;
  avg_study_minutes_7d?: number;
  total_study_sessions?: number;
  question_accuracy?: number;
  last_login_at?: string | null;
  recent_signups?: Array<{ id: string; name: string; created_at: string }>;
  recent_mocks?: Array<{ id: string; paper_code: string; test_name: string; pct: number | null; created_at: string }>;
  recent_mistakes?: Array<{ id: string; paper_code: string; concept: string; created_at: string }>;
  recent_plans?: Array<{ id: string; exam_name: string; daily_hours: number; created_at: string }>;
};

const PIE_COLORS = ["hsl(var(--primary))", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#6366f1"];

function AdminPage() {
  const fetchStats = useServerFn(getAdminStats);
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await fetchStats()).stats as Stats,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading dashboard data…
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <h2 className="font-semibold">Unable to load dashboard data.</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again in a moment."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </AppShell>
    );
  }

  const stats = data;
  const lastUpdated = dataUpdatedAt ? formatDistanceToNow(dataUpdatedAt, { addSuffix: true }) : "just now";

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live metrics from Lovable Cloud. Auto-refreshes every 45s · last updated {lastUpdated}.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="mocks">Mocks</TabsTrigger>
          <TabsTrigger value="mistakes">Mistakes</TabsTrigger>
          <TabsTrigger value="website">Website</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <KpiGrid stats={stats} />
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Signups (last 14 days)" icon={<TrendingUp className="h-4 w-4" />}>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={stats.signups_series ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Active users (last 14 days)" icon={<Activity className="h-4 w-4" />}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.active_series ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi icon={<Users className="h-4 w-4" />} label="Total users" value={stats.total_users ?? 0} />
            <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Signups today" value={stats.signups_today ?? 0} />
            <Kpi label="Signups (7d)" value={stats.new_signups_7d ?? 0} />
            <Kpi label="Signups (30d)" value={stats.new_signups_30d ?? 0} />
            <Kpi icon={<Activity className="h-4 w-4" />} label="DAU" value={stats.dau ?? 0} />
            <Kpi label="WAU" value={stats.wau ?? 0} />
            <Kpi label="MAU" value={stats.mau ?? 0} />
            <Kpi label="Returning users" value={stats.returning_users ?? 0} />
            <Kpi label="Google logins (30d)" value={stats.google_logins_30d ?? 0} />
            <Kpi label="Email logins (30d)" value={stats.email_logins_30d ?? 0} />
            <Kpi icon={<Clock className="h-4 w-4" />} label="Last login" value={stats.last_login_at ? formatDistanceToNow(new Date(stats.last_login_at), { addSuffix: true }) : "—"} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Login provider mix (30d)">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Google", value: stats.google_logins_30d ?? 0 },
                      { name: "Email", value: stats.email_logins_30d ?? 0 },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label
                  >
                    {[0, 1].map((i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <TopList icon={<Globe2 className="h-4 w-4" />} title="Top countries (30d)" rows={(stats.top_countries ?? []).map((r) => ({ label: r.country, value: r.logins }))} />
          </div>
        </TabsContent>

        <TabsContent value="timetable" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi icon={<Calendar className="h-4 w-4" />} label="Timetables generated" value={stats.timetables_total ?? 0} />
            <Kpi label="Active timetables" value={stats.timetables_active ?? 0} />
            <Kpi label="Users synced to dashboard" value={stats.timetables_synced ?? 0} />
            <Kpi label="Avg study hours/day" value={stats.avg_study_hours ?? 0} />
            <Kpi label="Most selected attempt" value={stats.most_selected_attempt ?? "—"} />
            <Kpi label="Avg study min (7d)" value={stats.avg_study_minutes_7d ?? 0} />
            <Kpi label="Study sessions" value={stats.total_study_sessions ?? 0} />
            <Kpi label="Q accuracy (30d)" value={`${stats.question_accuracy ?? 0}%`} />
          </div>
        </TabsContent>

        <TabsContent value="mocks" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi icon={<Target className="h-4 w-4" />} label="Total mocks" value={stats.mocks_total ?? 0} />
            <Kpi label="Average score" value={`${stats.mocks_avg_pct ?? 0}%`} />
            <Kpi label="Highest score" value={`${stats.mocks_high_pct ?? 0}%`} />
            <Kpi label="Lowest score" value={`${stats.mocks_low_pct ?? 0}%`} />
          </div>
          <ChartCard title="Subject-wise average score">
            {(stats.mocks_by_paper ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No mock data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.mocks_by_paper}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="paper_code" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg_pct" name="Avg %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="attempts" name="Attempts" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </TabsContent>

        <TabsContent value="mistakes" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi icon={<BookOpen className="h-4 w-4" />} label="Total entries" value={stats.mistakes_total ?? 0} />
            <Kpi label="Entries today" value={stats.mistakes_today ?? 0} />
            <Kpi label="Most common paper" value={stats.mistakes_top_paper ?? "—"} />
          </div>
          <ChartCard title="Mistakes by paper">
            {(stats.mistakes_by_paper ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No mistakes logged yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={stats.mistakes_by_paper} dataKey="total" nameKey="paper_code" outerRadius={100} label>
                    {(stats.mistakes_by_paper ?? []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </TabsContent>

        <TabsContent value="website" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi label="Total page visits" value={stats.page_visits_total ?? 0} />
            <Kpi label="Visits today" value={stats.page_visits_today ?? 0} />
            <Kpi label="Daily visitors" value={stats.dau ?? 0} />
            <Kpi label="Returning users" value={stats.returning_users ?? 0} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <TopList title="Top pages (30d)" rows={(stats.top_pages ?? []).map((r) => ({ label: r.page_path, value: r.visits }))} />
            <TopList icon={<Monitor className="h-4 w-4" />} title="Top browsers (30d)" rows={(stats.top_browsers ?? []).map((r) => ({ label: r.browser, value: r.logins }))} />
            <TopList title="Top devices (30d)" rows={(stats.top_devices ?? []).map((r) => ({ label: r.device, value: r.logins }))} />
            <TopList icon={<Globe2 className="h-4 w-4" />} title="Top countries (30d)" rows={(stats.top_countries ?? []).map((r) => ({ label: r.country, value: r.logins }))} />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ActivityFeed
              title="Recent signups"
              rows={(stats.recent_signups ?? []).map((r) => ({ id: r.id, primary: r.name, secondary: null, at: r.created_at }))}
            />
            <ActivityFeed
              title="Recent timetables"
              rows={(stats.recent_plans ?? []).map((r) => ({ id: r.id, primary: r.exam_name || "Study plan", secondary: `${r.daily_hours ?? 0}h/day`, at: r.created_at }))}
            />
            <ActivityFeed
              title="Recent mock entries"
              rows={(stats.recent_mocks ?? []).map((r) => ({ id: r.id, primary: r.test_name || r.paper_code, secondary: r.pct != null ? `${r.pct}%` : null, at: r.created_at }))}
            />
            <ActivityFeed
              title="Recent mistakes"
              rows={(stats.recent_mistakes ?? []).map((r) => ({ id: r.id, primary: r.concept || "Mistake", secondary: r.paper_code, at: r.created_at }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <UserRoleManager />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function KpiGrid({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Kpi icon={<Users className="h-4 w-4" />} label="Total users" value={stats.total_users ?? 0} />
      <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Signups today" value={stats.signups_today ?? 0} />
      <Kpi icon={<Activity className="h-4 w-4" />} label="DAU / MAU" value={`${stats.dau ?? 0} / ${stats.mau ?? 0}`} />
      <Kpi icon={<Calendar className="h-4 w-4" />} label="Timetables" value={stats.timetables_total ?? 0} />
      <Kpi icon={<Target className="h-4 w-4" />} label="Mocks logged" value={stats.mocks_total ?? 0} />
      <Kpi icon={<BookOpen className="h-4 w-4" />} label="Mistakes logged" value={stats.mistakes_total ?? 0} />
      <Kpi label="Page visits (30d ~)" value={stats.page_visits_total ?? 0} />
      <Kpi label="New (7d)" value={stats.new_signups_7d ?? 0} />
    </div>
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

function ChartCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      {children}
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

function ActivityFeed({ title, rows }: { title: string; rows: Array<{ id: string; primary: string; secondary: string | null; at: string }> }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.primary}</div>
                {r.secondary && <div className="text-xs text-muted-foreground">{r.secondary}</div>}
              </div>
              <div className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(r.at), { addSuffix: true })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type ManagedUser = { id: string; full_name: string; email: string; referral_code: string; roles: string[]; created_at: string };

function UserRoleManager() {
  const listUsers = useServerFn(listUsersWithRoles);
  const setRole = useServerFn(setUserAdminRole);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const r = await listUsers({ data: { search: q, limit: 100 } });
      setUsers(r.users as ManagedUser[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [listUsers]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    load("");
  }, [load]);

  const toggle = async (u: ManagedUser) => {
    const isAdmin = u.roles.includes("admin");
    if (isAdmin && u.id === me) {
      toast.error("You cannot demote yourself.");
      return;
    }
    if (!confirm(`${isAdmin ? "Demote" : "Promote"} ${u.full_name || u.email || u.id} ${isAdmin ? "from" : "to"} admin?`)) return;
    setBusyId(u.id);
    try {
      await setRole({ data: { user_id: u.id, make_admin: !isAdmin } });
      toast.success(isAdmin ? "Admin role removed" : "Promoted to admin");
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, roles: isAdmin ? x.roles.filter((r) => r !== "admin") : [...x.roles, "admin"] } : x));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => users, [users]);

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">User roles</h2>
          <p className="text-sm text-muted-foreground">Promote or demote users. Changes take effect immediately.</p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); load(search); }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="h-9 rounded-md border border-border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button type="submit" className="h-9 rounded-md border border-border bg-background px-3 text-sm hover:bg-muted">Search</button>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="pb-2">User</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Roles</th>
              <th className="pb-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No users found.</td></tr>
            ) : filtered.map((u) => {
              const isAdmin = u.roles.includes("admin");
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-3">
                    <div className="font-medium">{u.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.referral_code}</div>
                  </td>
                  <td className="py-3 text-muted-foreground">{u.email || "—"}</td>
                  <td className="py-3">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <ShieldCheck className="h-3 w-3" /> admin
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">user</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => toggle(u)}
                      disabled={busyId === u.id || (isAdmin && u.id === me)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      {isAdmin ? <><ShieldOff className="h-3 w-3" /> Demote</> : <><ShieldCheck className="h-3 w-3" /> Promote</>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
