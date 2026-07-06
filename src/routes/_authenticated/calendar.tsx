import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Exam Calendar · PrepOS" }, { name: "robots", content: "noindex" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const qc = useQueryClient();
  const [scheduleType, setScheduleType] = useState<"3_day" | "6_day">("3_day");
  const [dates, setDates] = useState<Record<string, string>>({});

  const { data: papers } = useQuery({
    queryKey: ["papers"],
    queryFn: async () => (await supabase.from("papers").select("*").order("sort_order")).data ?? [],
  });
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data,
  });
  const { data: config } = useQuery({
    queryKey: ["exam_config"],
    queryFn: async () => (await supabase.from("exam_config").select("*").maybeSingle()).data,
  });

  useEffect(() => {
    if (config) {
      setScheduleType((config.schedule_type as "3_day" | "6_day") ?? "3_day");
      setDates((config.paper_dates as Record<string, string>) ?? {});
    }
  }, [config]);

  const filtered = papers?.filter((p) => {
    if (!profile?.exam_group || profile.exam_group === "both") return true;
    return p.paper_group === profile.exam_group;
  }) ?? [];

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("exam_config").upsert({
      user_id: u.user!.id,
      schedule_type: scheduleType,
      paper_dates: dates,
    });
    if (error) return toast.error(error.message);
    toast.success("Calendar saved");
    qc.invalidateQueries({ queryKey: ["exam_config"] });
  };

  return (
    <AppShell>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold">Exam calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Editable dates for every paper. Countdown updates everywhere.
          </p>
        </div>
        <button
          onClick={save}
          className="rounded-lg bg-gold px-5 py-2 text-sm font-medium text-primary-foreground shadow-elegant"
        >
          Save
        </button>
      </div>

      <div className="mt-6 inline-flex rounded-lg border border-border p-1">
        {(["3_day", "6_day"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setScheduleType(t)}
            className={`rounded-md px-4 py-1.5 text-sm ${
              scheduleType === t ? "bg-gold text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t === "3_day" ? "3-day schedule" : "6-day schedule"}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {filtered.map((p) => {
          const date = dates[p.code];
          const days = date ? differenceInCalendarDays(new Date(date), new Date()) : null;
          return (
            <div key={p.code} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {p.paper_group.replace("_", " ")}
                  </div>
                  <div className="mt-1 font-display text-lg font-semibold">{p.name}</div>
                </div>
                <CalendarClock className="h-5 w-5 text-gold" />
              </div>
              <input
                type="date"
                value={date ?? ""}
                onChange={(e) => setDates({ ...dates, [p.code]: e.target.value })}
                className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gold"
              />
              {days !== null && days >= 0 && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <span className="font-display text-2xl font-semibold text-gold">{days}</span>{" "}
                  days · {format(new Date(date!), "EEE, MMM d, yyyy")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
