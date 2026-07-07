import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Circle, Loader2, PenLine, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/chapters")({
  head: () => ({
    meta: [
      { title: "Chapters · PrepOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChaptersPage,
});

const STATUS = [
  { value: "not_started", label: "Not started", tone: "muted" },
  { value: "in_progress", label: "In progress", tone: "warning" },
  { value: "revised", label: "Revised", tone: "gold" },
  { value: "mastered", label: "Mastered", tone: "success" },
] as const;

type Chapter = Tables<"chapters">;
type ChapterProgress = Tables<"chapter_progress">;

function ChaptersPage() {
  const qc = useQueryClient();
  const [paperFilter, setPaperFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Chapter | null>(null);

  const { data: papers } = useQuery({
    queryKey: ["papers"],
    queryFn: async () =>
      (await supabase.from("papers").select("*").order("sort_order")).data ?? [],
  });

  const { data: chapters, isLoading } = useQuery({
    queryKey: ["chapters"],
    queryFn: async () =>
      (await supabase
        .from("chapters")
        .select("*")
        .order("paper_code")
        .order("sort_order")).data ?? [],
  });

  const { data: progress } = useQuery({
    queryKey: ["chapter_progress"],
    queryFn: async () =>
      (await supabase.from("chapter_progress").select("*")).data ?? [],
  });

  const progressByChapter = useMemo(() => {
    const map = new Map<string, ChapterProgress>();
    (progress ?? []).forEach((p) => map.set(p.chapter_id, p));
    return map;
  }, [progress]);

  const filtered = useMemo(() => {
    return (chapters ?? []).filter((c) => {
      if (paperFilter !== "all" && c.paper_code !== paperFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [chapters, paperFilter, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, Chapter[]> = {};
    filtered.forEach((c) => {
      (groups[c.paper_code] ??= []).push(c);
    });
    return groups;
  }, [filtered]);

  const stats = useMemo(() => {
    const total = chapters?.length ?? 0;
    const started = (progress ?? []).filter((p) => p.status !== "not_started")
      .length;
    const mastered = (progress ?? []).filter((p) => p.status === "mastered")
      .length;
    const avgConf =
      progress && progress.length
        ? Math.round(
            progress.reduce((s, p) => s + p.confidence, 0) / progress.length,
          )
        : 0;
    return { total, started, mastered, avgConf };
  }, [chapters, progress]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Chapter progress"
        title="Every chapter, ICAI-weighted."
        description="Track status, confidence, notes, and last-revised date for each chapter. Chapters with higher weightage are surfaced first."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <MiniStat label="Total chapters" value={stats.total} />
        <MiniStat label="Started" value={stats.started} />
        <MiniStat label="Mastered" value={stats.mastered} accent />
        <MiniStat label="Avg confidence" value={`${stats.avgConf}%`} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search chapter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={paperFilter} onValueChange={setPaperFilter}>
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

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading chapters…
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <EmptyState
          title="No chapters found"
          body="Try a different search or paper filter."
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([code, chs]) => {
            const paper = papers?.find((p) => p.code === code);
            return (
              <section key={code} className="rounded-2xl border border-border bg-card">
                <header className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Paper {code}
                    </div>
                    <div className="font-display text-lg font-semibold">
                      {paper?.name ?? code}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-gold border-gold/40">
                    {chs.length} chapters
                  </Badge>
                </header>
                <ul className="divide-y divide-border">
                  {chs.map((c) => {
                    const p = progressByChapter.get(c.id);
                    const status =
                      STATUS.find((s) => s.value === (p?.status ?? "not_started")) ??
                      STATUS[0];
                    return (
                      <li
                        key={c.id}
                        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          {p?.status === "mastered" ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-gold" />
                          ) : (
                            <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <div className="text-sm font-medium">{c.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {(c.weightage_min || c.weightage_max) && (
                                <span className="rounded-full bg-accent px-2 py-0.5 text-gold">
                                  {c.weightage_min ?? 0}–{c.weightage_max ?? 0}%
                                </span>
                              )}
                              <span>{status.label}</span>
                              {p?.last_revised_at && (
                                <span>
                                  · revised{" "}
                                  {format(new Date(p.last_revised_at), "MMM d")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden w-32 sm:block">
                            <Progress value={p?.confidence ?? 0} />
                            <div className="mt-1 text-right text-[10px] text-muted-foreground">
                              {p?.confidence ?? 0}% confidence
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing(c)}
                          >
                            <PenLine className="mr-1.5 h-3.5 w-3.5" /> Update
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <ChapterEditor
        chapter={editing}
        progress={editing ? progressByChapter.get(editing.id) : undefined}
        onClose={() => setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["chapter_progress"] });
        }}
      />
    </AppShell>
  );
}

function MiniStat({
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

function ChapterEditor({
  chapter,
  progress,
  onClose,
  onSaved,
}: {
  chapter: Chapter | null;
  progress?: ChapterProgress;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<string>(progress?.status ?? "not_started");
  const [confidence, setConfidence] = useState<number>(progress?.confidence ?? 0);
  const [notes, setNotes] = useState<string>(progress?.notes ?? "");

  // reset when chapter changes
  useMemo(() => {
    setStatus(progress?.status ?? "not_started");
    setConfidence(progress?.confidence ?? 0);
    setNotes(progress?.notes ?? "");
  }, [chapter?.id, progress?.id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!chapter) throw new Error("No chapter");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const payload = {
        chapter_id: chapter.id,
        user_id: user.id,
        status,
        confidence,
        notes: notes || null,
        last_revised_at:
          status === "revised" || status === "mastered"
            ? new Date().toISOString()
            : progress?.last_revised_at ?? null,
      };
      if (progress) {
        const { error } = await supabase
          .from("chapter_progress")
          .update(payload)
          .eq("id", progress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("chapter_progress")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Chapter updated");
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!chapter} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {chapter?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Confidence
              </label>
              <span className="text-sm font-medium text-gold">{confidence}%</span>
            </div>
            <Slider
              value={[confidence]}
              onValueChange={(v) => setConfidence(v[0])}
              max={100}
              step={5}
              className="mt-3"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Concepts to review, formulas to memorise, question types…"
              rows={4}
              className="mt-1.5"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-gold text-primary-foreground"
          >
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Save progress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
