import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Trash2,
  Sparkles,
  Loader2,
  Target,
  TrendingUp,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeMockFromUpload,
  saveManualMock,
  deleteMockAnalysis,
} from "@/lib/mock-analyzer.functions";

export const Route = createFileRoute("/_authenticated/mock-analyzer")({
  head: () => ({
    meta: [
      { title: "AI Mock Analyzer · CA Unity Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MockAnalyzerPage,
});

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

function MockAnalyzerPage() {
  const qc = useQueryClient();
  const analyzeFn = useServerFn(analyzeMockFromUpload);
  const manualFn = useServerFn(saveManualMock);
  const deleteFn = useServerFn(deleteMockAnalysis);

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["mock_analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_analyses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = analyses.find((a) => a.id === selectedId) ?? analyses[0];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Free · AI-powered"
        title="AI Mock Analyzer"
        description="Upload a scorecard, PDF, or screenshot — the AI extracts every metric and generates your dashboard. Or enter marks manually."
      />

      <Tabs defaultValue="upload" className="mt-6">
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="mr-1.5 h-4 w-4" /> Upload
          </TabsTrigger>
          <TabsTrigger value="manual">Manual entry</TabsTrigger>
          <TabsTrigger value="history">History ({analyses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <UploadPanel analyzeFn={analyzeFn} onDone={(id) => { setSelectedId(id); qc.invalidateQueries({ queryKey: ["mock_analyses"] }); }} />
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <ManualPanel manualFn={manualFn} onDone={(id) => { setSelectedId(id); qc.invalidateQueries({ queryKey: ["mock_analyses"] }); }} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {isLoading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : analyses.length === 0 ? (
            <EmptyState title="No analyses yet" body="Upload a mock result or enter marks manually to get started." />
          ) : (
            <ul className="space-y-2">
              {analyses.map((a) => (
                <li
                  key={a.id}
                  className={`flex items-center justify-between rounded-xl border p-4 transition ${
                    selected?.id === a.id ? "border-gold bg-card" : "border-border bg-card/60 hover:bg-card"
                  }`}
                >
                  <button className="flex-1 text-left" onClick={() => setSelectedId(a.id)}>
                    <div className="font-medium">{a.test_name ?? "Untitled mock"}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(a.created_at), "MMM d, yyyy")} · {a.source} ·{" "}
                      {a.overall_score ?? "?"} / {a.max_score ?? "?"}
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-display text-xl font-semibold text-gold">
                        {a.readiness_score ?? "—"}%
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Readiness</div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm("Delete this analysis?")) return;
                        try {
                          await deleteFn({ data: { id: a.id } });
                          toast.success("Deleted");
                          qc.invalidateQueries({ queryKey: ["mock_analyses"] });
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {selected && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl font-semibold">
            {selected.test_name ?? "Latest analysis"}
          </h2>
          <ResultView a={selected} />
        </section>
      )}
    </AppShell>
  );
}

function UploadPanel({
  analyzeFn,
  onDone,
}: {
  analyzeFn: (o: { data: { file_path: string; file_mime: string; test_name?: string | null; paper_code?: string | null } }) => Promise<{ id: string }>;
  onDone: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [testName, setTestName] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const ts = Date.now();
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${u.user.id}/${ts}-${safe}`;
      const up = await supabase.storage.from("mock-uploads").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (up.error) throw up.error;
      const res = await analyzeFn({
        data: { file_path: path, file_mime: file.type, test_name: testName || null },
      });
      toast.success("Analysis complete · +40 XP");
      onDone(res.id);
      setFile(null);
      setTestName("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to analyse");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Test name (optional)</Label>
          <Input
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="e.g. ICAI Series 1 · Paper 1"
            className="mt-1"
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border-2 border-dashed border-border/70 bg-background/40 p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm">
          Upload a scorecard PDF, screenshot, or scanned result. AI extracts scores, accuracy, weak areas, and readiness.
        </p>
        <Input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="mx-auto mt-4 max-w-xs"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && (
          <p className="mt-2 text-xs text-muted-foreground">
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </p>
        )}
        <Button
          disabled={!file || busy}
          onClick={run}
          className="mt-5 bg-gold text-primary-foreground hover:opacity-90"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analysing…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Analyse My Mock
            </>
          )}
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Files are stored privately and only visible to you. Free forever.
      </p>
    </div>
  );
}

function ManualPanel({
  manualFn,
  onDone,
}: {
  manualFn: (o: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  onDone: (id: string) => void;
}) {
  const [f, setF] = useState({
    test_name: "",
    paper_code: "",
    overall_score: "",
    max_score: "100",
    attempted: "",
    correct: "",
    incorrect: "",
    unattempted: "",
    time_taken_minutes: "",
    weak_areas_text: "",
  });
  const [busy, setBusy] = useState(false);

  const num = (v: string) => (v === "" ? null : Number(v));
  const submit = async () => {
    if (!f.test_name || !f.overall_score) {
      toast.error("Test name and overall score required");
      return;
    }
    setBusy(true);
    try {
      const res = await manualFn({
        data: {
          test_name: f.test_name,
          paper_code: f.paper_code || null,
          overall_score: Number(f.overall_score),
          max_score: Number(f.max_score),
          attempted: num(f.attempted),
          correct: num(f.correct),
          incorrect: num(f.incorrect),
          unattempted: num(f.unattempted),
          time_taken_minutes: num(f.time_taken_minutes),
          weak_areas_text: f.weak_areas_text,
        },
      });
      toast.success("Saved · +25 XP");
      onDone(res.id);
      setF({ ...f, test_name: "", overall_score: "", weak_areas_text: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const g = (k: keyof typeof f) => f[k];
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Test name</Label>
          <Input value={g("test_name")} onChange={(e) => set("test_name", e.target.value)} className="mt-1" placeholder="MTP March 2026 · Paper 1" />
        </div>
        <div>
          <Label>Paper code (optional)</Label>
          <Input value={g("paper_code")} onChange={(e) => set("paper_code", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Overall score</Label>
          <Input type="number" value={g("overall_score")} onChange={(e) => set("overall_score", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Max score</Label>
          <Input type="number" value={g("max_score")} onChange={(e) => set("max_score", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Attempted</Label>
          <Input type="number" value={g("attempted")} onChange={(e) => set("attempted", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Correct</Label>
          <Input type="number" value={g("correct")} onChange={(e) => set("correct", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Incorrect</Label>
          <Input type="number" value={g("incorrect")} onChange={(e) => set("incorrect", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Unattempted</Label>
          <Input type="number" value={g("unattempted")} onChange={(e) => set("unattempted", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Time taken (min)</Label>
          <Input type="number" value={g("time_taken_minutes")} onChange={(e) => set("time_taken_minutes", e.target.value)} className="mt-1" />
        </div>
      </div>
      <div className="mt-4">
        <Label>Weak areas (comma separated)</Label>
        <Textarea rows={2} value={g("weak_areas_text")} onChange={(e) => set("weak_areas_text", e.target.value)} className="mt-1" placeholder="Amalgamation, Cash flow, IND AS 115" />
      </div>
      <Button disabled={busy} onClick={submit} className="mt-6 bg-gold text-primary-foreground hover:opacity-90">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Save & build dashboard
      </Button>
    </div>
  );
}

function ResultView({ a }: { a: Record<string, unknown> }) {
  const num = (k: string) => (a[k] as number | null) ?? null;
  const arr = <T,>(k: string) => (a[k] as T[]) ?? [];
  const readiness = num("readiness_score");
  const acc = num("accuracy");
  const pct = num("overall_score") != null && num("max_score")
    ? Math.round((Number(a.overall_score) / Number(a.max_score)) * 100)
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <Kpi icon={<Target className="h-4 w-4" />} label="Overall" value={pct != null ? `${pct}%` : "—"} />
      <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Readiness" value={readiness != null ? `${readiness}%` : "—"} accent />
      <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Accuracy" value={acc != null ? `${Math.round(acc)}%` : "—"} />
      <Kpi icon={<Clock className="h-4 w-4" />} label="Time" value={num("time_taken_minutes") != null ? `${num("time_taken_minutes")}m` : "—"} />

      <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Question breakdown</h3>
        <div className="grid grid-cols-3 gap-3">
          <MiniStat icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Correct" value={num("correct") ?? "—"} />
          <MiniStat icon={<XCircle className="h-4 w-4 text-red-500" />} label="Incorrect" value={num("incorrect") ?? "—"} />
          <MiniStat icon={<MinusCircle className="h-4 w-4 text-muted-foreground" />} label="Skipped" value={num("unattempted") ?? "—"} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Subject scores</h3>
        {arr<{ name: string; score: number; max: number }>("subject_scores").length === 0 ? (
          <p className="text-sm text-muted-foreground">Not captured.</p>
        ) : (
          <ul className="space-y-2">
            {arr<{ name: string; score: number; max: number }>("subject_scores").map((s, i) => {
              const p = s.max ? Math.round((s.score / s.max) * 100) : 0;
              return (
                <li key={i}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">{s.score}/{s.max} · {p}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gold" style={{ width: `${p}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ListPanel title="Weak areas" items={arr<string>("weak_areas")} tone="warn" />
      <ListPanel title="Strong areas" items={arr<string>("strong_areas")} tone="good" />
      <ListPanel title="Improvement suggestions" items={arr<string>("improvement_suggestions")} className="lg:col-span-2" />

      {arr<{ chapter: string; accuracy: number | null; notes: string | null }>("chapter_performance").length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Chapter-wise performance</h3>
          <ul className="grid gap-2 md:grid-cols-2">
            {arr<{ chapter: string; accuracy: number | null; notes: string | null }>("chapter_performance").map((c, i) => (
              <li key={i} className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.chapter}</span>
                  {c.accuracy != null && <span className="text-xs text-gold">{Math.round(c.accuracy)}%</span>}
                </div>
                {c.notes && <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-2 font-display text-3xl font-semibold ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}
function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-display text-xl font-semibold">{value}</div>
    </div>
  );
}
function ListPanel({ title, items, tone, className }: { title: string; items: string[]; tone?: "good" | "warn"; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className ?? ""}`}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None captured.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {items.map((x, i) => (
            <li key={i} className="flex gap-2">
              <span className={tone === "warn" ? "text-red-500" : tone === "good" ? "text-emerald-500" : "text-gold"}>•</span>
              <span>{x}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
