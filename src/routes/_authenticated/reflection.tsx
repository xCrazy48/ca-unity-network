import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Flame, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reflection")({
  head: () => ({
    meta: [
      { title: "Weekly Reflection · CA Unity Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReflectionPage,
});

const NOTE_KEY = "cun_weekly_reflection_note";

function ReflectionPage() {
  const weekStart = useMemo(() => subDays(new Date(), 6), []);
  const weekStartISO = weekStart.toISOString().slice(0, 10);

  const { data: mocks } = useQuery({
    queryKey: ["reflection_mocks"],
    queryFn: async () =>
      (await supabase.from("mock_tests").select("*").gte("test_date", weekStartISO)).data ?? [],
  });
  const { data: tasks } = useQuery({
    queryKey: ["reflection_tasks"],
    queryFn: async () =>
      (await supabase.from("tasks").select("*").gte("scheduled_date", weekStartISO)).data ?? [],
  });
  const { data: mistakes } = useQuery({
    queryKey: ["reflection_mistakes"],
    queryFn: async () =>
      (await supabase.from("mistakes").select("*").gte("created_at", weekStart.toISOString())).data ?? [],
  });
  const { data: progress } = useQuery({
    queryKey: ["reflection_progress"],
    queryFn: async () => (await supabase.from("chapter_progress").select("*")).data ?? [],
  });

  const [note, setNote] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(NOTE_KEY) ?? "";
  });

  const stats = useMemo(() => {
    const mockAvg =
      mocks && mocks.length > 0
        ? Math.round(
            mocks.reduce((s: number, m: any) => s + (Number(m.score) / Number(m.max_score)) * 100, 0) /
              mocks.length,
          )
        : 0;
    const doneTasks = (tasks ?? []).filter((t: any) => t.status === "done" || t.completed_at).length;
    const totalTasks = tasks?.length ?? 0;
    const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const openMistakes = (mistakes ?? []).filter((m: any) => m.status !== "resolved").length;
    const masteredChapters = (progress ?? []).filter(
      (p: any) => p.status === "mastered" || p.status === "revised",
    ).length;
    return { mockAvg, doneTasks, totalTasks, completion, openMistakes, masteredChapters, mockCount: mocks?.length ?? 0 };
  }, [mocks, tasks, mistakes, progress]);

  const verdict = useMemo(() => {
    const { mockAvg, completion, mockCount } = stats;
    // Score
    const score = mockAvg * 0.5 + completion * 0.5;
    if (mockCount === 0 && stats.totalTasks === 0) {
      return {
        tone: "neutral" as const,
        title: "Nothing to reflect on yet",
        body: "Log a mock or complete a task this week — I need signal before I can push you.",
      };
    }
    if (score >= 75) {
      return {
        tone: "great" as const,
        title: "You crushed it this week.",
        body: `Mock average ${mockAvg}% · task completion ${completion}%. This is exam-ready momentum — protect it. Don't get comfortable: raise the bar next week by attempting one MTP under strict timing.`,
      };
    }
    if (score >= 55) {
      return {
        tone: "ok" as const,
        title: "Solid — but you can do harder.",
        body: `Mock average ${mockAvg}% · task completion ${completion}%. You're in the game. Two things next week: close ${stats.openMistakes} open mistake${stats.openMistakes === 1 ? "" : "s"}, and add one extra focused hour on your weakest paper.`,
      };
    }
    return {
      tone: "push" as const,
      title: "This week fell short. Own it.",
      body: `Mock average ${mockAvg}% · task completion ${completion}%. No sugar-coating — the exam won't be lenient either. Reset tonight: pick your weakest paper, schedule 3 focused Pomodoros tomorrow, and log one honest mistake-book entry. Small wins, starting now.`,
    };
  }, [stats]);

  function saveNote() {
    localStorage.setItem(NOTE_KEY, note);
    toast.success("Reflection saved");
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Weekly reflection"
        title="How did this week actually go?"
        description={`Data pulled from ${format(weekStart, "MMM d")} — ${format(new Date(), "MMM d")}. Be honest below.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox label="Mock avg" value={`${stats.mockAvg}%`} hint={`${stats.mockCount} test${stats.mockCount === 1 ? "" : "s"}`} />
        <StatBox label="Task completion" value={`${stats.completion}%`} hint={`${stats.doneTasks}/${stats.totalTasks} done`} />
        <StatBox label="Open mistakes" value={String(stats.openMistakes)} hint="logged this week" />
        <StatBox label="Chapters mastered" value={String(stats.masteredChapters)} hint="all-time" />
      </div>

      <section
        className={`mt-8 rounded-2xl border p-6 shadow-elegant ${
          verdict.tone === "great"
            ? "border-gold/50 bg-hero shadow-glow"
            : verdict.tone === "push"
              ? "border-destructive/50 bg-destructive/5"
              : "border-border bg-card"
        }`}
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
          {verdict.tone === "great" ? (
            <Flame className="h-3.5 w-3.5" />
          ) : verdict.tone === "push" ? (
            <TrendingDown className="h-3.5 w-3.5" />
          ) : (
            <TrendingUp className="h-3.5 w-3.5" />
          )}
          Verdict
        </div>
        <h2 className="mt-3 font-display text-2xl font-semibold">{verdict.title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{verdict.body}</p>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
          <Sparkles className="h-3.5 w-3.5" /> Your notes
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          What worked? What slipped? One habit to fix next week.
        </p>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-4 min-h-40"
          placeholder="Wins…&#10;Slips…&#10;One habit to fix…"
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={saveNote} className="bg-gold text-primary-foreground hover:opacity-90">
            Save reflection
          </Button>
        </div>
      </section>
    </AppShell>
  );
}

function StatBox({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
