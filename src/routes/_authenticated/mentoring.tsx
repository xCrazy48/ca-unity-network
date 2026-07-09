import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, MessageCircle, Sparkles, Target, Trophy, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { WHATSAPP_LINK } from "@/components/mentoring-card";

export const Route = createFileRoute("/_authenticated/mentoring")({
  head: () => ({
    meta: [
      { title: "1:1 Mentoring · CA Unity Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MentoringPage,
});

const benefits = [
  {
    icon: Target,
    title: "Personalised prep strategy",
    body: "A study plan built around your papers, attempt date, strengths, and weak spots — not a generic template.",
  },
  {
    icon: Sparkles,
    title: "Doubt-solving on demand",
    body: "Stuck on a concept or MCQ? Send it on WhatsApp and get a clear, exam-oriented explanation back.",
  },
  {
    icon: Trophy,
    title: "Mock analysis & feedback",
    body: "Honest, chapter-wise feedback on your mocks and MTPs so every attempt actually moves the needle.",
  },
  {
    icon: Users,
    title: "Accountability partner",
    body: "Weekly check-ins with Team Unity to keep you consistent, calm, and on schedule till exam day.",
  },
];

const included = [
  "Attempt-date-based revision roadmap",
  "Paper-wise priority list & ABC analysis",
  "Weekly review calls / chats on WhatsApp",
  "Mock test & MTP review with action points",
  "Last-30-days sprint plan before exams",
  "Exam-day strategy: order, time, presentation",
];

function MentoringPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="1:1 Mentoring by Team Unity"
        title="A mentor who actually knows your prep."
        description="Personal mentoring for CA Inter & CA Final students — strategy, doubt-solving, and honest feedback, straight from Team Unity on WhatsApp."
      />

      <section className="rounded-2xl border border-gold/40 bg-hero p-6 shadow-glow md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-background/40 px-3 py-1 text-xs font-medium text-gold">
              <Trophy className="h-3.5 w-3.5" /> 100% pass rate for mentored students
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold md:text-3xl">
              Do the hard work. We&apos;ll handle the strategy.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Every student we&apos;ve personally mentored has cleared their attempt.
              No one else can guarantee that — because no one else works this closely
              with you. Show up, put in the hours, and we&apos;ll make sure the effort
              actually converts into a pass.
            </p>
          </div>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" />
            Talk to Team Unity · 8828828184
          </a>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {benefits.map((b) => (
          <div key={b.title} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
              <b.icon className="h-4 w-4" /> {b.title}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{b.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold">What&apos;s included</h3>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {included.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-gold/30 bg-card p-6 text-center">
        <h3 className="font-display text-xl font-semibold">Ready to start?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Message Team Unity on WhatsApp with your level (Inter / Final), attempt month,
          and where you feel stuck. We&apos;ll take it from there.
        </p>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" />
          Start on WhatsApp
        </a>
        <p className="mt-3 text-xs text-muted-foreground">
          Personal mentoring by Team Unity · Pass rate 100% · Effort not optional.
        </p>
      </section>
    </AppShell>
  );
}
