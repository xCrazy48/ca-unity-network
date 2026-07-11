import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, Check, Loader2, Plus, RefreshCw, Sparkles, Star, Target, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { generateStudyPlan, deleteStudyPlan, activateStudyPlan, syncPlanToTasks, updateStudyPlan } from "@/lib/study-planner.functions";
import { Link } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";

export const Route = createFileRoute("/_authenticated/study-planner")({
  head: () => ({
    meta: [
      { title: "AI Study Planner · CA Unity Network" },
      {
        name: "description",
        content:
          "Generate a personalised daily timetable and weekly + monthly goals from your exam date, prep level, and weak subjects.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudyPlannerPage,
});

type TimetableBlock = {
  start: string;
  end: string;
  subject: string;
  activity: string;
  focus_area: string | null;
};
type WeeklyGoal = { week: number; label: string; goals: string[] };
type MonthlyGoal = { month: string; goals: string[] };

const LEVELS = [
  { value: "beginner", label: "Just starting" },
  { value: "intermediate", label: "Halfway through syllabus" },
  { value: "advanced", label: "Syllabus done, need practice" },
  { value: "revision", label: "Full revision mode" },
];

function StudyPlannerPage() {
  const qc = useQueryClient();
  const generateFn = useServerFn(generateStudyPlan);
  const deleteFn = useServerFn(deleteStudyPlan);
  const activateFn = useServerFn(activateStudyPlan);

  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced" | "revision">("intermediate");
  const [dailyHours, setDailyHours] = useState("6");
  const [schedule, setSchedule] = useState("Morning study 6-10 AM, evening 6-9 PM, weekends longer");
  const [weak, setWeak] = useState("");
  const [strong, setStrong] = useState("");
  const [notes, setNotes] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data,
  });
  const { data: examConfig } = useQuery({
    queryKey: ["exam_config"],
    queryFn: async () => (await supabase.from("exam_config").select("*").maybeSingle()).data,
  });
  const { data: papers } = useQuery({
    queryKey: ["papers"],
    queryFn: async () => (await supabase.from("papers").select("*").order("sort_order")).data ?? [],
  });

  // Auto-prefill from Exam Calendar (earliest upcoming paper for this student)
  useEffect(() => {
    if (prefilled) return;
    const dates = (examConfig?.paper_dates as Record<string, string> | undefined) ?? {};
    const level = (profile as { level?: string } | null)?.level ?? "inter";
    const group = profile?.exam_group ?? "both";
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = (papers ?? [])
      .filter((p) => {
        const pl = (p as { level?: string }).level ?? "inter";
        if (pl !== level) return false;
        if (group !== "both" && p.paper_group !== group) return false;
        return !!dates[p.code] && dates[p.code] >= today;
      })
      .map((p) => ({ ...p, date: dates[p.code] }))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (upcoming.length > 0) {
      const label = level === "final" ? "CA Final" : "CA Inter";
      const first = upcoming[0];
      setExamName(`${label} — ${first.name}`);
      setExamDate(first.date);
      if (profile?.daily_study_hours) setDailyHours(String(profile.daily_study_hours));
      setPrefilled(true);
    }
  }, [examConfig, papers, profile, prefilled]);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["study-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_plans")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const active = useMemo(() => plans?.find((p) => p.is_active) ?? plans?.[0], [plans]);

  const generate = useMutation({
    mutationFn: async () => {
      if (!examName.trim()) throw new Error("Exam name required");
      if (!examDate) throw new Error("Exam date required");
      const hrs = Number(dailyHours);
      if (!hrs || hrs < 0.5) throw new Error("Enter a valid daily hours");
      return generateFn({
        data: {
          exam_name: examName.trim(),
          exam_date: examDate,
          preparation_level: level,
          daily_hours: hrs,
          schedule_preference: schedule.trim() || null,
          weak_subjects: weak.split(",").map((s) => s.trim()).filter(Boolean),
          strong_subjects: strong.split(",").map((s) => s.trim()).filter(Boolean),
          notes: notes.trim() || null,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-plans"] });
      toast.success("Study plan generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-plans"] });
      toast.success("Deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activate = useMutation({
    mutationFn: (id: string) => activateFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-plans"] });
      toast.success("Plan activated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="AI Study Planner"
        title="Your exam. Your hours. A plan that fits."
        description="Tell the AI your exam date, prep level, daily study hours, schedule, and weak subjects. Get a daily timetable plus weekly & monthly goals — saved to your account."
      />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-gold" /> Build my plan
            </CardTitle>
            <CardDescription>Fill these in — takes ~30 seconds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Exam & date auto-fill from your{" "}
              <Link to="/calendar" className="text-gold hover:underline">Exam Calendar</Link>.
              Edit there once and it syncs everywhere.
            </div>
            <div>
              <Label>Exam</Label>
              <Input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="CA Inter — Paper 1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Exam date</Label>
                <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              </div>
              <div>
                <Label>Daily hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="16"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Preparation level</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Schedule preference</Label>
              <Textarea
                rows={2}
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="Morning person? Coaching hours? Job? Weekends free?"
              />
            </div>
            <div>
              <Label>Weak subjects <span className="text-muted-foreground">(comma-separated)</span></Label>
              <Input value={weak} onChange={(e) => setWeak(e.target.value)} placeholder="FR, Costing" />
            </div>
            <div>
              <Label>Strong subjects</Label>
              <Input value={strong} onChange={(e) => setStrong(e.target.value)} placeholder="Audit, Tax" />
            </div>
            <div>
              <Label>Anything else</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Injuries, exam attempts, target percentile…" />
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
            >
              {generate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Building your plan…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate plan
                </>
              )}
            </Button>
            {generate.isPending && (
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-muted-foreground">
                Reading ICAI syllabus, weightage, and your exam calendar. This usually takes 15–30 seconds.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {isLoading ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">Loading…</CardContent></Card>
          ) : !active ? (
            <EmptyState
              title="No study plan yet"
              body="Fill the form and generate your first AI-powered plan."
            />
          ) : (
            <PlanView plan={active} />
          )}

          {plans && plans.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Previous plans</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {plans.filter((p) => p.id !== active?.id).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.exam_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(p.exam_date), "MMM d, yyyy")} · {p.daily_hours}h/day · created {format(parseISO(p.created_at), "MMM d")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => activate.mutate(p.id)}>
                        Activate
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function PlanView({ plan }: { plan: {
  id: string;
  exam_name: string;
  exam_date: string;
  daily_hours: number;
  preparation_level: string;
  strategy: string | null;
  daily_timetable: unknown;
  weekly_goals: unknown;
  monthly_goals: unknown;
} }) {
  const timetable = (plan.daily_timetable as TimetableBlock[]) ?? [];
  const weekly = (plan.weekly_goals as WeeklyGoal[]) ?? [];
  const monthly = (plan.monthly_goals as MonthlyGoal[]) ?? [];
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(plan.exam_date).getTime() - Date.now()) / 86400000),
  );
  const syncFn = useServerFn(syncPlanToTasks);
  const qc = useQueryClient();
  const sync = useMutation({
    mutationFn: (days: number) => syncFn({ data: { plan_id: plan.id, days } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(`Added ${res.inserted} tasks across ${res.days} days`, {
        action: { label: "Open Planner", onClick: () => { window.location.href = "/planner"; } },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
              <Star className="h-3.5 w-3.5" /> Active plan
            </div>
            <CardTitle className="mt-1">{plan.exam_name}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(parseISO(plan.exam_date), "EEE, MMM d, yyyy")} · {daysLeft} days left</span>
              <span>·</span>
              <span>{plan.daily_hours}h/day</span>
              <span>·</span>
              <span className="capitalize">{plan.preparation_level}</span>
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => sync.mutate(1)} disabled={sync.isPending} className="gap-1.5">
              <ListChecks className="h-4 w-4" /> Sync today
            </Button>
            <Button size="sm" onClick={() => sync.mutate(7)} disabled={sync.isPending} className="gap-1.5">
              <ListChecks className="h-4 w-4" /> Sync 7 days → Planner
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/planner">Open Planner</Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {plan.strategy && (
          <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Strategy</div>
            <p className="text-sm leading-relaxed">{plan.strategy}</p>
          </div>
        )}


        <Tabs defaultValue="daily">
          <TabsList>
            <TabsTrigger value="daily">Daily timetable</TabsTrigger>
            <TabsTrigger value="weekly">Weekly goals</TabsTrigger>
            <TabsTrigger value="monthly">Monthly goals</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4">
            {timetable.length === 0 ? (
              <p className="text-sm text-muted-foreground">No blocks generated.</p>
            ) : (
              <ul className="space-y-2">
                {timetable.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                    <div className="w-24 shrink-0 font-mono text-sm text-gold">
                      {b.start}–{b.end}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{b.subject}</div>
                      <div className="text-sm text-muted-foreground">{b.activity}</div>
                      {b.focus_area && (
                        <Badge variant="outline" className="mt-1 text-xs">{b.focus_area}</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="mt-4 space-y-3">
            {weekly.length === 0 ? (
              <p className="text-sm text-muted-foreground">No weekly goals generated.</p>
            ) : (
              weekly.map((w) => (
                <div key={w.week} className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge>Week {w.week}</Badge>
                    <div className="font-medium">{w.label}</div>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {w.goals.map((g, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="monthly" className="mt-4 space-y-3">
            {monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground">No monthly goals generated.</p>
            ) : (
              monthly.map((m, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <div className="mb-2 font-display text-lg font-semibold">{m.month}</div>
                  <ul className="space-y-1 text-sm">
                    {m.goals.map((g, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
