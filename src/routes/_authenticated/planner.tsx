import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addDays, format, isBefore, parseISO, startOfToday } from "date-fns";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Planner · CA Unity Network" },
      { name: "description", content: "Plan your CA prep day by day — schedule tasks, track progress, and stay on top of chapters, mocks, and revisions." },
      { property: "og:title", content: "Planner · CA Unity Network" },
      { property: "og:description", content: "Plan your CA prep day by day — schedule tasks, track progress, and stay on top of chapters, mocks, and revisions." },
      { property: "og:url", content: "https://caunitynetwork.in/planner" },
    ],
    links: [{ rel: "canonical", href: "https://caunitynetwork.in/planner" }],
  }),

  component: PlannerPage,
});

const PRIORITIES = ["low", "medium", "high", "critical"] as const;
type Priority = (typeof PRIORITIES)[number];

function PlannerPage() {
  const qc = useQueryClient();
  const [dayOffset, setDayOffset] = useState(0);
  const [open, setOpen] = useState(false);

  const anchor = useMemo(() => addDays(startOfToday(), dayOffset), [dayOffset]);
  const anchorStr = format(anchor, "yyyy-MM-dd");

  const { data: papers } = useQuery({
    queryKey: ["papers"],
    queryFn: async () =>
      (await supabase.from("papers").select("*").order("sort_order")).data ?? [],
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () =>
      (await supabase.from("tasks").select("*").order("sort_order")).data ?? [],
  });

  const overdue = useMemo(
    () =>
      (tasks ?? []).filter(
        (t) =>
          t.status !== "done" &&
          t.status !== "skipped" &&
          t.scheduled_date &&
          isBefore(parseISO(t.scheduled_date), startOfToday()),
      ),
    [tasks],
  );

  const dayTasks = useMemo(
    () => (tasks ?? []).filter((t) => t.scheduled_date === anchorStr),
    [tasks, anchorStr],
  );

  const create = useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      paper_code: string | null;
      scheduled_date: string;
      duration_minutes: number | null;
      priority: Priority;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not signed in");
      const { error } = await supabase.from("tasks").insert({
        ...input,
        user_id: userRes.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Tables<"tasks">> & { id: string }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Deleted");
    },
  });

  const rescheduleAllOverdue = () => {
    overdue.forEach((t) =>
      update.mutate({ id: t.id, scheduled_date: format(startOfToday(), "yyyy-MM-dd") }),
    );
    toast.success(`Moved ${overdue.length} task${overdue.length === 1 ? "" : "s"} to today`);
  };

  const done = dayTasks.filter((t) => t.status === "done").length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Planner"
        title="Plan the day. Ship the plan."
        description="Priority-driven daily plans, recurring blocks, and automatic recovery for anything you slip on."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New task
              </Button>
            </DialogTrigger>
            <TaskDialog
              papers={papers ?? []}
              defaultDate={anchorStr}
              onSubmit={(v) => create.mutate(v)}
              submitting={create.isPending}
            />
          </Dialog>
        }
      />

      {overdue.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gold/40 bg-hero p-5 shadow-glow sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-gold">Rescue</div>
            <div className="mt-1 font-display text-lg font-semibold">
              You have {overdue.length} overdue task{overdue.length === 1 ? "" : "s"}.
            </div>
          </div>
          <Button variant="secondary" onClick={rescheduleAllOverdue}>
            Move all to today
          </Button>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => setDayOffset((d) => d - 1)} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : format(anchor, "EEEE")}
          </div>
          <div className="font-display text-lg font-semibold">{format(anchor, "MMM d, yyyy")}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {done}/{dayTasks.length} done
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setDayOffset((d) => d + 1)} className="gap-1">
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {dayTasks.length === 0 ? (
        <EmptyState
          title="No tasks scheduled"
          body="Add a task or ask the AI Engine to generate a plan for this day."
        />
      ) : (
        <ul className="space-y-2">
          {[...dayTasks]
            .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
            .map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
              >
                <Checkbox
                  checked={t.status === "done"}
                  onCheckedChange={(v) =>
                    update.mutate({
                      id: t.id,
                      status: v ? "done" : "pending",
                      completed_at: v ? new Date().toISOString() : null,
                    })
                  }
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={`font-medium ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}
                  >
                    {t.title}
                  </div>
                  {t.description && (
                    <div className="mt-1 text-sm text-muted-foreground">{t.description}</div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className="uppercase">
                      {t.priority}
                    </Badge>
                    {t.paper_code && <Badge variant="secondary">{t.paper_code.toUpperCase()}</Badge>}
                    {t.duration_minutes && (
                      <span className="text-muted-foreground">{t.duration_minutes} min</span>
                    )}
                    {t.ai_generated && (
                      <Badge className="bg-gold/20 text-gold hover:bg-gold/30">AI</Badge>
                    )}
                  </div>
                </div>
                <Select
                  value={t.priority}
                  onValueChange={(v) => update.mutate({ id: t.id, priority: v as Priority })}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    update.mutate({
                      id: t.id,
                      scheduled_date: format(addDays(parseISO(t.scheduled_date!), 1), "yyyy-MM-dd"),
                    })
                  }
                  title="Push to next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
        </ul>
      )}
    </AppShell>
  );
}

function priorityRank(p: string) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[p] ?? 0;
}

function TaskDialog({
  papers,
  defaultDate,
  onSubmit,
  submitting,
}: {
  papers: Tables<"papers">[];
  defaultDate: string;
  onSubmit: (v: {
    title: string;
    description: string;
    paper_code: string | null;
    scheduled_date: string;
    duration_minutes: number | null;
    priority: Priority;
  }) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [paperCode, setPaperCode] = useState<string>("none");
  const [date, setDate] = useState(defaultDate);
  const [duration, setDuration] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New task</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Revise AS-15" />
        </div>
        <div>
          <label className="text-sm font-medium">Notes</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Paper</label>
            <Select value={paperCode} onValueChange={setPaperCode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {papers.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Duration (min)</label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={!title.trim() || submitting}
          onClick={() =>
            onSubmit({
              title: title.trim(),
              description: description.trim(),
              paper_code: paperCode === "none" ? null : paperCode,
              scheduled_date: date,
              duration_minutes: duration ? Number(duration) : null,
              priority,
            })
          }
          className="gap-2"
        >
          <Check className="h-4 w-4" /> Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
