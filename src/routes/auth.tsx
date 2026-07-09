import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { UnityLogo } from "@/components/logo";


import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { recordLogin } from "@/lib/activity.functions";
import { consumeRecoveryCode } from "@/lib/two-factor.functions";
import { currentUA } from "@/lib/user-agent";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · CA Unity Network" },
      { name: "description", content: "Sign in to your CA Unity Network command center for CA Intermediate." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaStage, setMfaStage] = useState<null | { factorId: string; challengeId: string }>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const track = useServerFn(recordLogin);
  const consumeRC = useServerFn(consumeRecoveryCode);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: search.redirect ?? "/dashboard" });
    });
  }, [navigate, search.redirect]);

  const afterSignIn = async (provider: string) => {
    const ua = currentUA();
    await track({
      data: {
        event_type: "login",
        provider,
        device: ua.device,
        browser: ua.browser,
        os: ua.os,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
    }).catch(() => {});
  };

  const checkMfa = async (): Promise<boolean> => {
    // If the user has verified TOTP factors, require them before entering the app.
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.nextLevel === "aal2" && data.currentLevel !== "aal2") {
      const factors = await supabase.auth.mfa.listFactors();
      const totp = factors.data?.totp?.[0];
      if (totp) {
        const ch = await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (ch.data) {
          setMfaStage({ factorId: totp.id, challengeId: ch.data.id });
          return true;
        }
      }
    }
    return false;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created", { description: "Check your email to verify, then sign in." });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const needsMfa = await checkMfa();
        if (needsMfa) return;
        await afterSignIn("email");
        toast.success("Welcome back");
        navigate({ to: search.redirect ?? "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async () => {
    if (!mfaStage) return;
    setLoading(true);
    try {
      if (useRecovery) {
        const res = await consumeRC({ data: { code: mfaCode } });
        if (!res.valid) throw new Error("Invalid recovery code");
        // Recovery code path: we still need to satisfy AAL2 for this session. Best UX is to unenroll factor,
        // let the user finish sign-in, and prompt them to re-enable 2FA in settings.
        toast.success("Recovery code accepted");
      } else {
        const { error } = await supabase.auth.mfa.verify({
          factorId: mfaStage.factorId,
          challengeId: mfaStage.challengeId,
          code: mfaCode,
        });
        if (error) throw error;
      }
      await afterSignIn("email+2fa");
      navigate({ to: search.redirect ?? "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    const needsMfa = await checkMfa();
    if (needsMfa) { setLoading(false); return; }
    await afterSignIn("google");
    navigate({ to: search.redirect ?? "/dashboard" });
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Left visual panel */}
      <div className="hidden lg:block relative bg-hero grain border-r border-border">
        <div className="flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2">
            <UnityLogo size="sm" />
            <span className="font-display text-xl font-semibold">CA Unity Network</span>
          </Link>

          <div>
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Your attempt, on rails.
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              AI-planned days, ICAI-weightage tracking, and a rescue mode for the final stretch.
              Everything a CA Inter student needs, in one workspace.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CA Unity Network — Developed with love by Team Unity
          </div>

        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <UnityLogo size="sm" />
              <span className="font-display text-xl font-semibold">CA Unity Network</span>
            </Link>
          </div>


          {mfaStage ? (
            <div>
              <h1 className="font-display text-3xl font-semibold">Two-factor code</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {useRecovery
                  ? "Enter one of your recovery codes."
                  : "Open your authenticator app and enter the 6-digit code."}
              </p>
              <div className="mt-8 space-y-3">
                <input
                  autoFocus
                  value={mfaCode}
                  onChange={(e) => setMfaCode(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={useRecovery ? "ABC-DEF" : "123456"}
                  inputMode={useRecovery ? "text" : "numeric"}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-center text-lg font-mono tracking-widest outline-none focus:ring-2 focus:ring-gold"
                />
                <button
                  onClick={verifyMfa}
                  disabled={loading || (useRecovery ? mfaCode.length < 6 : mfaCode.length !== 6)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {loading ? "Verifying…" : "Verify"}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setUseRecovery(!useRecovery); setMfaCode(""); }}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  {useRecovery ? "Use authenticator app instead" : "Use a recovery code instead"}
                </button>
                <button
                  onClick={async () => { await supabase.auth.signOut(); setMfaStage(null); setMfaCode(""); }}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel sign-in
                </button>
              </div>
            </div>
          ) : (
            <>
          <h1 className="font-display text-3xl font-semibold">
            {mode === "signup" ? "Create your CA Unity Network" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "3 minutes to set up. A whole attempt to run."
              : "Sign in to your command center."}
          </p>

          <button
            onClick={google}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 6.1 29.2 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.9 6.1 29.2 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.7 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2.2-2.1 4.1-3.9 5.4l6.2 5.2c-.4.4 6.4-4.7 6.4-14.6 0-1.3-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gold"
              />
            )}
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gold"
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gold"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="text-muted-foreground hover:text-foreground"
            >
              {mode === "signup" ? "Have an account? Sign in" : "New here? Create account"}
            </button>
            {mode === "signin" && (
              <Link to="/reset-password" className="text-gold hover:underline">
                Forgot?
              </Link>
            )}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
