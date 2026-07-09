import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReminderSettings {
  enabled: boolean;
  briefTime: string; // "HH:mm"
  sessionReminder: boolean;
  sessionLeadMinutes: number;
}

const KEY = "cun_reminder_settings";
export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  briefTime: "07:30",
  sessionReminder: true,
  sessionLeadMinutes: 10,
};

export function loadReminderSettings(): ReminderSettings {
  if (typeof window === "undefined") return DEFAULT_REMINDERS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_REMINDERS;
    return { ...DEFAULT_REMINDERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_REMINDERS;
  }
}

export function saveReminderSettings(s: ReminderSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

function notify(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: title });
  } catch {}
}

const FIRED_KEY = "cun_reminder_fired"; // JSON: { brief: "YYYY-MM-DD", tasks: { [id]: true } }

function getFired(): { brief?: string; tasks: Record<string, boolean> } {
  if (typeof window === "undefined") return { tasks: {} };
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{"tasks":{}}');
  } catch {
    return { tasks: {} };
  }
}
function setFired(v: { brief?: string; tasks: Record<string, boolean> }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FIRED_KEY, JSON.stringify(v));
}

/**
 * Local browser-based reminders. Fires while the app is open in a browser tab.
 * For real background push/email delivery a service worker + backend job is needed;
 * this hook covers the in-session reminder use case.
 */
export function useLocalReminders() {
  const { data: tasks } = useQuery({
    queryKey: ["reminder_tasks_today"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      return (
        (await supabase
          .from("tasks")
          .select("id,title,scheduled_date,scheduled_time,status")
          .eq("scheduled_date", today)).data ?? []
      );
    },
    refetchInterval: 5 * 60 * 1000,
  });

  useEffect(() => {
    const tick = () => {
      const settings = loadReminderSettings();
      if (!settings.enabled) return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = now.toISOString().slice(0, 10);
      const fired = getFired();

      // Daily brief reminder
      if (hhmm === settings.briefTime && fired.brief !== today) {
        notify("Daily Brief ready", "Open CA Unity Network to see your AI plan for today.");
        setFired({ ...fired, brief: today });
      }

      // Session reminders
      if (settings.sessionReminder && tasks) {
        for (const t of tasks as any[]) {
          if (!t.scheduled_time || t.status === "done") continue;
          if (fired.tasks[t.id]) continue;
          const [h, m] = String(t.scheduled_time).slice(0, 5).split(":").map(Number);
          if (Number.isNaN(h) || Number.isNaN(m)) continue;
          const target = new Date(now);
          target.setHours(h, m, 0, 0);
          const diffMin = Math.round((target.getTime() - now.getTime()) / 60000);
          if (diffMin <= settings.sessionLeadMinutes && diffMin >= 0) {
            notify("Next revision session soon", `${t.title} in ${diffMin} min`);
            fired.tasks[t.id] = true;
            setFired(fired);
          }
        }
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [tasks]);
}
