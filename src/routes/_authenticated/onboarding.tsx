import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up · CA Unity Network" }, { name: "robots", content: "noindex" }] }),
  component: Onboarding,
});

const LEVELS = [
  { v: "inter", l: "CA Intermediate" },
  { v: "final", l: "CA Final" },
] as const;

const GROUPS = [
  { v: "group_1", l: "Group 1" },
  { v: "group_2", l: "Group 2" },
  { v: "both", l: "Both Groups" },
] as const;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [level, setLevel] = useState<string>("inter");
  const now = new Date();
  const [examMonth, setExamMonth] = useState<number>(now.getMonth() + 1);
  const [examYear, setExamYear] = useState<number>(now.getFullYear());
  const [group, setGroup] = useState<string>("both");
  const [hours, setHours] = useState(6);
  const [coaching, setCoaching] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*").maybeSingle().then(({ data }) => {
      if (data) {
        setFullName(data.full_name ?? "");
        if ((data as any).level) setLevel((data as any).level);
        if ((data as any).exam_month) setExamMonth(Number((data as any).exam_month));
        if ((data as any).exam_year) setExamYear(Number((data as any).exam_year));
        if (data.exam_group) setGroup(data.exam_group);
        if (data.daily_study_hours) setHours(Number(data.daily_study_hours));
        setCoaching(data.coaching_schedule ?? "");
      }
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user!.id;
    const examDate = `${examYear}-${String(examMonth).padStart(2, "0")}-01`;
    const { error } = await supabase.from("profiles").upsert({
      id: uid,
      full_name: fullName,
      level: level as never,
      exam_month: examMonth as never,
      exam_year: examYear as never,
      exam_date: examDate as never,
      exam_group: group as never,
      daily_study_hours: hours,
      coaching_schedule: coaching,
      onboarded: true,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("You're all set");
    navigate({ to: "/calendar" });
  };

  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() + i);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <p className="text-sm uppercase tracking-[0.2em] text-gold">Set up · Step {step + 1} of 5</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">Let's build your attempt.</h1>

        <div className="mt-10 rounded-2xl border border-border bg-card p-8 shadow-elegant">
          {step === 0 && (
            <Field label="What should we call you?">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gold"
              />
            </Field>
          )}
          {step === 1 && (
            <Field label="Which level are you preparing for?">
              <div className="mt-4 grid grid-cols-2 gap-2">
                {LEVELS.map((lv) => (
                  <button
                    key={lv.v}
                    onClick={() => setLevel(lv.v)}
                    className={`rounded-lg border px-4 py-3 text-sm transition ${
                      level === lv.v
                        ? "border-gold bg-accent text-foreground shadow-elegant"
                        : "border-border hover:border-gold/40"
                    }`}
                  >
                    {lv.l}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Heads up: your level can only be changed 3 times in your lifetime.
              </p>
            </Field>
          )}
          {step === 2 && (
            <Field label="When is your exam?">
              <div className="mt-4 grid grid-cols-2 gap-3">
                <select
                  value={examMonth}
                  onChange={(e) => setExamMonth(Number(e.target.value))}
                  className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gold"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={examYear}
                  onChange={(e) => setExamYear(Number(e.target.value))}
                  className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gold"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                We'll default your exam date to the 1st of {MONTHS[examMonth - 1]} {examYear}. You can fine-tune it later from your profile.
              </p>
            </Field>
          )}
          {step === 3 && (
            <Field label="Which group(s)?">
              <div className="mt-4 grid grid-cols-3 gap-2">
                {GROUPS.map((g) => (
                  <button
                    key={g.v}
                    onClick={() => setGroup(g.v)}
                    className={`rounded-lg border px-4 py-3 text-sm transition ${
                      group === g.v
                        ? "border-gold bg-accent text-foreground shadow-elegant"
                        : "border-border hover:border-gold/40"
                    }`}
                  >
                    {g.l}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {step === 4 && (
            <div className="space-y-6">
              <Field label={`Daily study hours: ${hours}`}>
                <input
                  type="range"
                  min={1}
                  max={14}
                  step={0.5}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="mt-4 w-full accent-[oklch(0.82_0.14_82)]"
                />
              </Field>
              <Field label="Coaching schedule (optional)">
                <textarea
                  value={coaching}
                  onChange={(e) => setCoaching(e.target.value)}
                  rows={3}
                  placeholder="e.g. Mon–Fri 7–10 AM · Sat live doubt class"
                  className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gold"
                />
              </Field>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="text-sm text-muted-foreground disabled:opacity-40"
            >
              Back
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && !fullName}
                className="rounded-lg bg-gold px-5 py-2 text-sm font-medium text-primary-foreground shadow-elegant disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-gold px-5 py-2 text-sm font-medium text-primary-foreground shadow-elegant disabled:opacity-50"
              >
                {saving ? "Saving…" : "Finish setup"}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-display text-lg font-semibold">{label}</span>
      {children}
    </label>
  );
}
