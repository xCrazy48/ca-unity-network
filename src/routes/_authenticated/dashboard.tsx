import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";
import {
  ArrowRight,
  BookMarked,
  Brain,
  CalendarClock,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { QuoteDialog } from "@/components/quote-dialog";
import { MentoringCard } from "@/components/mentoring-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · CA Unity Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      return data;
    },
  });

  const { data: examConfig } = useQuery({
    queryKey: ["exam_config"],
    queryFn: async () => {
      const { data } = await supabase.from("exam_config").select("*").maybeSingle();
      return data;
    },
  });

  const { data: papers } = useQuery({
    queryKey: ["papers"],
    queryFn: async () => (await supabase.from("papers").select("*").order("sort_order")).data ?? [],
  });

  const { data: progress } = useQuery({
    queryKey: ["chapter_progress"],
    queryFn: async () => (await supabase.from("chapter_progress").select("*")).data ?? [],
  });

  const { data: chapters } = useQuery({
    queryKey: ["chapters"],
    queryFn: async () => (await supabase.from("chapters").select("*")).data ?? [],
  });

  const { data: mocks } = useQuery({
    queryKey: ["mock_tests"],
    queryFn: async () =>
      (await supabase.from("mock_tests").select("*").order("test_date", { ascending: false })).data ?? [],
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks", "today"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      return (
        (await supabase.from("tasks").select("*").eq("scheduled_date", today).order("sort_order")).data ?? []
      );
    },
  });

  // Compute readiness
  const totalChapters = chapters?.length ?? 0;
  const avgConfidence =
    progress && progress.length > 0
      ? Math.round(progress.reduce((s, p) => s + (p.confidence ?? 0), 0) / progress.length)
      : 0;
  const mocksScore =
    mocks && mocks.length > 0
      ? Math.round(mocks.reduce((s, m) => s + (Number(m.score) / Number(m.max_score)) * 100, 0) / mocks.length)
      : 0;
  const readiness = Math.round(avgConfidence * 0.6 + mocksScore * 0.4);

  // Next paper countdown
  const paperDates = (examConfig?.paper_dates as Record<string, string> | undefined) ?? {};
  const upcoming = papers
    ?.map((p) => ({ ...p, date: paperDates[p.code] }))
    .filter((p) => p.date)
    .map((p) => ({ ...p, days: differenceInCalendarDays(new Date(p.date!), new Date()) }))
    .filter((p) => p.days >= 0)
    .sort((a, b) => a.days - b.days) ?? [];
  const nextPaper = upcoming[0];

  const donePct =
    progress && totalChapters > 0
      ? Math.round((progress.filter((p) => p.status === "mastered" || p.status === "revised").length / totalChapters) * 100)
      : 0;

  const needsOnboarding = profile && !profile.onboarded;

  return (
    <AppShell>
      <QuoteDialog />
      {needsOnboarding && (
        <Link
          to="/onboarding"
          className="mb-6 flex items-center justify-between rounded-2xl border border-gold/40 bg-hero px-5 py-4 shadow-glow"
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-gold">Finish setup</div>
            <div className="mt-1 font-display text-lg font-semibold">
              Tell CA Unity Network about your attempt in 3 minutes.
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gold" />
        </Link>
      )}

      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMM d")}
          </p>
          <h1 className="font-display text-4xl font-semibold">
            {greeting()}
            {profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
          </h1>
        </div>
        <Link
          to="/ai"
          className="hidden items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-primary-foreground md:inline-flex"
        >
          <Brain className="h-4 w-4" /> Ask AI Engine
        </Link>
      </div>

      {/* Stat grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Readiness"
          value={`${readiness}%`}
          hint={mocks && mocks.length ? `from ${mocks.length} mocks` : "add mocks to refine"}
          gold
        />
        <StatCard
          icon={CalendarClock}
          label={nextPaper ? `Days to ${nextPaper.name.split(" ")[0]}` : "Days to Paper 1"}
          value={nextPaper ? String(nextPaper.days) : "—"}
          hint={nextPaper ? format(new Date(nextPaper.date!), "MMM d, yyyy") : "set exam dates"}
        />
        <StatCard icon={Flame} label="Streak" value="0d" hint="log a task to start" />
        <StatCard
          icon={Target}
          label="Syllabus covered"
          value={`${donePct}%`}
          hint={`${progress?.length ?? 0} / ${totalChapters} chapters`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Today's priorities */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Today's priorities</h2>
            <Link to="/planner" className="text-sm text-gold hover:underline">
              Open planner
            </Link>
          </div>
          {tasks && tasks.length > 0 ? (
            <ul className="mt-5 space-y-2">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">{t.title}</div>
                    {t.description && (
                      <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {t.description}
                      </div>
                    )}
                  </div>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
                    {t.priority}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              body="No tasks scheduled for today. The AI Engine will generate a plan once your setup is complete."
              cta={{ to: "/planner", label: "Add a task" }}
            />
          )}
        </section>

        {/* AI Brief */}
        <section className="rounded-2xl border border-gold/40 bg-hero p-6 shadow-glow">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
            <Sparkles className="h-3.5 w-3.5" /> Daily AI Brief
          </div>
          <p className="mt-4 font-display text-lg leading-snug">
            {readiness === 0
              ? "Complete your profile and log a mock or two — I'll write a full briefing every morning."
              : `You're at ${readiness}% readiness. Focus today on your weakest paper and clear one mistake-book entry.`}
          </p>
          <Link
            to="/ai"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:underline"
          >
            Open AI Engine <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>

      {/* Upcoming papers */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Upcoming papers</h2>
          <Link to="/calendar" className="text-sm text-gold hover:underline">
            Edit calendar
          </Link>
        </div>
        {upcoming.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, 6).map((p) => (
              <div key={p.code} className="rounded-lg border border-border bg-background p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {p.paper_group.replace("_", " ")}
                </div>
                <div className="mt-1 font-display text-base font-semibold">{p.name}</div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-display text-3xl font-semibold text-gold">
                    {p.days}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(p.date!), "MMM d")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            body="Set your exam dates to get a live countdown and paper-wise revision plans."
            cta={{ to: "/calendar", label: "Set exam dates" }}
          />
        )}
      </section>

      {/* Quick actions */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <QuickAction icon={BookMarked} title="Log a mistake" body="Turn today's error into a scheduled revision." to="/mistakes" />
        <QuickAction icon={Target} title="Update chapter progress" body="Keep the readiness score honest." to="/chapters" />
        <QuickAction icon={Brain} title="Generate revision plan" body="7-day, 3-day, or 1-day AI plan per paper." to="/ai" />
      </section>

      <div className="mt-8">
        <MentoringCard />
      </div>
    </AppShell>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  gold,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  hint: string;
  gold?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        <Icon className={`h-4 w-4 ${gold ? "text-gold" : ""}`} />
      </div>
      <div className={`mt-3 font-display text-4xl font-semibold ${gold ? "text-gold" : ""}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function EmptyState({ body, cta }: { body: string; cta?: { to: string; label: string } }) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-border/70 bg-background/40 p-8 text-center">
      <p className="text-sm text-muted-foreground">{body}</p>
      {cta && (
        <Link
          to={cta.to}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:underline"
        >
          {cta.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  body,
  to,
}: {
  icon: typeof TrendingUp;
  title: string;
  body: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border bg-card p-5 transition hover:border-gold/40 hover:shadow-elegant"
    >
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-gold">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-4 font-display text-base font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </Link>
  );
}
