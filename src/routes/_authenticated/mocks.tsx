import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/mocks")({
  head: () => ({
    meta: [
      { title: "Mock Tests · CA Unity Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MocksPage,
});

type Mock = Tables<"mock_tests">;

function MocksPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const { data: papers } = useQuery({
    queryKey: ["papers"],
    queryFn: async () =>
      (await supabase.from("papers").select("*").order("sort_order")).data ?? [],
  });

  const { data: mocks } = useQuery({
    queryKey: ["mock_tests"],
    queryFn: async () =>
      (
        await supabase
          .from("mock_tests")
          .select("*")
          .order("test_date", { ascending: false })
      ).data ?? [],
  });

  const filtered = useMemo(
    () =>
      (mocks ?? []).filter((m) => filter === "all" || m.paper_code === filter),
    [mocks, filter],
  );

  const chartData = useMemo(
    () =>
      [...filtered]
        .reverse()
        .map((m) => ({
          date: format(new Date(m.test_date), "MMM d"),
          score: Math.round((Number(m.score) / Number(m.max_score)) * 100),
          name: m.test_name,
        })),
    [filtered],
  );

  const avg = useMemo(() => {
    if (filtered.length === 0) return 0;
    return Math.round(
      filtered.reduce(
        (s, m) => s + (Number(m.score) / Number(m.max_score)) * 100,
        0,
      ) / filtered.length,
    );
  }, [filtered]);

  const best = useMemo(
    () =>
      filtered.reduce(
        (b, m) => {
          const pct = (Number(m.score) / Number(m.max_score)) * 100;
          return pct > b ? pct : b;
        },
        0,
      ),
    [filtered],
  );

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mock_tests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mock deleted");
      qc.invalidateQueries({ queryKey: ["mock_tests"] });
    },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Mock test tracker"
        title="Turn scores into action items."
        description="Log every mock with score, time taken, and weak areas. The AI Engine reads this to prioritise your next study block."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gold text-primary-foreground">
                <Plus className="mr-1.5 h-4 w-4" /> Log a mock
              </Button>
            </DialogTrigger>
            <MockForm onDone={() => setOpen(false)} papers={papers ?? []} />
          </Dialog>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Mocks logged" value={filtered.length} />
        <Stat label="Average score" value={`${avg}%`} accent />
        <Stat label="Personal best" value={`${Math.round(best)}%`} />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All papers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All papers</SelectItem>
            {papers?.map((p) => (
              <SelectItem key={p.code} value={p.code}>
                {p.code} · {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {chartData.length > 1 && (
        <section className="mb-8 rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-gold" /> Score trend
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--gold)"
                  strokeWidth={2}
                  dot={{ fill: "var(--gold)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No mocks yet"
          body="Log your first mock to unlock trend charts, weak-area analysis, and AI-generated action items."
          action={
            <Button onClick={() => setOpen(true)} className="bg-gold text-primary-foreground">
              <Plus className="mr-1.5 h-4 w-4" /> Log a mock
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((m) => {
            const pct = Math.round(
              (Number(m.score) / Number(m.max_score)) * 100,
            );
            return (
              <li
                key={m.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">
                      {m.test_name}
                    </h3>
                    {m.paper_code && (
                      <Badge variant="outline" className="border-gold/40 text-gold">
                        {m.paper_code}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(m.test_date), "MMM d, yyyy")}
                    </span>
                  </div>
                  {m.weak_areas && (
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      <span className="text-foreground">Weak areas: </span>
                      {m.weak_areas}
                    </p>
                  )}
                  {m.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-display text-2xl font-semibold text-gold">
                      {pct}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.score} / {m.max_score}
                      {m.time_taken_minutes ? ` · ${m.time_taken_minutes}m` : ""}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => del.mutate(m.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-2xl font-semibold ${accent ? "text-gold" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function MockForm({
  onDone,
  papers,
}: {
  onDone: () => void;
  papers: Tables<"papers">[];
}) {
  const qc = useQueryClient();
  const [testName, setTestName] = useState("");
  const [paperCode, setPaperCode] = useState<string>("");
  const [score, setScore] = useState("");
  const [max, setMax] = useState("100");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("");
  const [weak, setWeak] = useState("");
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("mock_tests").insert({
        user_id: user.id,
        test_name: testName,
        paper_code: paperCode || null,
        score: Number(score),
        max_score: Number(max),
        test_date: date,
        time_taken_minutes: time ? Number(time) : null,
        weak_areas: weak || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mock logged");
      qc.invalidateQueries({ queryKey: ["mock_tests"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">Log a mock</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <Field label="Test name">
          <Input
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="ICAI Series 1 · Paper 1"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paper">
            <Select value={paperCode} onValueChange={setPaperCode}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {papers.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.code} · {p.name.split(" ").slice(0, 3).join(" ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Score">
            <Input
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="72"
            />
          </Field>
          <Field label="Out of">
            <Input
              type="number"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </Field>
          <Field label="Time (min)">
            <Input
              type="number"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="180"
            />
          </Field>
        </div>
        <Field label="Weak areas">
          <Input
            value={weak}
            onChange={(e) => setWeak(e.target.value)}
            placeholder="Amalgamation, Cash flow"
          />
        </Field>
        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What to fix before the next attempt…"
          />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          onClick={() => save.mutate()}
          disabled={!testName || !score || save.isPending}
          className="bg-gold text-primary-foreground"
        >
          Save mock
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
