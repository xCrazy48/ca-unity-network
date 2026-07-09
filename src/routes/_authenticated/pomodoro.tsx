import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward, Shield, Flame } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { logFocusSession } from "@/lib/pomodoro.functions";

export const Route = createFileRoute("/_authenticated/pomodoro")({
  head: () => ({
    meta: [
      { title: "Pomodoro Focus Timer · CA Unity Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PomodoroPage,
});

type Phase = "focus" | "short" | "long";
const STORAGE_KEY = "cun_pomodoro_settings";

interface Settings {
  focus: number;
  short: number;
  long: number;
  cyclesBeforeLong: number;
  autoStart: boolean;
  sound: boolean;
  focusMode: boolean;
}

const DEFAULTS: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  cyclesBeforeLong: 4,
  autoStart: true,
  sound: true,
  focusMode: false,
};

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    o.start();
    o.stop(ctx.currentTime + 0.85);
  } catch {
    /* ignore */
  }
}

function PomodoroPage() {
  const qc = useQueryClient();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULTS.focus * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const endAtRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setSecondsLeft(s.focus * 60);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Timer tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (!endAtRef.current) return;
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(id);
        finishPhase(false);
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Focus Mode: interrupt on tab switch / minimize during a focus phase
  useEffect(() => {
    if (!settings.focusMode || !running || phase !== "focus") return;
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        interruptFocus();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.focusMode, running, phase]);

  const phaseMinutes = (p: Phase) =>
    p === "focus" ? settings.focus : p === "short" ? settings.short : settings.long;

  async function saveSession(actualSeconds: number, interrupted: boolean) {
    if (phase !== "focus" || actualSeconds < 30) return; // ignore tiny/break sessions
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("focus_sessions").insert({
        user_id: u.user.id,
        started_at: new Date(startedAtRef.current ?? Date.now() - actualSeconds * 1000).toISOString(),
        ended_at: new Date().toISOString(),
        planned_minutes: settings.focus,
        actual_seconds: actualSeconds,
        focus_mode: settings.focusMode,
        interrupted,
        phase: "focus",
      });
      if (!interrupted) {
        // XP: 1 per minute of focus, max 60
        const xp = Math.min(60, Math.round(actualSeconds / 60));
        await supabase.rpc("award_xp" as never, { _user_id: u.user.id, _amount: xp } as never);
      }
      qc.invalidateQueries({ queryKey: ["focus_stats"] });
      qc.invalidateQueries({ queryKey: ["user_xp"] });
    } catch (e) {
      console.error(e);
    }
  }

  function start() {
    endAtRef.current = Date.now() + secondsLeft * 1000;
    startedAtRef.current = Date.now() - (phaseMinutes(phase) * 60 - secondsLeft) * 1000;
    setRunning(true);
  }
  function pause() {
    setRunning(false);
    endAtRef.current = null;
  }
  function resetPhase() {
    pause();
    setSecondsLeft(phaseMinutes(phase) * 60);
    startedAtRef.current = null;
  }
  function switchPhase(next: Phase) {
    setPhase(next);
    setSecondsLeft(phaseMinutes(next) * 60);
    endAtRef.current = null;
    startedAtRef.current = null;
    setRunning(false);
  }

  function interruptFocus() {
    const actual = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0;
    saveSession(actual, true);
    setRunning(false);
    endAtRef.current = null;
    startedAtRef.current = null;
    setSecondsLeft(phaseMinutes(phase) * 60);
    toast.error("Focus Mode broken — session reset. Stay on this tab to keep the streak.");
  }

  function finishPhase(skipped: boolean) {
    if (phase === "focus") {
      const actual = startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : settings.focus * 60;
      saveSession(actual, skipped);
    }
    if (settings.sound && !skipped) beep();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(phase === "focus" ? "Focus done — take a break" : "Break over — back to it", {
        body: "CA Unity Network Pomodoro",
      });
    }
    let next: Phase;
    if (phase === "focus") {
      const done = cycles + 1;
      setCycles(done);
      next = done % settings.cyclesBeforeLong === 0 ? "long" : "short";
      if (!skipped) toast.success(`Focus complete · +${Math.min(60, settings.focus)} XP`);
    } else {
      next = "focus";
    }
    setPhase(next);
    const secs = phaseMinutes(next) * 60;
    setSecondsLeft(secs);
    startedAtRef.current = null;
    if (settings.autoStart && !skipped) {
      endAtRef.current = Date.now() + secs * 1000;
      startedAtRef.current = Date.now();
      setRunning(true);
    } else {
      setRunning(false);
      endAtRef.current = null;
    }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const total = phaseMinutes(phase) * 60;
  const pct = total > 0 ? ((total - secondsLeft) / total) * 100 : 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Deep work"
        title="Pomodoro Focus Timer"
        description="Fully customisable. Focus Mode ends the session the second you switch tabs — only clean focus counts."
      />

      <div className="mt-6">
        <StatsRow />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-8">
          <div className="flex flex-wrap justify-center gap-2">
            {(["focus", "short", "long"] as Phase[]).map((p) => (
              <button
                key={p}
                onClick={() => switchPhase(p)}
                className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-wider transition ${
                  phase === p
                    ? "bg-gold text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "focus" ? "Focus" : p === "short" ? "Short break" : "Long break"}
              </button>
            ))}
            {settings.focusMode && phase === "focus" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold">
                <Shield className="h-3 w-3" /> Focus Mode
              </span>
            )}
          </div>
          <div className="mt-8 grid place-items-center">
            <div className="relative grid h-64 w-64 place-items-center rounded-full border-4 border-border">
              <div
                className="absolute inset-0 rounded-full border-4 border-gold"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${
                    pct <= 25
                      ? `${50 + (pct / 25) * 50}% 0%`
                      : pct <= 50
                        ? `100% 0%, 100% ${((pct - 25) / 25) * 100}%`
                        : pct <= 75
                          ? `100% 0%, 100% 100%, ${100 - ((pct - 50) / 25) * 100}% 100%`
                          : `100% 0%, 100% 100%, 0% 100%, 0% ${100 - ((pct - 75) / 25) * 100}%`
                  })`,
                }}
              />
              <div className="text-center">
                <div className="font-display text-6xl font-semibold tabular-nums">
                  {mm}:{ss}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {phase === "focus" ? "Deep focus" : "Break"} · Cycle {cycles + (phase === "focus" ? 1 : 0)}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {!running ? (
              <Button onClick={start} className="bg-gold text-primary-foreground hover:opacity-90">
                <Play className="mr-2 h-4 w-4" /> Start
              </Button>
            ) : (
              <Button onClick={pause} variant="secondary">
                <Pause className="mr-2 h-4 w-4" /> Pause
              </Button>
            )}
            <Button onClick={resetPhase} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button onClick={() => finishPhase(true)} variant="outline">
              <SkipForward className="mr-2 h-4 w-4" /> Skip
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Customise</h3>
          <p className="mt-1 text-sm text-muted-foreground">All durations in minutes. Changes apply on the next phase.</p>
          <div className="mt-6 grid gap-4">
            <NumberField label="Focus duration" value={settings.focus} min={1} max={180} onChange={(v) => setSettings({ ...settings, focus: v })} />
            <NumberField label="Short break" value={settings.short} min={1} max={60} onChange={(v) => setSettings({ ...settings, short: v })} />
            <NumberField label="Long break" value={settings.long} min={1} max={120} onChange={(v) => setSettings({ ...settings, long: v })} />
            <NumberField label="Focus sessions before long break" value={settings.cyclesBeforeLong} min={1} max={12} onChange={(v) => setSettings({ ...settings, cyclesBeforeLong: v })} />

            <div className="flex items-center justify-between rounded-lg border border-gold/30 bg-gold/5 px-4 py-3">
              <div>
                <Label className="flex items-center gap-1.5 text-sm">
                  <Shield className="h-3.5 w-3.5 text-gold" /> Focus Mode
                </Label>
                <p className="text-xs text-muted-foreground">Session ends the moment you switch tabs. Only clean focus counts.</p>
              </div>
              <Switch checked={settings.focusMode} onCheckedChange={(v) => setSettings({ ...settings, focusMode: v })} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
              <div>
                <Label className="text-sm">Auto-start next phase</Label>
                <p className="text-xs text-muted-foreground">Flow into breaks and back automatically.</p>
              </div>
              <Switch checked={settings.autoStart} onCheckedChange={(v) => setSettings({ ...settings, autoStart: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
              <div>
                <Label className="text-sm">Sound alert</Label>
                <p className="text-xs text-muted-foreground">Chime at the end of each phase.</p>
              </div>
              <Switch checked={settings.sound} onCheckedChange={(v) => setSettings({ ...settings, sound: v })} />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (typeof window !== "undefined" && "Notification" in window) {
                  Notification.requestPermission().then((p) => {
                    if (p === "granted") toast.success("Desktop alerts enabled");
                  });
                }
              }}
            >
              Enable desktop alerts
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatsRow() {
  const { data: stats } = useQuery({
    queryKey: ["focus_stats"],
    queryFn: async () => {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startWeek = new Date(now.getTime() - 6 * 86400000).toISOString();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data } = await supabase
        .from("focus_sessions")
        .select("actual_seconds, interrupted, created_at")
        .gte("created_at", startMonth);
      const clean = (data ?? []).filter((s) => !s.interrupted);
      const sum = (arr: typeof clean) => arr.reduce((s, x) => s + (x.actual_seconds || 0), 0);
      return {
        today: Math.round(sum(clean.filter((s) => s.created_at >= startToday)) / 60),
        week: Math.round(sum(clean.filter((s) => s.created_at >= startWeek)) / 60),
        month: Math.round(sum(clean) / 60),
        sessions: clean.length,
      };
    },
  });
  const { data: xp } = useQuery({
    queryKey: ["user_xp"],
    queryFn: async () => (await supabase.from("user_xp").select("*").maybeSingle()).data,
  });

  const items = useMemo(
    () => [
      { label: "Today", value: `${stats?.today ?? 0}m` },
      { label: "This week", value: `${stats?.week ?? 0}m` },
      { label: "This month", value: `${stats?.month ?? 0}m` },
      { label: "Sessions", value: stats?.sessions ?? 0 },
      { label: "Streak", value: `${xp?.current_streak ?? 0}d`, icon: <Flame className="h-4 w-4 text-gold" /> },
      { label: "Longest", value: `${xp?.longest_streak ?? 0}d` },
      { label: "Level", value: xp?.level ?? 1 },
      { label: "XP", value: xp?.xp ?? 0 },
    ],
    [stats, xp],
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {i.icon}
            {i.label}
          </div>
          <div className="mt-1 font-display text-xl font-semibold">{i.value}</div>
        </div>
      ))}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="mt-1"
      />
    </div>
  );
}
