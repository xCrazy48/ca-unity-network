import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { CheckCircle2, Plus, Search, Sparkles, Trash2 } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/formulas")({
  head: () => ({
    meta: [
      { title: "Formula Vault · CA Unity Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FormulasPage,
});

function nextInterval(confidence: number) {
  // spaced-repetition intervals in days based on confidence 0-100
  if (confidence >= 90) return 21;
  if (confidence >= 75) return 10;
  if (confidence >= 50) return 5;
  if (confidence >= 25) return 3;
  return 1;
}

function FormulasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [paperFilter, setPaperFilter] = useState("all");

  const { data: papers } = useQuery({
    queryKey: ["papers"],
    queryFn: async () =>
      (await supabase.from("papers").select("*").order("sort_order")).data ?? [],
  });
  const { data: chapters } = useQuery({
    queryKey: ["chapters"],
    queryFn: async () =>
      (await supabase.from("chapters").select("*").order("sort_order")).data ?? [],
  });
  const { data: formulas } = useQuery({
    queryKey: ["formulas"],
    queryFn: async () =>
      (
        await supabase
          .from("formulas")
          .select("*")
          .order("next_revision_date", { ascending: true, nullsFirst: false })
      ).data ?? [],
  });

  const filtered = useMemo(() => {
    return (formulas ?? []).filter((f) => {
      if (paperFilter !== "all" && f.paper_code !== paperFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !f.title.toLowerCase().includes(q) &&
          !f.body.toLowerCase().includes(q) &&
          !(f.tags ?? []).some((t) => t.toLowerCase().includes(q))
        )
          return false;
      }
      return true;
    });
  }, [formulas, paperFilter, search]);

  const dueToday = (formulas ?? []).filter(
    (f) => f.next_revision_date && new Date(f.next_revision_date) <= new Date(),
  ).length;

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("formulas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["formulas"] });
    },
  });

  const revise = useMutation({
    mutationFn: async ({ id, confidence }: { id: string; confidence: number }) => {
      const days = nextInterval(confidence);
      const { error } = await supabase
        .from("formulas")
        .update({
          confidence,
          last_revised_at: new Date().toISOString(),
          revision_interval_days: days,
          next_revision_date: addDays(new Date(), days).toISOString().slice(0, 10),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked revised");
      qc.invalidateQueries({ queryKey: ["formulas"] });
    },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Formula & concept vault"
        title="Everything you'd blank on, one page."
        description="Formulas, definitions, standard entries, and rules — with spaced repetition so nothing decays before the exam."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gold text-primary-foreground">
                <Plus className="mr-1.5 h-4 w-4" /> Add formula
              </Button>
            </DialogTrigger>
            <FormulaForm
              onDone={() => setOpen(false)}
              papers={papers ?? []}
              chapters={chapters ?? []}
            />
          </Dialog>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Formulas" value={formulas?.length ?? 0} />
        <Stat label="Due today" value={dueToday} accent />
        <Stat
          label="Avg confidence"
          value={
            formulas && formulas.length
              ? `${Math.round(formulas.reduce((s, f) => s + f.confidence, 0) / formulas.length)}%`
              : "—"
          }
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search formulas, tags…"
            className="pl-9"
          />
        </div>
        <Select value={paperFilter} onValueChange={setPaperFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
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

      {filtered.length === 0 ? (
        <EmptyState
          title="Vault is empty"
          body="Every formula you save gets a review date. When it comes due, we surface it in your daily brief."
          action={
            <Button onClick={() => setOpen(true)} className="bg-gold text-primary-foreground">
              <Plus className="mr-1.5 h-4 w-4" /> Add formula
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((f) => {
            const due =
              f.next_revision_date &&
              new Date(f.next_revision_date) <= new Date();
            return (
              <article
                key={f.id}
                className={`rounded-2xl border p-5 ${due ? "border-gold/40 bg-hero" : "border-border bg-card"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {f.paper_code && (
                        <Badge variant="outline" className="border-gold/40 text-gold">
                          {f.paper_code}
                        </Badge>
                      )}
                      {(f.tags ?? []).map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(f.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-background/60 p-4 font-mono text-sm leading-relaxed">
                  {f.body}
                </pre>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {f.last_revised_at
                      ? `Last revised ${format(new Date(f.last_revised_at), "MMM d")}`
                      : "Never revised"}
                    {f.next_revision_date && ` · Next ${format(new Date(f.next_revision_date), "MMM d")}`}
                  </div>
                  <ReviewButton
                    initial={f.confidence}
                    onRevise={(c) => revise.mutate({ id: f.id, confidence: c })}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function ReviewButton({
  initial,
  onRevise,
}: {
  initial: number;
  onRevise: (c: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [conf, setConf] = useState(initial);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Revise
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">How confident?</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Confidence
            </span>
            <span className="font-display text-2xl font-semibold text-gold">
              {conf}%
            </span>
          </div>
          <Slider value={[conf]} onValueChange={(v) => setConf(v[0])} max={100} step={5} />
          <p className="mt-4 text-xs text-muted-foreground">
            Next review in {nextInterval(conf)} days.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onRevise(conf);
              setOpen(false);
            }}
            className="bg-gold text-primary-foreground"
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark revised
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
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

function FormulaForm({
  onDone,
  papers,
  chapters,
}: {
  onDone: () => void;
  papers: Tables<"papers">[];
  chapters: Tables<"chapters">[];
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [paperCode, setPaperCode] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");
  const [tags, setTags] = useState("");

  const filteredChapters = chapters.filter((c) => !paperCode || c.paper_code === paperCode);

  const save = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("formulas").insert({
        user_id: user.id,
        title,
        body,
        paper_code: paperCode || null,
        chapter_id: chapterId || null,
        tags: tags
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : null,
        next_revision_date: addDays(new Date(), 1).toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Formula saved");
      qc.invalidateQueries({ queryKey: ["formulas"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">Add formula</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. WACC formula"
          />
        </Field>
        <Field label="Body">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="font-mono"
            placeholder="WACC = (E/V × Re) + (D/V × Rd × (1 − Tc))"
          />
        </Field>
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
        <Field label="Tags (comma-separated)">
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="ratios, costing, high-yield"
          />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          onClick={() => save.mutate()}
          disabled={!title || !body || save.isPending}
          className="bg-gold text-primary-foreground"
        >
          Save formula
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
