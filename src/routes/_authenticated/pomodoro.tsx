import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/pomodoro")({
  head: () => ({
    meta: [
      { title: "Pomodoro Timer · CA Unity Network" },
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
}

const DEFAULTS: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  cyclesBeforeLong: 4,
  autoStart: true,
  sound: true,
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
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  } catch {}
}

function PomodoroPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULTS.focus * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0); // completed focus sessions
  const endAtRef = useRef<number | null>(null);

  // Hydrate settings on client
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setSecondsLeft(s.focus * 60);
  }, []);

  // Persist settings
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
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
        finishPhase();
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const phaseMinutes = (p: Phase) =>
    p === "focus" ? settings.focus : p === "short" ? settings.short : settings.long;

  function start() {
    endAtRef.current = Date.now() + secondsLeft * 1000;
    setRunning(true);
  }
  function pause() {
    setRunning(false);
    endAtRef.current = null;
  }
  function resetPhase() {
    pause();
    setSecondsLeft(phaseMinutes(phase) * 60);
  }
  function switchPhase(next: Phase) {
    setPhase(next);
    setSecondsLeft(phaseMinutes(next) * 60);
    endAtRef.current = null;
    setRunning(false);
  }
  function finishPhase() {
    if (settings.sound) beep();
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
      toast.success(`Focus complete — ${next === "long" ? "long" : "short"} break`);
    } else {
      next = "focus";
      toast.success("Break over — let's focus");
    }
    setPhase(next);
    const secs = phaseMinutes(next) * 60;
    setSecondsLeft(secs);
    if (settings.autoStart) {
      endAtRef.current = Date.now() + secs * 1000;
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
        icon={Timer}
        eyebrow="Deep work"
        title="Pomodoro Timer"
        subtitle="Fully customisable focus + break intervals. Your settings save automatically."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-8">
          <div className="flex justify-center gap-2">
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
            <Button onClick={finishPhase} variant="outline">
              <SkipForward className="mr-2 h-4 w-4" /> Skip
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Customise</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            All durations in minutes. Changes apply on the next phase.
          </p>
          <div className="mt-6 grid gap-4">
            <NumberField
              label="Focus duration"
              value={settings.focus}
              min={1}
              max={180}
              onChange={(v) => setSettings({ ...settings, focus: v })}
            />
            <NumberField
              label="Short break"
              value={settings.short}
              min={1}
              max={60}
              onChange={(v) => setSettings({ ...settings, short: v })}
            />
            <NumberField
              label="Long break"
              value={settings.long}
              min={1}
              max={120}
              onChange={(v) => setSettings({ ...settings, long: v })}
            />
            <NumberField
              label="Focus sessions before long break"
              value={settings.cyclesBeforeLong}
              min={1}
              max={12}
              onChange={(v) => setSettings({ ...settings, cyclesBeforeLong: v })}
            />
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
              <div>
                <Label className="text-sm">Auto-start next phase</Label>
                <p className="text-xs text-muted-foreground">Flow into breaks and back automatically.</p>
              </div>
              <Switch
                checked={settings.autoStart}
                onCheckedChange={(v) => setSettings({ ...settings, autoStart: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
              <div>
                <Label className="text-sm">Sound alert</Label>
                <p className="text-xs text-muted-foreground">Chime at the end of each phase.</p>
              </div>
              <Switch
                checked={settings.sound}
                onCheckedChange={(v) => setSettings({ ...settings, sound: v })}
              />
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
