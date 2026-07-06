import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up · PrepOS" }, { name: "robots", content: "noindex" }] }),
  component: Onboarding,
});

const ATTEMPTS = [
  { v: "may_2025", l: "May 2025" },
  { v: "sep_2025", l: "September 2025" },
  { v: "jan_2026", l: "January 2026" },
  { v: "may_2026", l: "May 2026" },
  { v: "sep_2026", l: "September 2026" },
] as const;

const GROUPS = [
  { v: "group_1", l: "Group 1" },
  { v: "group_2", l: "Group 2" },
  { v: "both", l: "Both Groups" },
] as const;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [attempt, setAttempt] = useState<string>("may_2026");
  const [group, setGroup] = useState<string>("both");
  const [hours, setHours] = useState(6);
  const [coaching, setCoaching] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*").maybeSingle().then(({ data }) => {
      if (data) {
        setFullName(data.full_name ?? "");
        if (data.attempt) setAttempt(data.attempt);
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
    const { error } = await supabase.from("profiles").upsert({
      id: uid,
      full_name: fullName,
      attempt: attempt as never,
      exam_group: group as never,
      daily_study_hours: hours,
      coaching_schedule: coaching,
      onboarded: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("You're all set");
    navigate({ to: "/calendar" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <p className="text-sm uppercase tracking-[0.2em] text-gold">Set up · Step {step + 1} of 4</p>
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
            <Field label="Which attempt are you targeting?">
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ATTEMPTS.map((a) => (
                  <button
                    key={a.v}
                    onClick={() => setAttempt(a.v)}
                    className={`rounded-lg border px-4 py-3 text-sm transition ${
                      attempt === a.v
                        ? "border-gold bg-accent text-foreground shadow-elegant"
                        : "border-border hover:border-gold/40"
                    }`}
                  >
                    {a.l}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {step === 2 && (
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
          {step === 3 && (
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
            {step < 3 ? (
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
