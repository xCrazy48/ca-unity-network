import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CalendarClock,
  CheckCircle2,
  Compass,
  FileText,
  Flame,
  Heart,
  MessageCircle,
  Target,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UnityLogo } from "@/components/logo";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CA Unity Network — Built by a CA student, for CA students" },
      {
        name: "description",
        content:
          "AI-planned study, ICAI-aware chapter tracking, mock analytics, mistake book, and a rescue mode for the final stretch. Built by a CA student, for CA students.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Brain, title: "AI Revision Engine", body: "Rebuilds your week when you fall behind. Diagnoses weak chapters from mock scores and converts marks into action items." },
  { icon: CalendarClock, title: "Dynamic Exam Calendar", body: "Group 1, Group 2, or Both. Editable 3-day or 6-day schedule with live countdown to every paper." },
  { icon: Target, title: "ICAI-Aware Progress", body: "Every chapter tagged with official ICAI weightage — so the plan chases marks, not busywork." },
  { icon: FileText, title: "MTP, RTP & PYQ Tracker", body: "Chapter × subject checklist covering May 2024 → May 2026 sessions. Nothing slips through." },
  { icon: BookOpenCheck, title: "Mistake Book", body: "Every error linked to source, chapter, concept — with a spaced-repetition schedule until it's gone." },
  { icon: Flame, title: "Rescue Mode", body: "When time is short, CA Unity Network collapses your plan to only the highest-yield topics per paper." },
];

const modules = [
  "Dashboard", "Exam Calendar", "Chapter Progress", "Mock Tracker", "MTP Tracker",
  "RTP & PYQ", "Mistake Book", "Formula Vault", "AI Planner", "Rescue Mode",
];

const testimonials = [
  { name: "Aditi S.", role: "CA Inter · Group 1", quote: "I stopped guessing what to study. Every morning the AI brief just tells me — and it's usually right." },
  { name: "Rohan M.", role: "CA Inter · Both Groups", quote: "The mistake book alone changed my score. Every wrong question comes back exactly when I'd have forgotten it." },
  { name: "Kavya P.", role: "CA Inter · Group 2", quote: "Rescue Mode 21 days before exam felt like having a personal mentor triaging my prep." },
];

