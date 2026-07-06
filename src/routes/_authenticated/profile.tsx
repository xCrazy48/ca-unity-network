import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · PrepOS" }, { name: "robots", content: "noindex" }] }),
  component: Profile,
});

function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [attempt, setAttempt] = useState("may_2026");
  const [group, setGroup] = useState("both");
  const [hours, setHours] = useState(6);
  const [coaching, setCoaching] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? "");
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        if (data.attempt) setAttempt(data.attempt);
        if (data.exam_group) setGroup(data.exam_group);
        if (data.daily_study_hours) setHours(Number(data.daily_study_hours));
        setCoaching(data.coaching_schedule ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").upsert({
      id: u.user!.id,
      full_name: fullName,
      attempt: attempt as never,
      exam_group: group as never,
      daily_study_hours: hours,
      coaching_schedule: coaching,
      onboarded: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

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
          <Row label="Attempt">
            <select
              value={attempt}
              onChange={(e) => setAttempt(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="may_2025">May 2025</option>
              <option value="sep_2025">September 2025</option>
              <option value="jan_2026">January 2026</option>
              <option value="may_2026">May 2026</option>
              <option value="sep_2026">September 2026</option>
            </select>
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
