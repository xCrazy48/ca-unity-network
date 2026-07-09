import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · CA Unity Network" }, { name: "robots", content: "noindex" }] }),
  component: Profile,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [level, setLevel] = useState<string>("inter");
  const [initialLevel, setInitialLevel] = useState<string>("inter");
  const [levelChanges, setLevelChanges] = useState<number>(0);
  const now = new Date();
  const [examMonth, setExamMonth] = useState<number>(now.getMonth() + 1);
  const [examYear, setExamYear] = useState<number>(now.getFullYear());
  const [examDate, setExamDate] = useState<string>("");
  const [group, setGroup] = useState("both");
  const [hours, setHours] = useState(6);
  const [coaching, setCoaching] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? "");
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      if (data) {
        const d: any = data;
        setFullName(data.full_name ?? "");
        if (d.level) { setLevel(d.level); setInitialLevel(d.level); }
        setLevelChanges(Number(d.level_change_count ?? 0));
        if (d.exam_month) setExamMonth(Number(d.exam_month));
        if (d.exam_year) setExamYear(Number(d.exam_year));
        if (d.exam_date) setExamDate(d.exam_date);
        if (data.exam_group) setGroup(data.exam_group);
        if (data.daily_study_hours) setHours(Number(data.daily_study_hours));
        setCoaching(data.coaching_schedule ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const levelChanged = level !== initialLevel;
  const changesLeft = Math.max(0, 3 - levelChanges);
  const levelLocked = initialLevel !== "" && changesLeft === 0;

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const finalExamDate = examDate || `${examYear}-${String(examMonth).padStart(2, "0")}-01`;
    const { error } = await supabase.from("profiles").upsert({
      id: u.user!.id,
      full_name: fullName,
      level: level as never,
      exam_month: examMonth as never,
      exam_year: examYear as never,
      exam_date: finalExamDate as never,
      exam_group: group as never,
      daily_study_hours: hours,
      coaching_schedule: coaching,
      onboarded: true,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    if (levelChanged) {
      setInitialLevel(level);
      setLevelChanges((c) => c + 1);
    }
    toast.success("Profile saved");
  };

  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() + i);

  if (loading) return <AppShell><div className="text-muted-foreground">Loading…</div></AppShell>;

  return (
    <AppShell>
      <h1 className="font-display text-4xl font-semibold">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Edit anytime. Everything updates immediately.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Account">
          <Row label="Email"><div className="text-sm text-muted-foreground">{email}</div></Row>
          <Row label="Full name">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold"
            />
          </Row>
        </Card>

        <Card title="Exam">
          <Row label={`Level · ${changesLeft} change${changesLeft === 1 ? "" : "s"} left`}>
            <select
              value={level}
              disabled={levelLocked}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold disabled:opacity-60"
            >
              <option value="inter">CA Intermediate</option>
              <option value="final">CA Final</option>
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {levelLocked
                ? "You've used all 3 level changes. This is now locked."
                : "Your level can only be changed 3 times in your lifetime."}
            </p>
          </Row>
          <Row label="Exam month & year">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={examMonth}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setExamMonth(m);
                  setExamDate(`${examYear}-${String(m).padStart(2, "0")}-01`);
                }}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={examYear}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setExamYear(y);
                  setExamDate(`${y}-${String(examMonth).padStart(2, "0")}-01`);
                }}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </Row>
          <Row label="Exam date (defaults to 1st of exam month)">
            <input
              type="date"
              value={examDate || `${examYear}-${String(examMonth).padStart(2, "0")}-01`}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold"
            />
          </Row>
          <Row label="Group">
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="group_1">Group 1</option>
              <option value="group_2">Group 2</option>
              <option value="both">Both Groups</option>
            </select>
          </Row>
        </Card>

        <Card title="Study rhythm">
          <Row label={`Daily hours: ${hours}`}>
            <input
              type="range"
              min={1}
              max={14}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full accent-[oklch(0.82_0.14_82)]"
            />
          </Row>
          <Row label="Coaching schedule">
            <textarea
              value={coaching}
              rows={3}
              onChange={(e) => setCoaching(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold"
            />
          </Row>
        </Card>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
