import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_REMINDERS,
  loadReminderSettings,
  saveReminderSettings,
  type ReminderSettings,
} from "@/hooks/use-reminders";
import { WHATSAPP_LINK } from "@/components/mentoring-card";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders · CA Unity Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RemindersPage,
});

function RemindersPage() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setSettings(loadReminderSettings());
    if (typeof window !== "undefined") {
      if (!("Notification" in window)) setPerm("unsupported");
      else setPerm(Notification.permission);
    }
  }, []);

  function update<K extends keyof ReminderSettings>(key: K, value: ReminderSettings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveReminderSettings(next);
  }

  async function requestPerm() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") toast.success("Notifications enabled");
    else toast.error("Notifications blocked — enable in browser settings");
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Stay on schedule"
        title="Reminders"
        description="Get nudged for your Daily Brief and revision sessions."
      />

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
          <Bell className="h-3.5 w-3.5" /> Browser reminders
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Reminders fire on your device while CA Unity Network is open in a browser tab.
          Allow notifications so we can nudge you on time.
        </p>

        <div className="mt-6 flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
          <div>
            <Label className="text-sm">Enable reminders</Label>
            <p className="text-xs text-muted-foreground">
              {perm === "granted"
                ? "Permission granted."
                : perm === "denied"
                  ? "Blocked — allow notifications in your browser settings."
                  : perm === "unsupported"
                    ? "This browser doesn't support notifications."
                    : "Click 'Allow notifications' below first."}
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(v) => update("enabled", v)}
            disabled={perm !== "granted"}
          />
        </div>

        {perm !== "granted" && perm !== "unsupported" && (
          <Button onClick={requestPerm} variant="outline" className="mt-3">
            Allow notifications
          </Button>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Daily Brief time
            </Label>
            <Input
              type="time"
              value={settings.briefTime}
              onChange={(e) => update("briefTime", e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Next revision session</Label>
              <Switch
                checked={settings.revisionEnabled}
                onCheckedChange={(v) => update("revisionEnabled", v)}
              />
            </div>
            <Input
              type="time"
              value={settings.revisionTime}
              onChange={(e) => update("revisionTime", e.target.value)}
              className="mt-2"
              disabled={!settings.revisionEnabled}
            />
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Want reliable email/push delivery even when the app is closed? That needs mentor-level
          setup — reach out for a hand.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-gold/40 bg-hero p-6 shadow-glow">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
          <MessageCircle className="h-3.5 w-3.5" /> Personal Mentoring
        </div>
        <h3 className="mt-3 font-display text-xl font-semibold">
          Need someone to hold you accountable?
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Book 1:1 mentoring with Ronil Dodhia on WhatsApp — +91 88288 28184.
        </p>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-primary-foreground shadow-elegant transition hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
        </a>
      </section>
    </AppShell>
  );
}
