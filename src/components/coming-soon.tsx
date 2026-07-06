import { AppShell } from "@/components/app-shell";
import { Sparkles } from "lucide-react";

export function ComingSoon({
  title,
  subtitle,
  body,
}: {
  title: string;
  subtitle: string;
  body: string;
}) {
  return (
    <AppShell>
      <p className="text-sm uppercase tracking-[0.2em] text-gold">{subtitle}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">{title}</h1>

      <div className="mt-8 rounded-2xl border border-gold/40 bg-hero p-10 shadow-glow">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
          <Sparkles className="h-3.5 w-3.5" /> Shipping in Phase 2
        </div>
        <p className="mt-4 max-w-2xl font-display text-xl leading-snug">{body}</p>
        <p className="mt-6 text-sm text-muted-foreground">
          The schema and data model for this module are already live in your workspace — the UI is
          being polished next. Every record you create later will be full CRUD, RLS-scoped to you.
        </p>
      </div>
    </AppShell>
  );
}
