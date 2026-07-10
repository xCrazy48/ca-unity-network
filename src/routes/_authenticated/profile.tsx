import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile · CA Unity Network" }, { name: "robots", content: "noindex" }] }),
  component: Profile,
});

function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [level, setLevel] = useState<string>("inter");
  const [initialLevel, setInitialLevel] = useState<string>("inter");
  const [levelChanges, setLevelChanges] = useState<number>(0);
  const [group, setGroup] = useState("both");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? "");
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      if (data) {
        const d: { level?: string; level_change_count?: number } = data;
        setFullName(data.full_name ?? "");
        if (d.level) { setLevel(d.level); setInitialLevel(d.level); }
        setLevelChanges(Number(d.level_change_count ?? 0));
        if (data.exam_group) setGroup(data.exam_group);
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
    const { error } = await supabase.from("profiles").upsert({
      id: u.user!.id,
      full_name: fullName,
      level: level as never,
      exam_group: group as never,
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
          <Row label="Exam dates">
            <p className="text-sm text-muted-foreground">
              Paper-wise exam dates live in the{" "}
              <Link to="/calendar" className="text-gold hover:underline">Exam Calendar</Link>.
              They sync automatically to your dashboard and AI planner.
            </p>
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
