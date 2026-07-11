import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useUserPapers } from "@/hooks/use-user-papers";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/mistakes")({
  head: () => ({
    meta: [
      { title: "Mistake Book · CA Unity Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MistakesPage,
});

const SOURCES = ["module", "rtp", "mtp", "pyq", "mock", "coaching", "other"] as const;
const STATUSES = ["open", "reviewing", "resolved"] as const;

function MistakesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const { data: papers } = useUserPapers();
  const { data: mistakes } = useQuery({
    queryKey: ["mistakes"],
    queryFn: async () =>
      (
        await supabase
          .from("mistakes")
          .select("*")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const filtered = useMemo(() => {
    return (mistakes ?? []).filter((m) => {
      if (tab !== "all" && m.status !== tab) return false;
      if (sourceFilter !== "all" && m.source !== sourceFilter) return false;
      return true;
    });
  }, [mistakes, tab, sourceFilter]);

  const dueToday = (mistakes ?? []).filter(
    (m) =>
      m.next_revision_date &&
      new Date(m.next_revision_date) <= new Date() &&
      m.status !== "resolved",
  ).length;

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mistakes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["mistakes"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Tables<"mistakes">["status"] }) => {
      const nextDate =
        status === "reviewing"
          ? addDays(new Date(), 3).toISOString().slice(0, 10)
          : status === "open"
            ? addDays(new Date(), 1).toISOString().slice(0, 10)
            : null;
      const { error } = await supabase
        .from("mistakes")
        .update({ status, next_revision_date: nextDate })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mistakes"] }),
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Mistake book"
        title="Errors, on a schedule."
        description="Log every mistake with source, concept, and correction. Spaced repetition brings each one back exactly when you'd forget."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gold text-primary-foreground">
                <Plus className="mr-1.5 h-4 w-4" /> Log mistake
              </Button>
            </DialogTrigger>
            <MistakeForm
              onDone={() => setOpen(false)}
              papers={papers ?? []}
              chapters={chapters ?? []}
            />
          </Dialog>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Open" value={mistakes?.filter(m => m.status === "open").length ?? 0} />
        <Stat label="Due for review" value={dueToday} accent />
        <Stat label="Resolved" value={mistakes?.filter(m => m.status === "resolved").length ?? 0} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="reviewing">Reviewing</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No mistakes logged"
          body="Every mistake you log is scheduled for review. Spaced repetition surfaces them before you'd forget."
          action={
            <Button onClick={() => setOpen(true)} className="bg-gold text-primary-foreground">
              <Plus className="mr-1.5 h-4 w-4" /> Log mistake
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-gold/40 text-gold">
                      {m.source.toUpperCase()}
                    </Badge>
                    {m.paper_code && (
                      <Badge variant="secondary">{m.paper_code}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(m.created_at), "MMM d")}
                    </span>
                    {m.next_revision_date && m.status !== "resolved" && (
                      <span className="flex items-center gap-1 text-xs text-warning">
                        <AlertTriangle className="h-3 w-3" /> review{" "}
                        {format(new Date(m.next_revision_date), "MMM d")}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold">
                    {m.concept}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="text-foreground">Mistake: </span>
                    {m.mistake}
                  </p>
                  {m.correction && (
                    <p className="mt-2 rounded-lg border border-gold/20 bg-accent/40 p-3 text-sm">
                      <span className="text-gold">Correction: </span>
                      {m.correction}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Select
                    value={m.status}
                    onValueChange={(v) => updateStatus.mutate({ id: m.id, status: v as Tables<"mistakes">["status"] })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(m.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  {m.status === "resolved" && (
                    <CheckCircle2 className="h-5 w-5 text-gold" />
                  )}
                </div>
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

function MistakeForm({
  onDone,
  papers,
  chapters,
}: {
  onDone: () => void;
  papers: Tables<"papers">[];
  chapters: Tables<"chapters">[];
}) {
  const qc = useQueryClient();
  const [source, setSource] = useState<string>("module");
  const [paperCode, setPaperCode] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");
  const [concept, setConcept] = useState("");
  const [mistake, setMistake] = useState("");
  const [correction, setCorrection] = useState("");
  const [sourceRef, setSourceRef] = useState("");

  const filteredChapters = chapters.filter((c) => !paperCode || c.paper_code === paperCode);

  const save = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("mistakes").insert({
        user_id: user.id,
        source: source as Tables<"mistakes">["source"],
        paper_code: paperCode || null,
        chapter_id: chapterId || null,
        concept,
        mistake,
        correction: correction || null,
        source_ref: sourceRef || null,
        next_revision_date: addDays(new Date(), 1).toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mistake logged");
      qc.invalidateQueries({ queryKey: ["mistakes"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">Log a mistake</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reference">
            <Input
              value={sourceRef}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder="Q.12, RTP May'24"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paper">
            <Select value={paperCode} onValueChange={(v) => { setPaperCode(v); setChapterId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
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
          <Field label="Chapter">
            <Select value={chapterId} onValueChange={setChapterId} disabled={!paperCode}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {filteredChapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Concept">
          <Input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="e.g. Deferred tax on revaluation"
          />
        </Field>
        <Field label="Mistake">
          <Textarea
            value={mistake}
            onChange={(e) => setMistake(e.target.value)}
            rows={3}
            placeholder="What went wrong…"
          />
        </Field>
        <Field label="Correction">
          <Textarea
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            rows={3}
            placeholder="The right approach / rule to remember"
          />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          onClick={() => save.mutate()}
          disabled={!concept || !mistake || save.isPending}
          className="bg-gold text-primary-foreground"
        >
          Save mistake
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
