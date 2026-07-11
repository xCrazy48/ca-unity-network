import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO, startOfWeek, addDays } from "date-fns";
import {
  CalendarDays,
  Check,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  Wand2,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Zap,
  Scale,
  Leaf,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  generateStudyPlan,
  syncPlanToTasks,
  regenerateRemaining,
} from "@/lib/study-planner.functions";
import { useUserPapers } from "@/hooks/use-user-papers";

export const Route = createFileRoute("/_authenticated/study-planner")({
  head: () => ({
    meta: [
      { title: "AI Timetable · CA Unity Network" },
      {
        name: "description",
        content:
          "A premium AI study planner for CA aspirants. Set your goals in under 2 minutes; the AI builds a smart timetable, syncs it to your planner, and adapts as you go.",
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
type PlanDayType = "study" | "revision" | "holiday" | "buffer";
type PlanDay = {
  date: string;
  type: PlanDayType;
  wake: string | null;
  sleep: string | null;
  note: string | null;
  blocks: TimetableBlock[];
};

type Slot = "early_morning" | "morning" | "afternoon" | "evening" | "night";
type Style = "aggressive" | "balanced" | "relaxed" | "ranker";

const SLOTS: { value: Slot; label: string }[] = [
  { value: "early_morning", label: "Early Morning · 5–8 AM" },
  { value: "morning", label: "Morning · 8 AM–12 PM" },
  { value: "afternoon", label: "Afternoon · 12–4 PM" },
  { value: "evening", label: "Evening · 4–8 PM" },
  { value: "night", label: "Night · 8 PM onward" },
];

const STYLES: {
  value: Style;
  title: string;
  icon: typeof Zap;
  points: string[];
  badge?: string;
}[] = [
  {
    value: "aggressive",
    title: "Aggressive",
    icon: Zap,
    points: ["Max syllabus speed", "Smaller buffers", "Longer sessions"],
  },
  {
    value: "balanced",
    title: "Balanced",
    icon: Scale,
    badge: "Recommended",
    points: ["Learn · revise · practice", "Moderate load", "Best for most"],
  },
  {
    value: "relaxed",
    title: "Relaxed",
    icon: Leaf,
    points: ["Lighter days", "More buffers", "Low burnout"],
  },
  {
    value: "ranker",
    title: "Ranker",
    icon: Trophy,
    points: ["Spaced repetition", "Extra mocks", "High-weightage focus"],
  },
];

const LEVELS = [
  { value: "beginner", label: "Just starting" },
  { value: "intermediate", label: "Halfway through" },
  { value: "advanced", label: "Syllabus done" },
  { value: "revision", label: "Full revision mode" },
];

function StudyPlannerPage() {
  const qc = useQueryClient();
  const generateFn = useServerFn(generateStudyPlan);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data,
  });
  const { data: examConfig } = useQuery({
    queryKey: ["exam_config"],
    queryFn: async () => (await supabase.from("exam_config").select("*").maybeSingle()).data,
  });
  const { data: userPapers } = useUserPapers();

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

  // Wizard state
  const [step, setStep] = useState(1);
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [attempt, setAttempt] = useState("");
  const [dailyHours, setDailyHours] = useState("6");
  const [coachingHours, setCoachingHours] = useState("");
  const [working, setWorking] = useState(false);
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced" | "revision">(
    "intermediate",
  );

  const [slots, setSlots] = useState<Slot[]>([]);
  const [subjectsPerDay, setSubjectsPerDay] = useState<string>("auto");
  const [maxSession, setMaxSession] = useState<string>("auto");
  const [revisionFreq, setRevisionFreq] = useState<string>("auto");
  const [bufferDays, setBufferDays] = useState<string>("");
  const [weeklyHoliday, setWeeklyHoliday] = useState<string>("auto");
  const [breakMinutes, setBreakMinutes] = useState<string>("auto");
  const [weak, setWeak] = useState<string[]>([]);
  const [strong, setStrong] = useState<string[]>([]);

  const [style, setStyle] = useState<Style>("balanced");

  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled) return;
    const dates = (examConfig?.paper_dates as Record<string, string> | undefined) ?? {};
    const lvl = (profile as { level?: string } | null)?.level ?? "inter";
    const group = profile?.exam_group ?? "both";
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = (userPapers ?? [])
      .filter((p) => {
        const pl = (p as { level?: string }).level ?? "inter";
        if (pl !== lvl) return false;
        if (group !== "both" && p.paper_group !== group) return false;
        return !!dates[p.code] && dates[p.code] >= today;
      })
      .map((p) => ({ ...p, date: dates[p.code] }))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (upcoming.length > 0) {
      const label = lvl === "final" ? "CA Final" : "CA Inter";
      setExamName(`${label} — ${upcoming[0].name}`);
      setExamDate(upcoming[0].date);
      if (profile?.daily_study_hours) setDailyHours(String(profile.daily_study_hours));
      setPrefilled(true);
    }
  }, [examConfig, userPapers, profile, prefilled]);

  const generate = useMutation({
    mutationFn: async () => {
      if (!examName.trim()) throw new Error("Exam name required");
      if (!examDate) throw new Error("Exam date required");
      const hrs = Number(dailyHours);
      if (!hrs || hrs < 0.5) throw new Error("Enter valid daily hours");
      return generateFn({
        data: {
          exam_name: examName.trim(),
          exam_date: examDate,
          preparation_level: level,
          daily_hours: hrs,
          weak_subjects: weak,
          strong_subjects: strong,
          study_style: style,
          attempt: attempt.trim() || null,
          coaching_hours: coachingHours ? Number(coachingHours) : null,
          working,
          preferred_slots: slots,
          subjects_per_day:
            subjectsPerDay === "auto" ? null : (Number(subjectsPerDay) as 1 | 2 | 3),
          max_session_hours:
            maxSession === "auto" ? null : (Number(maxSession) as 1 | 1.5 | 2),
          revision_frequency:
            revisionFreq === "auto"
              ? null
              : (revisionFreq as "daily" | "every_2_days" | "weekly"),
          buffer_days: bufferDays ? Number(bufferDays) : null,
          weekly_holiday:
            weeklyHoliday === "auto"
              ? null
              : (weeklyHoliday as "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"),
          break_minutes:
            breakMinutes === "auto" ? null : (Number(breakMinutes) as 15 | 30 | 45),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-plans"] });
      toast.success("Your AI timetable is ready");
      setStep(1);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSlot = (s: Slot) =>
    setSlots((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleSubject = (
    list: string[],
    setList: (v: string[]) => void,
    name: string,
  ) => setList(list.includes(name) ? list.filter((x) => x !== name) : [...list, name]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="AI Timetable"
        title="A smart study plan, built in under 2 minutes."
        description="Answer a few quick questions. Our AI mentor plans the rest — balancing revision, mocks, weak subjects and rest days for you."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,480px)_1fr]">
        <Card className="h-fit print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-gold" /> Build my timetable
            </CardTitle>
            <CardDescription>Step {step} of 3</CardDescription>
            <div className="mt-3 flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-1.5 flex-1 rounded-full ${
                    n <= step ? "bg-gold" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 1 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Exam auto-fills from your{" "}
                  <Link to="/calendar" className="text-gold hover:underline">
                    Exam Calendar
                  </Link>
                  .
                </div>
                <div>
                  <Label>Course & Paper</Label>
                  <Input
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="CA Inter — Paper 1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Attempt</Label>
                    <Input
                      value={attempt}
                      onChange={(e) => setAttempt(e.target.value)}
                      placeholder="May 2026"
                    />
                  </div>
                  <div>
                    <Label>Exam date</Label>
                    <Input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Daily study hours</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="16"
                      value={dailyHours}
                      onChange={(e) => setDailyHours(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>
                      Coaching hrs/day{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="12"
                      value={coachingHours}
                      onChange={(e) => setCoachingHours(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={working}
                    onCheckedChange={(v) => setWorking(v === true)}
                  />
                  I'm working / in articleship
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <p className="text-xs text-muted-foreground">
                  All fields are optional. Leave anything blank and the AI picks the best
                  option for you.
                </p>

                <div>
                  <Label className="mb-2 block">Preferred study slots</Label>
                  <div className="space-y-1.5">
                    {SLOTS.map((s) => (
                      <label
                        key={s.value}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Checkbox
                          checked={slots.includes(s.value)}
                          onCheckedChange={() => toggleSlot(s.value)}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <PrefSelect
                    label="Subjects per day"
                    value={subjectsPerDay}
                    onChange={setSubjectsPerDay}
                    options={[
                      { value: "1", label: "1" },
                      { value: "2", label: "2" },
                      { value: "3", label: "3" },
                    ]}
                  />
                  <PrefSelect
                    label="Max continuous session"
                    value={maxSession}
                    onChange={setMaxSession}
                    options={[
                      { value: "1", label: "1 hr" },
                      { value: "1.5", label: "1.5 hr" },
                      { value: "2", label: "2 hr" },
                    ]}
                  />
                  <PrefSelect
                    label="Revision frequency"
                    value={revisionFreq}
                    onChange={setRevisionFreq}
                    options={[
                      { value: "daily", label: "Daily" },
                      { value: "every_2_days", label: "Every 2 days" },
                      { value: "weekly", label: "Weekly" },
                    ]}
                  />
                  <PrefSelect
                    label="Break duration"
                    value={breakMinutes}
                    onChange={setBreakMinutes}
                    options={[
                      { value: "15", label: "15 min" },
                      { value: "30", label: "30 min" },
                      { value: "45", label: "45 min" },
                    ]}
                  />
                  <PrefSelect
                    label="Weekly holiday"
                    value={weeklyHoliday}
                    onChange={setWeeklyHoliday}
                    options={[
                      { value: "sun", label: "Sunday" },
                      { value: "mon", label: "Monday" },
                      { value: "tue", label: "Tuesday" },
                      { value: "wed", label: "Wednesday" },
                      { value: "thu", label: "Thursday" },
                      { value: "fri", label: "Friday" },
                      { value: "sat", label: "Saturday" },
                    ]}
                  />
                  <div>
                    <Label>
                      Buffer days{" "}
                      <span className="text-muted-foreground">(pre-exam)</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      placeholder="AI decides"
                      value={bufferDays}
                      onChange={(e) => setBufferDays(e.target.value)}
                    />
                  </div>
                </div>

                {userPapers && userPapers.length > 0 && (
                  <div className="grid gap-4">
                    <SubjectPicker
                      title="Weak subjects"
                      papers={userPapers}
                      selected={weak}
                      onToggle={(n) => toggleSubject(weak, setWeak, n)}
                    />
                    <SubjectPicker
                      title="Strong subjects"
                      papers={userPapers}
                      selected={strong}
                      onToggle={(n) => toggleSubject(strong, setStrong, n)}
                    />
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Pick your planning strategy. The AI adapts everything else.
                </p>
                {STYLES.map((s) => {
                  const selected = style === s.value;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setStyle(s.value)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-gold bg-gold/5 ring-1 ring-gold/40"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-gold" />
                        <span className="font-semibold">{s.title}</span>
                        {s.badge && (
                          <Badge variant="outline" className="ml-auto border-gold/40 text-gold">
                            {s.badge}
                          </Badge>
                        )}
                      </div>
                      <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
                        {s.points.map((p) => (
                          <li key={p} className="flex items-center gap-1.5">
                            <Check className="h-3 w-3 text-gold" /> {p}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1 || generate.isPending}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {step < 3 ? (
                <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => generate.mutate()}
                  disabled={generate.isPending}
                  className="gap-2"
                >
                  {generate.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Building…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Generate AI Timetable
                    </>
                  )}
                </Button>
              )}
            </div>
            {generate.isPending && (
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-muted-foreground">
                Reading ICAI syllabus, weightage and your calendar. Usually 15–30 seconds.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {isLoading ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Loading…
              </CardContent>
            </Card>
          ) : !active ? (
            <EmptyState
              title="No timetable yet"
              body="Answer the 3 quick steps to generate your first AI timetable."
            />
          ) : (
            <PlanView plan={active} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function PrefSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Let AI decide</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SubjectPicker({
  title,
  papers,
  selected,
  onToggle,
}: {
  title: string;
  papers: { code: string; name: string }[];
  selected: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <div>
      <Label className="mb-2 block">{title}</Label>
      <div className="flex flex-wrap gap-2">
        {papers.map((p) => {
          const active = selected.includes(p.name);
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => onToggle(p.name)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                active
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border hover:bg-accent"
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlanView({
  plan,
}: {
  plan: {
    id: string;
    exam_name: string;
    exam_date: string;
    daily_hours: number;
    preparation_level: string;
    strategy: string | null;
    daily_timetable: unknown;
    weekly_goals: unknown;
    monthly_goals: unknown;
    plan_days?: unknown;
  };
}) {
  const weekly = (plan.weekly_goals as WeeklyGoal[]) ?? [];
  const monthly = (plan.monthly_goals as MonthlyGoal[]) ?? [];
  const days = ((plan.plan_days as PlanDay[]) ?? []).slice().sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const template = (plan.daily_timetable as TimetableBlock[]) ?? [];
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(plan.exam_date).getTime() - Date.now()) / 86400000),
  );

  const syncFn = useServerFn(syncPlanToTasks);
  const regenFn = useServerFn(regenerateRemaining);
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const initialDate = days.find((d) => d.date >= today)?.date ?? days[0]?.date ?? today;
  const [activeDate, setActiveDate] = useState(initialDate);
  const [regenBusy, setRegenBusy] = useState(false);

  useEffect(() => {
    setActiveDate(initialDate);
  }, [plan.id, initialDate]);

  const activeDay = days.find((d) => d.date === activeDate) ?? null;

  const sync = useMutation({
    mutationFn: (d: number) => syncFn({ data: { plan_id: plan.id, days: d } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(`Synced ${res.inserted} sessions across ${res.days} days`, {
        action: {
          label: "Open Planner",
          onClick: () => {
            window.location.href = "/planner";
          },
        },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doRegenerate = async () => {
    setRegenBusy(true);
    try {
      await regenFn({ data: { plan_id: plan.id } });
      toast.success("Timetable regenerated for the remaining days");
      qc.invalidateQueries({ queryKey: ["study-plans"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not regenerate");
    } finally {
      setRegenBusy(false);
    }
  };

  const dayTypeColor = (t: PlanDayType) =>
    t === "holiday"
      ? "bg-destructive/15 text-destructive"
      : t === "buffer"
        ? "bg-muted text-muted-foreground"
        : t === "revision"
          ? "bg-gold/15 text-gold"
          : "bg-primary/10 text-primary";

  // Weekly view = current week (Mon-Sun) around activeDate
  const weekStart = startOfWeek(parseISO(activeDate), { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), "yyyy-MM-dd"),
  );

  // Monthly view = by month bucket
  const byMonth = useMemo(() => {
    const m = new Map<string, PlanDay[]>();
    for (const d of days) {
      const key = d.date.slice(0, 7);
      const arr = m.get(key) ?? [];
      arr.push(d);
      m.set(key, arr);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [days]);

  return (
    <Card className="print:border-0 print:shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
              <Star className="h-3.5 w-3.5" /> Active timetable
            </div>
            <CardTitle className="mt-1">{plan.exam_name}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(parseISO(plan.exam_date), "EEE, MMM d, yyyy")} · {daysLeft} days left
              </span>
              <span>·</span>
              <span>{plan.daily_hours}h/day</span>
              <span>·</span>
              <span className="capitalize">{plan.preparation_level}</span>
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sync.mutate(7)}
              disabled={sync.isPending}
              className="gap-1.5"
            >
              <ListChecks className="h-4 w-4" /> Sync to Planner
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sync.mutate(1)}
              disabled={sync.isPending}
              className="gap-1.5"
            >
              <ListChecks className="h-4 w-4" /> Sync to Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" /> PDF
            </Button>
            <Button
              size="sm"
              onClick={doRegenerate}
              disabled={regenBusy}
              className="gap-1.5"
            >
              {regenBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerate remaining
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {plan.strategy && (
          <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Strategy
            </div>
            <p className="text-sm leading-relaxed">{plan.strategy}</p>
          </div>
        )}

        <Tabs defaultValue="daily">
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4 space-y-4">
            {days.length === 0 ? (
              <TemplateList blocks={template} />
            ) : (
              <>
                <div className="-mx-2 overflow-x-auto px-2 pb-2 print:hidden">
                  <div className="flex gap-2">
                    {days.slice(0, 30).map((d) => {
                      const active = d.date === activeDate;
                      return (
                        <button
                          key={d.date}
                          onClick={() => setActiveDate(d.date)}
                          className={`shrink-0 rounded-lg border px-3 py-2 text-left text-xs transition ${
                            active
                              ? "border-gold bg-gold/10"
                              : "border-border hover:bg-accent"
                          }`}
                        >
                          <div className="font-mono">
                            {format(parseISO(d.date), "EEE d")}
                          </div>
                          <div
                            className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] uppercase ${dayTypeColor(d.type)}`}
                          >
                            {d.type}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {activeDay && <DayCard day={activeDay} />}
              </>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {weekDates.map((iso) => {
                const d = days.find((x) => x.date === iso);
                return (
                  <div
                    key={iso}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">
                        {format(parseISO(iso), "EEE, MMM d")}
                      </div>
                      {d && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${dayTypeColor(d.type)}`}
                        >
                          {d.type}
                        </span>
                      )}
                    </div>
                    {d && d.blocks.length > 0 ? (
                      <ul className="space-y-1 text-xs">
                        {d.blocks.map((b, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="font-mono text-muted-foreground">
                              {b.start}
                            </span>
                            <span className="truncate">{b.subject}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {d?.type === "holiday" ? "Holiday" : "No sessions"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {weekly.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Weekly goals
                </div>
                {weekly.map((w) => (
                  <div
                    key={w.week}
                    className="rounded-lg border border-border p-4"
                  >
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
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="monthly" className="mt-4 space-y-4">
            {byMonth.map(([key, ds]) => (
              <div key={key} className="rounded-lg border border-border p-4">
                <div className="mb-2 font-display text-lg font-semibold">
                  {format(parseISO(`${key}-01`), "MMMM yyyy")}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                  {ds.map((d) => (
                    <div
                      key={d.date}
                      className={`rounded p-1.5 ${dayTypeColor(d.type)}`}
                      title={`${d.date} · ${d.type}`}
                    >
                      {format(parseISO(d.date), "d")}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {monthly.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Monthly milestones
                </div>
                {monthly.map((m, i) => (
                  <div key={i} className="rounded-lg border border-border p-4">
                    <div className="mb-2 font-display text-lg font-semibold">
                      {m.month}
                    </div>
                    <ul className="space-y-1 text-sm">
                      {m.goals.map((g, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <Target className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function DayCard({ day }: { day: PlanDay }) {
  if (day.type === "holiday") {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Marked as holiday — rest day.
      </div>
    );
  }
  if (day.blocks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No sessions scheduled.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {day.blocks.map((b, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-lg border border-border p-3"
        >
          <div className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
            {b.start}–{b.end}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium">{b.subject}</div>
            <div className="text-sm text-muted-foreground">{b.activity}</div>
            {b.focus_area && (
              <div className="mt-0.5 text-xs text-gold">{b.focus_area}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function TemplateList({ blocks }: { blocks: TimetableBlock[] }) {
  if (blocks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No sessions available.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {blocks.map((b, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-lg border border-border p-3"
        >
          <div className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
            {b.start}–{b.end}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium">{b.subject}</div>
            <div className="text-sm text-muted-foreground">{b.activity}</div>
            {b.focus_area && (
              <div className="mt-0.5 text-xs text-gold">{b.focus_area}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
