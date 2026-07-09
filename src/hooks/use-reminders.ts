import { useEffect } from "react";

export interface ReminderSettings {
  enabled: boolean;
  briefTime: string; // "HH:mm"
  revisionEnabled: boolean;
  revisionTime: string; // "HH:mm"
}

const KEY = "cun_reminder_settings";
export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  briefTime: "07:30",
  revisionEnabled: true,
  revisionTime: "18:00",
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

const FIRED_KEY = "cun_reminder_fired";
function getFired(): { brief?: string; revision?: string } {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function setFired(v: { brief?: string; revision?: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FIRED_KEY, JSON.stringify(v));
}

/**
 * Local in-browser reminders. Fires while the app is open.
 * Real push/email delivery needs a service worker + backend job — this covers
 * in-session prompts for Daily Brief and next revision block.
 */
export function useLocalReminders() {
  useEffect(() => {
    const tick = () => {
      const settings = loadReminderSettings();
      if (!settings.enabled) return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = now.toISOString().slice(0, 10);
      const fired = getFired();

      if (hhmm === settings.briefTime && fired.brief !== today) {
        notify("Daily Brief ready", "Open CA Unity Network to see your AI plan for today.");
        setFired({ ...fired, brief: today });
      }

      if (
        settings.revisionEnabled &&
        hhmm === settings.revisionTime &&
        fired.revision !== today
      ) {
        notify("Revision session time", "Time for your next revision block. Start a Pomodoro.");
        setFired({ ...fired, revision: today });
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
}
