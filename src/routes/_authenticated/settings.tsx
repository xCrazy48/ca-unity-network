import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, KeyRound, LogOut, Bell, Palette, Copy, Check } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { generateRecoveryCodes, setTwoFactorFlag } from "@/lib/two-factor.functions";
import { logoutAllDevices } from "@/lib/activity.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · CA Unity Network" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

type Settings = {
  theme: string;
  email_notifications: boolean;
  push_notifications: boolean;
  reminder_daily_brief: boolean;
  reminder_revision: boolean;
  two_factor_enabled: boolean;
  remember_me: boolean;
};

function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"security" | "notifications" | "sessions">("security");

  useEffect(() => {
    supabase.from("user_settings").select("*").maybeSingle().then(({ data }) => {
      if (data) setSettings(data as never);
    });
  }, []);

  const patch = async (partial: Partial<Settings>) => {
    if (!settings) return;
    setSaving(true);
    const next = { ...settings, ...partial };
    setSettings(next);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: u.user.id, ...next } as never);
    setSaving(false);
    if (error) toast.error(error.message);
  };

  if (!settings) return <AppShell><div className="text-muted-foreground">Loading settings…</div></AppShell>;

  return (
    <AppShell>
      <h1 className="font-display text-4xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your security, notifications, and sessions.</p>

      <div className="mt-6 flex gap-2 border-b border-border">
        {(["security", "notifications", "sessions"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm capitalize border-b-2 ${
              tab === k ? "border-gold text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "security" && <SecurityTab settings={settings} patch={patch} saving={saving} />}
        {tab === "notifications" && <NotificationsTab settings={settings} patch={patch} />}
        {tab === "sessions" && <SessionsTab />}
      </div>
    </AppShell>
  );
}

function SecurityTab({ settings, patch, saving }: { settings: Settings; patch: (p: Partial<Settings>) => void; saving: boolean }) {
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const setFlag = useServerFn(setTwoFactorFlag);
  const genCodes = useServerFn(generateRecoveryCodes);

  const start2FA = async () => {
    // Clean up any half-enrolled factors first
    const factors = await supabase.auth.mfa.listFactors();
    if (factors.data) {
      for (const f of factors.data.all) {
        if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `CA Unity ${Date.now()}` });
    if (error) return toast.error(error.message);
    setFactorId(data.id);
    setOtpauth(data.totp.uri);
    setSecret(data.totp.secret);
    const ch = await supabase.auth.mfa.challenge({ factorId: data.id });
    if (ch.error) return toast.error(ch.error.message);
    setChallengeId(ch.data.id);
  };

  const verify2FA = async () => {
    if (!factorId || !challengeId) return;
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    if (error) return toast.error(error.message);

    await setFlag({ data: { enabled: true } });
    const res = await genCodes();
    setRecoveryCodes(res.codes);
    setOtpauth(null);
    setFactorId(null);
    setChallengeId(null);
    setCode("");
    toast.success("Two-factor authentication enabled. Save your recovery codes.");
  };

  const disable2FA = async () => {
    const factors = await supabase.auth.mfa.listFactors();
    if (factors.data?.all) {
      for (const f of factors.data.all) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    await setFlag({ data: { enabled: false } });
    setRecoveryCodes(null);
    toast.success("Two-factor authentication disabled");
  };

  const regenerateCodes = async () => {
    const res = await genCodes();
    setRecoveryCodes(res.codes);
    toast.success("New recovery codes generated");
  };

  const copyCodes = () => {
    if (!recoveryCodes) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <Card icon={<ShieldCheck className="h-4 w-4" />} title="Two-Factor Authentication" desc="Use Google Authenticator, Authy or 1Password for a 6-digit code on sign-in.">
        {!settings.two_factor_enabled && !otpauth && (
          <button onClick={start2FA} className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-primary-foreground">
            Enable 2FA
          </button>
        )}

        {otpauth && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground mb-3">Scan this QR code in your authenticator app:</p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <div className="rounded-lg bg-white p-3">
                  <QRCodeSVG value={otpauth} size={160} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Or enter this code manually:</p>
                  <code className="block break-all rounded bg-muted p-2 text-xs">{secret}</code>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Enter the 6-digit code from your app</label>
              <div className="mt-2 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className="w-40 rounded-lg border border-input bg-background px-3 py-2 text-lg font-mono tracking-widest outline-none focus:ring-2 focus:ring-gold"
                />
                <button onClick={verify2FA} disabled={code.length !== 6} className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  Verify & enable
                </button>
              </div>
            </div>
          </div>
        )}

        {settings.two_factor_enabled && !otpauth && (
          <div className="flex flex-wrap gap-2">
            <button onClick={regenerateCodes} className="rounded-lg border border-border px-4 py-2 text-sm">
              Regenerate recovery codes
            </button>
            <button onClick={disable2FA} className="rounded-lg border border-destructive/50 px-4 py-2 text-sm text-destructive">
              Disable 2FA
            </button>
          </div>
        )}

        {recoveryCodes && (
          <div className="mt-4 rounded-lg border border-gold/40 bg-gold/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Recovery codes — save these now</p>
              <button onClick={copyCodes} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy all</>}
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Each code works exactly once. Store them somewhere safe — they're your only way in if you lose your phone.</p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {recoveryCodes.map((c) => <div key={c} className="rounded bg-background p-2">{c}</div>)}
            </div>
          </div>
        )}
      </Card>

      <Card icon={<KeyRound className="h-4 w-4" />} title="Password" desc="Change your password via the reset email flow.">
        <button
          onClick={async () => {
            const { data: u } = await supabase.auth.getUser();
            if (!u.user?.email) return;
            const { error } = await supabase.auth.resetPasswordForEmail(u.user.email, {
              redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) toast.error(error.message);
            else toast.success("Password reset email sent");
          }}
          className="rounded-lg border border-border px-4 py-2 text-sm"
        >
          Send password reset email
        </button>
      </Card>

      <Card icon={<Palette className="h-4 w-4" />} title="Remember me" desc="Stay signed in on this device longer.">
        <Toggle checked={settings.remember_me} onChange={(v) => patch({ remember_me: v })} disabled={saving} label="Enabled" />
      </Card>
    </div>
  );
}

function NotificationsTab({ settings, patch }: { settings: Settings; patch: (p: Partial<Settings>) => void }) {
  return (
    <div className="space-y-6">
      <Card icon={<Bell className="h-4 w-4" />} title="Notifications" desc="Choose how CA Unity keeps you on track.">
        <Toggle checked={settings.email_notifications} onChange={(v) => patch({ email_notifications: v })} label="Email notifications" />
        <Toggle checked={settings.push_notifications} onChange={(v) => patch({ push_notifications: v })} label="Push notifications" />
        <Toggle checked={settings.reminder_daily_brief} onChange={(v) => patch({ reminder_daily_brief: v })} label="Daily brief reminder" />
        <Toggle checked={settings.reminder_revision} onChange={(v) => patch({ reminder_revision: v })} label="Revision session reminders" />
      </Card>
    </div>
  );
}

function SessionsTab() {
  const navigate = useNavigate();
  const logoutAll = useServerFn(logoutAllDevices);
  const [history, setHistory] = useState<Array<{ id: string; event_type: string; provider: string | null; device: string | null; browser: string | null; os: string | null; country: string | null; created_at: string }>>([]);

  useEffect(() => {
    supabase
      .from("login_history")
      .select("id, event_type, provider, device, browser, os, country, created_at")
      .order("created_at", { ascending: false })
      .limit(25)
      .then(({ data }) => setHistory((data ?? []) as never));
  }, []);

  return (
    <div className="space-y-6">
      <Card icon={<LogOut className="h-4 w-4" />} title="Sign out everywhere" desc="Revokes every active session across all devices.">
        <button
          onClick={async () => {
            await logoutAll();
            await supabase.auth.signOut();
            toast.success("Signed out on every device");
            navigate({ to: "/auth" });
          }}
          className="rounded-lg border border-destructive/50 px-4 py-2 text-sm text-destructive"
        >
          Sign out of all devices
        </button>
      </Card>

      <Card title="Recent login activity" desc="Last 25 events on your account.">
        <div className="divide-y divide-border rounded-lg border border-border">
          {history.length === 0 && <div className="p-4 text-sm text-muted-foreground">No activity yet.</div>}
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <div className="font-medium capitalize">{h.event_type.replace("_", " ")} {h.provider && <span className="text-muted-foreground">· {h.provider}</span>}</div>
                <div className="text-xs text-muted-foreground">
                  {[h.browser, h.os, h.device, h.country].filter(Boolean).join(" · ") || "Unknown device"}
                </div>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({ icon, title, desc, children }: { icon?: React.ReactNode; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-display text-lg font-semibold">{title}</h2>
        </div>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-gold" : "bg-muted"} disabled:opacity-50`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-5" : "left-0.5"}`} />
      </button>
    </label>
  );
}
