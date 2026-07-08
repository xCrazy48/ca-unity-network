import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/rtp-pyq")({
  head: () => ({
    meta: [
      { title: "RTP & PYQ · CA Unity Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RtpPyqPage,
});

const RTP_SESSIONS = [
  "May 2024",
  "Nov 2024",
  "May 2025",
  "Sep 2025",
  "Jan 2026",
  "May 2026",
];
const PYQ_SESSIONS = [
  "May 2024",
  "Nov 2024",
  "May 2025",
  "Sep 2025",
];

type Row = Tables<"rtp_pyq_progress">;

function RtpPyqPage() {
  const [kind, setKind] = useState<"rtp" | "pyq">("rtp");

  return (
    <AppShell>
      <PageHeader
        eyebrow="RTP & PYQ checklist"
        title="ICAI resources, mapped and ticked."
        description="Track every Revision Test Paper and Past Year Question set by paper and session. Never miss high-yield material."
      />

      <Tabs value={kind} onValueChange={(v) => setKind(v as "rtp" | "pyq")}>
        <TabsList className="mb-6">
          <TabsTrigger value="rtp">Revision Test Papers</TabsTrigger>
          <TabsTrigger value="pyq">Past Year Questions</TabsTrigger>
        </TabsList>
        <TabsContent value="rtp">
          <Grid kind="rtp" sessions={RTP_SESSIONS} />
        </TabsContent>
        <TabsContent value="pyq">
          <Grid kind="pyq" sessions={PYQ_SESSIONS} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Grid({ kind, sessions }: { kind: "rtp" | "pyq"; sessions: string[] }) {
  const qc = useQueryClient();
  const { data: papers } = useQuery({
    queryKey: ["papers"],
    queryFn: async () =>
      (await supabase.from("papers").select("*").order("sort_order")).data ?? [],
  });
  const { data: rows } = useQuery({
    queryKey: ["rtp_pyq_progress"],
    queryFn: async () =>
      (await supabase.from("rtp_pyq_progress").select("*")).data ?? [],
  });

  const byKey = useMemo(() => {
    const m = new Map<string, Row>();
    (rows ?? [])
      .filter((r) => r.kind === kind)
      .forEach((r) => m.set(`${r.paper_code}-${r.session}`, r));
    return m;
  }, [rows, kind]);

  const toggle = useMutation({
    mutationFn: async ({
      paper_code,
      session,
      current,
    }: {
      paper_code: string;
      session: string;
      current?: Row;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      if (current) {
        const { error } = await supabase
          .from("rtp_pyq_progress")
          .update({
            completed: !current.completed,
            completed_at: !current.completed ? new Date().toISOString() : null,
          })
          .eq("id", current.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rtp_pyq_progress").insert({
          user_id: user.id,
          paper_code,
          session,
          kind,
          completed: true,
          completed_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rtp_pyq_progress"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const totalCells = (papers?.length ?? 0) * sessions.length;
  const doneCells = Array.from(byKey.values()).filter((r) => r.completed).length;
  const pct = totalCells ? Math.round((doneCells / totalCells) * 100) : 0;

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {kind === "rtp" ? "RTP" : "PYQ"} coverage
          </span>
          <span className="font-display text-2xl font-semibold text-gold">
            {pct}%
          </span>
        </div>
        <Progress value={pct} />
        <div className="mt-2 text-xs text-muted-foreground">
          {doneCells} of {totalCells} cells complete
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 bg-card px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">
                Paper
              </th>
              {sessions.map((s) => (
                <th
                  key={s}
                  className="px-4 py-3 text-center text-xs uppercase tracking-wider text-muted-foreground"
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {papers?.map((p) => (
              <tr key={p.code} className="border-b border-border last:border-0">
                <td className="sticky left-0 bg-card px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-gold/40 text-gold"
                    >
                      {p.code}
                    </Badge>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {p.name.split(" ").slice(0, 3).join(" ")}
                    </span>
                  </div>
                </td>
                {sessions.map((s) => {
                  const cur = byKey.get(`${p.code}-${s}`);
                  return (
                    <td key={s} className="px-4 py-3 text-center">
                      <Checkbox
                        checked={cur?.completed ?? false}
                        onCheckedChange={() =>
                          toggle.mutate({
                            paper_code: p.code,
                            session: s,
                            current: cur,
                          })
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
