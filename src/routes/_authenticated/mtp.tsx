import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

export const Route = createFileRoute("/_authenticated/mtp")({
  head: () => ({
    meta: [{ title: "MTP · CA Unity Network" }, { name: "robots", content: "noindex" }],
  }),
  component: MtpPage,
});

const SESSIONS = [
  "May 2024",
  "Nov 2024",
  "May 2025",
  "Sep 2025",
  "Jan 2026",
  "May 2026",
];
const STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

function MtpPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sessionFilter, setSessionFilter] = useState("all");

  const { data: papers } = useQuery({
    queryKey: ["papers"],
    queryFn: async () =>
      (await supabase.from("papers").select("*").order("sort_order")).data ?? [],
  });
  const { data: attempts } = useQuery({
    queryKey: ["mtp_attempts"],
    queryFn: async () =>
      (
        await supabase
          .from("mtp_attempts")
          .select("*")
          .order("session", { ascending: false })
      ).data ?? [],
  });

  const filtered = useMemo(
    () =>
      (attempts ?? []).filter(
        (a) => sessionFilter === "all" || a.session === sessionFilter,
      ),
    [attempts, sessionFilter],
  );

  const completed = filtered.filter((a) => a.status === "completed").length;

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mtp_attempts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["mtp_attempts"] });
    },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="MTP tracker"
        title="Every ICAI Mock Test Paper, tracked."
        description="Plan, attempt, and review each MTP by session and paper. Score trends tell you if you're peaking at the right time."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gold text-primary-foreground">
                <Plus className="mr-1.5 h-4 w-4" /> Add MTP
              </Button>
            </DialogTrigger>
            <MtpForm onDone={() => setOpen(false)} papers={papers ?? []} />
          </Dialog>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Planned" value={filtered.filter(a => a.status === "planned").length} />
        <Stat label="In progress" value={filtered.filter(a => a.status === "in_progress").length} />
        <Stat label="Completed" value={completed} accent />
      </div>

      <div className="mb-6">
        <Select value={sessionFilter} onValueChange={setSessionFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sessions</SelectItem>
            {SESSIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No MTPs tracked"
          body="Add each MTP you plan to attempt. Log the score afterwards to build a session-over-session trend."
          action={
            <Button onClick={() => setOpen(true)} className="bg-gold text-primary-foreground">
              <Plus className="mr-1.5 h-4 w-4" /> Add MTP
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                {a.status === "completed" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-gold" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-semibold">
                      {a.session}
                    </span>
                    <Badge variant="outline" className="border-gold/40 text-gold">
                      {a.paper_code}
                    </Badge>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      {a.status.replace("_", " ")}
                    </span>
                  </div>
                  {a.notes && (
                    <p className="mt-1 text-sm text-muted-foreground">{a.notes}</p>
                  )}
                  {a.attempt_date && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Attempted {format(new Date(a.attempt_date), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {a.score !== null && a.max_score !== null && (
                  <div className="text-right">
                    <div className="font-display text-2xl font-semibold text-gold">
                      {Math.round((Number(a.score) / Number(a.max_score)) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.score} / {a.max_score}
                    </div>
                  </div>
                )}
                <Button variant="ghost" size="icon" onClick={() => del.mutate(a.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
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

function MtpForm({
  onDone,
  papers,
}: {
  onDone: () => void;
  papers: Tables<"papers">[];
}) {
  const qc = useQueryClient();
  const [session, setSession] = useState(SESSIONS[SESSIONS.length - 1]);
  const [paperCode, setPaperCode] = useState<string>(papers[0]?.code ?? "");
  const [status, setStatus] = useState("planned");
  const [score, setScore] = useState("");
  const [max, setMax] = useState("100");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("mtp_attempts").insert({
        user_id: user.id,
        session,
        paper_code: paperCode,
        status,
        score: score ? Number(score) : null,
        max_score: max ? Number(max) : null,
        attempt_date: date || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("MTP added");
      qc.invalidateQueries({ queryKey: ["mtp_attempts"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">Add MTP</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Session">
            <Select value={session} onValueChange={setSession}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Paper">
            <Select value={paperCode} onValueChange={setPaperCode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {papers.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {status === "completed" && (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Score">
              <Input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </Field>
            <Field label="Out of">
              <Input
                type="number"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>
        )}
        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Sections attempted, weak areas…"
          />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="bg-gold text-primary-foreground"
        >
          Save
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