const faqs = [
  { q: "How is this different from Notion or a planner app?", a: "CA Unity Network is built around the ICAI syllabus, weightage, and paper structure. It doesn't just store tasks — it decides them for you based on your mock scores, mistakes, and time left." },
  { q: "Which sessions does it cover?", a: "Every ICAI session from May 2024 through the upcoming attempt — for RTPs, MTPs, and PYQs across CA Intermediate and CA Final." },
  { q: "Can I use it for just one group?", a: "Yes. Choose Group 1, Group 2, or Both during setup. Exam dates are fully editable for the 3-day or 6-day schedule." },
  { q: "Is my data private?", a: "Yes. Every record is row-level-secured to your account. Nobody else — not even other students — can see your data." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <UnityLogo size="sm" />
            <span className="font-display text-xl font-semibold tracking-tight">CA Unity Network</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a>
            <a href="#modules" className="text-sm text-muted-foreground hover:text-foreground">Modules</a>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
            <Link to="/team" className="text-sm text-muted-foreground hover:text-foreground">Team</Link>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/auth" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">Sign in</Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-primary-foreground shadow-elegant transition hover:opacity-90"
            >
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-hero grain overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Built by a CA student, for CA students
            </div>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
              The AI <span className="text-gold">command center</span> for your CA Inter/Final attempt.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Stop guessing what to study. CA Unity Network turns the ICAI syllabus, your mocks, and the
              days left into one thing — the exact next task that maximizes your marks.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
              >
                Start your attempt <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/50 px-6 py-3 text-sm font-medium backdrop-blur hover:bg-accent"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card. Works for Group 1, Group 2, or Both.
            </p>
          </motion.div>

          {/* Hero mock card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative mx-auto mt-16 max-w-5xl"
          >
            <div className="rounded-2xl border border-border/70 bg-card/80 p-2 shadow-elegant backdrop-blur">
              <div className="grid gap-4 rounded-xl bg-background/60 p-6 md:grid-cols-4">
                <StatTile icon={TrendingUp} label="Readiness" value="72%" hint="+8 this week" tone="gold" />
                <StatTile icon={Timer} label="Days to Paper 1" value="41" hint="Advanced Accounting" />
                <StatTile icon={Flame} label="Streak" value="17d" hint="Best: 24" />
                <StatTile icon={CheckCircle2} label="Today's plan" value="4 / 7" hint="2h 40m done" />
              </div>
              <div className="grid gap-4 p-6 md:grid-cols-3">
                <PlanCard title="AI Brief" body="Focus on GST — Input Tax Credit. Your Sep 2025 MTP dropped 8 marks here." tag="AI · today" />
                <PlanCard title="Next Task" body="Revise Ind AS 115 — 45 min, then attempt 5 PYQ questions from May 2025." tag="9:30 · scheduled" />
                <PlanCard title="Rescue Mode" body="Activates in 12 days. Will collapse plan to top 18 chapters by weightage." tag="auto" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-gold">Every rupee of marks, planned</p>
          <h2 className="mt-3 font-display text-4xl font-semibold md:text-5xl">
            An operating system, not another tracker.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 transition hover:border-gold/40 hover:shadow-elegant"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-gold">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules strip */}
      <section id="modules" className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gold">Ten modules, one workspace</p>
              <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Everything the syllabus demands.</h2>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Each module is fully editable — create, edit, delete anything, from paper dates to formulas.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            {modules.map((m) => (
              <div key={m} className="rounded-full border border-border bg-background px-4 py-2 text-sm">
                <Compass className="mr-2 inline h-3.5 w-3.5 text-gold" />
                {m}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="max-w-2xl font-display text-4xl font-semibold md:text-5xl">
          Students who ship attempts, not stress.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="rounded-2xl border border-border bg-card p-6">
              <blockquote className="font-display text-lg leading-snug">"{t.quote}"</blockquote>
              <figcaption className="mt-6 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">{t.name}</div>
                {t.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Free-forever banner + WhatsApp mentoring */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:grid-cols-2">
          <div className="rounded-2xl border border-gold/40 bg-hero p-8 shadow-glow">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Always free</p>
            <h3 className="mt-3 font-display text-3xl font-semibold">
              Every feature. Zero paywalls.
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Create an account and unlock the full CA Unity Network — planner, AI Engine,
              mocks, mistake book, formulas, Pomodoro, reflection, everything. Forever free.
            </p>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant hover:opacity-90"
            >
              Create your account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Personal Mentoring</p>
            <h3 className="mt-3 font-display text-3xl font-semibold">
              Want a mentor in your corner?
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Book 1:1 mentoring with Team Unity on WhatsApp — strategy, doubt-solving,
              and honest feedback tailored to your attempt.
            </p>
            <a
              href={"https://wa.me/918828828184"}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent"
            >
              Chat on WhatsApp · 8828828184
            </a>
          </div>

        </div>
      </section>


      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="font-display text-4xl font-semibold md:text-5xl">Questions, answered.</h2>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
          {faqs.map((f) => (
            <details key={f.q} className="group px-6 py-5 open:bg-accent/30">
              <summary className="flex cursor-pointer items-center justify-between text-base font-medium">
                {f.q}
                <span className="ml-4 text-gold transition group-open:rotate-45">＋</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-hero p-12 text-center md:p-20">
          <h2 className="font-display text-4xl font-semibold md:text-6xl">
            Your next attempt starts with your <span className="text-gold">next task</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Set up your exam calendar in under 3 minutes. CA Unity Network handles the rest.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            Create your CA Unity Network <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <UnityLogo size="md" />
                <span className="font-display text-lg font-semibold">CA Unity Network</span>
              </div>
              <p className="mt-4 max-w-md text-sm text-muted-foreground">
                A student-run operating system for the CA journey. Free forever, built with love by Team Unity for the 8,000+ students in the network.
              </p>
              <a
                href="https://wa.me/918828828184"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-background px-4 py-2 text-sm hover:bg-accent"
              >
                <MessageCircle className="h-4 w-4 text-gold" /> WhatsApp · 8828828184
              </a>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Quick Links</div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground">About</Link></li>
                <li><Link to="/team" className="hover:text-foreground">Team</Link></li>
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Legal</div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground">Terms &amp; Conditions</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
            <div className="flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-gold" />
              <span>Developed with love by Team Unity</span>
            </div>
            <span>© {new Date().getFullYear()} CA Unity Network. All rights reserved.</span>
          </div>
        </div>
      </footer>


    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  hint: string;
  tone?: "gold";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        <Icon className={`h-4 w-4 ${tone === "gold" ? "text-gold" : ""}`} />
      </div>
      <div className="mt-3 font-display text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function PlanCard({ title, body, tag }: { title: string; body: string; tag: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-base font-semibold">{title}</h4>
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
          {tag}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

