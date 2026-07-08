import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowRight, BookOpen, Trophy } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/papers")({
  head: () => ({
    meta: [
      { title: "Papers · CA Unity Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PapersPage,
});

function PapersPage() {
  const { data: papers } = useQuery({
    queryKey: ["papers"],
    queryFn: async () =>
      (await supabase.from("papers").select("*").order("sort_order")).data ?? [],
  });

  const { data: chapters } = useQuery({
    queryKey: ["chapters"],
    queryFn: async () =>
      (await supabase.from("chapters").select("*")).data ?? [],
  });

  const { data: progress } = useQuery({
    queryKey: ["chapter_progress"],
    queryFn: async () =>
      (await supabase.from("chapter_progress").select("*")).data ?? [],
  });

  const { data: mocks } = useQuery({
    queryKey: ["mock_tests"],
    queryFn: async () =>
      (await supabase.from("mock_tests").select("*")).data ?? [],
  });

  const rows = useMemo(() => {
    return (papers ?? []).map((paper) => {
      const chs = (chapters ?? []).filter((c) => c.paper_code === paper.code);
      const chIds = new Set(chs.map((c) => c.id));
      const pg = (progress ?? []).filter((p) => chIds.has(p.chapter_id));
      const mastered = pg.filter(
        (p) => p.status === "mastered" || p.status === "revised",
      ).length;
      const avgConf = pg.length
        ? Math.round(pg.reduce((s, p) => s + p.confidence, 0) / pg.length)
        : 0;
      const paperMocks = (mocks ?? []).filter((m) => m.paper_code === paper.code);
      const avgScore = paperMocks.length
        ? Math.round(
            (paperMocks.reduce(
              (s, m) => s + (Number(m.score) / Number(m.max_score)) * 100,
              0,
            ) /
              paperMocks.length),
          )
        : null;
      const coverage = chs.length ? Math.round((mastered / chs.length) * 100) : 0;
      return {
        paper,
        totalChapters: chs.length,
        mastered,
        avgConf,
        coverage,
        avgScore,
        mockCount: paperMocks.length,
      };
    });
  }, [papers, chapters, progress, mocks]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Paper-wise tracking"
        title="All six papers, one board."
        description="Coverage, confidence, and mock trend per paper. Click a paper to open its chapter-wise view."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {rows.map(({ paper, totalChapters, mastered, avgConf, coverage, avgScore, mockCount }) => (
          <Link
            key={paper.code}
            to="/chapters"
            className="group rounded-2xl border border-border bg-card p-6 transition hover:border-gold/40 hover:shadow-elegant"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Badge variant="outline" className="border-gold/40 text-gold">
                    Paper {paper.code}
                  </Badge>
                  <span>{paper.paper_group.replace("_", " ")}</span>
                </div>
                <h3 className="mt-2 font-display text-xl font-semibold">
                  {paper.name}
                </h3>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-gold" />
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Syllabus coverage</span>
                  <span className="font-medium">{coverage}%</span>
                </div>
                <Progress value={coverage} />
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {mastered} of {totalChapters} chapters revised or mastered
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <Stat icon={BookOpen} label="Chapters" value={totalChapters} />
                <Stat label="Avg confidence" value={`${avgConf}%`} />
                <Stat
                  icon={Trophy}
                  label={mockCount ? `Avg mock (${mockCount})` : "Mocks"}
                  value={avgScore !== null ? `${avgScore}%` : "—"}
                  accent
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon?: typeof BookOpen;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div
        className={`mt-1 font-display text-lg font-semibold ${accent ? "text-gold" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
