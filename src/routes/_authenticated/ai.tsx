import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Brain, Loader2, Sparkles, Target, Zap } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  diagnoseWeakChapters,
  generateRevisionPlan,
  getDailyBrief,
  getWeeklyReview,
} from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI Engine · PrepOS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AIPage,
});

function AIPage() {
  const { data: papers } = useQuery({
    queryKey: ["papers"],
    queryFn: async () =>
      (await supabase.from("papers").select("*").order("sort_order")).data ?? [],
  });

  const [paperCode, setPaperCode] = useState<string>("");
  const [windowDays, setWindowDays] = useState<"7" | "3" | "1">("7");
  const [output, setOutput] = useState<{ title: string; text: string } | null>(null);

  const briefFn = useServerFn(getDailyBrief);
  const reviewFn = useServerFn(getWeeklyReview);
  const planFn = useServerFn(generateRevisionPlan);
  const diagnoseFn = useServerFn(diagnoseWeakChapters);

  const brief = useMutation({
    mutationFn: async () => briefFn({ data: {} as never }),
    onSuccess: (r: any) => setOutput({ title: "Today's brief", text: r.brief }),
    onError: (e: Error) => toast.error(e.message),
  });
  const review = useMutation({
    mutationFn: async () => reviewFn({ data: {} as never }),
    onSuccess: (r: any) => setOutput({ title: "Weekly review", text: r.review }),
    onError: (e: Error) => toast.error(e.message),
  });
  const plan = useMutation({
    mutationFn: async () =>
      planFn({ data: { paperCode, windowDays: Number(windowDays) as 7 | 3 | 1 } }),
    onSuccess: (r: any) =>
      setOutput({
        title: `${r.windowDays}-day plan · ${r.paperCode.toUpperCase()}`,
        text: r.plan,
      }),
    onError: (e: Error) => toast.error(e.message),
  });
  const diagnose = useMutation({
    mutationFn: async () => diagnoseFn({ data: { paperCode: paperCode || undefined } }),
    onSuccess: (r: any) => setOutput({ title: "Weak-chapter diagnosis", text: r.diagnosis }),
    onError: (e: Error) => toast.error(e.message),
  });

  const anyPending =
    brief.isPending || review.isPending || plan.isPending || diagnose.isPending;

  return (
    <AppShell>
      <PageHeader
        eyebrow="AI Engine"
        title="Your plan, rewritten every day."
        description="ICAI-aware coaching from a system that reads your mocks, mistakes, confidence, and calendar."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          icon={Sparkles}
          title="Daily Brief"
          body="A morning brief tuned to your latest state."
          onClick={() => brief.mutate()}
          pending={brief.isPending}
          disabled={anyPending}
        />
        <ActionCard
          icon={Brain}
          title="Weekly Review"
          body="What worked, what slipped, next 7 days."
          onClick={() => review.mutate()}
          pending={review.isPending}
          disabled={anyPending}
        />
        <ActionCard
          icon={Target}
          title="Weak Chapters"
          body="Diagnose weaknesses from mocks + confidence."
          onClick={() => diagnose.mutate()}
          pending={diagnose.isPending}
          disabled={anyPending}
        />
        <ActionCard
          icon={Zap}
          title={windowDays === "1" ? "Rescue Mode" : "Revision Plan"}
          body={windowDays === "1" ? "Highest-yield only." : `Structured ${windowDays}-day plan.`}
          onClick={() => plan.mutate()}
          pending={plan.isPending}
          disabled={anyPending || !paperCode}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Paper (for plan / diagnosis)
          </label>
          <Select value={paperCode} onValueChange={setPaperCode}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choose paper" />
            </SelectTrigger>
            <SelectContent>
              {(papers ?? []).map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Window</label>
          <Select value={windowDays} onValueChange={(v) => setWindowDays(v as "7" | "3" | "1")}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="1">1 day · Rescue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gold/40 bg-hero p-6 shadow-glow">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
          <Sparkles className="h-3.5 w-3.5" /> {output?.title ?? "Output"}
        </div>
        {anyPending ? (
          <div className="mt-6 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
            Thinking through your data…
          </div>
        ) : output ? (
          <article className="prose prose-invert mt-4 max-w-none whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {output.text}
          </article>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Pick an action above. The engine reads your live profile, mocks, chapters, mistakes, and
            calendar — no need to paste anything.
          </p>
        )}
      </div>
    </AppShell>
  );
}

function ActionCard({
  icon: Icon,
  title,
  body,
  onClick,
  pending,
  disabled,
}: {
  icon: typeof Brain;
  title: string;
  body: string;
  onClick: () => void;
  pending: boolean;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group rounded-2xl border border-border bg-card p-5 text-left transition hover:border-gold/40 hover:shadow-elegant disabled:opacity-50 disabled:hover:border-border disabled:hover:shadow-none"
    >
      <div className="flex items-center justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-gold">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        </div>
      </div>
      <div className="mt-4 font-display text-base font-semibold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </button>
  );
}
