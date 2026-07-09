import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Users, MessageCircle, Heart } from "lucide-react";
import { UnityLogo } from "@/components/logo";

import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About CA Unity Network — Our Story" },
      {
        name: "description",
        content:
          "How a WhatsApp group of two friends grew into a community of 8000+ CA aspirants — and became CA Unity Network, a free platform built purely to help students win their attempt.",
      },
      { property: "og:title", content: "About CA Unity Network — Our Story" },
      {
        property: "og:description",
        content:
          "From a WhatsApp group with no plan to 8000+ students strong. This is the CA Unity Network story.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="relative bg-hero grain overflow-hidden border-b border-border">
        <div className="mx-auto max-w-4xl px-6 pb-16 pt-20 md:pt-28">
          <p className="text-sm uppercase tracking-[0.2em] text-gold">Our Story</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] md:text-6xl">
            Two friends. One WhatsApp group. <span className="text-gold">Eight thousand students.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            CA Unity Network wasn't a startup pitch. It was a group chat between two CA aspirants who
            couldn't find anyone to figure things out with. That's still what it is — just with a lot
            more friends in the room now.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="space-y-8 text-base leading-relaxed text-muted-foreground">
          <Chapter n="01" title="8th March, 2025 — a group with no plan">
            <p>
              On 8th March 2025, <span className="text-foreground font-medium">Ronil Dodhia</span> and{" "}
              <span className="text-foreground font-medium">Rushil Bauva</span> opened WhatsApp and
              created a group. There was no roadmap, no branding, no monetisation deck. Just two CA
              students tired of studying alone, tired of scrolling through fragmented Telegram
              channels, tired of never really knowing whether they were on track.
            </p>
            <p>
              The idea was almost embarrassingly simple: <em>what if we just… helped each other?</em>{" "}
              Share doubts. Share notes. Share the panic when a chapter refused to click. Share the
              wins when a mock finally cracked past 60. No gurus, no course sellers — just students.
            </p>
          </Chapter>

          <Chapter n="02" title="The group that refused to stay small">
            <p>
              People started adding people. A friend told a friend. A batchmate shared it in another
              batch. Someone screenshotted a doubt-solving thread and posted it in their college
              group. Within weeks the chat was moving faster than either of us could keep up with —
              and the questions coming in were sharper, weirder, more specific than anything a
              textbook covered.
            </p>
            <p>
              That's when it stopped feeling like a group chat and started feeling like something
              else. A study hall. A war room. A community. We stopped counting members after 500. We
              stopped celebrating milestones after 1,000. Today, over{" "}
              <span className="text-foreground font-semibold">8,000+ CA aspirants</span> call this
              network home — spread across every group, every attempt, every city.
            </p>
          </Chapter>

          <Chapter n="03" title="Why a website, why now">
            <p>
              WhatsApp is beautiful for conversation, but it's terrible for structure. Doubts get
              buried in five minutes. Notes get lost in the media folder. Nobody can tell you what
              you actually studied last month, and nobody can rebuild your week when a mock goes
              sideways.
            </p>
            <p>
              So Team Unity started sketching. What would happen if the community had a proper home? Not a
              paywalled course. Not another PDF drop. An actual{" "}
              <span className="text-foreground font-medium">operating system</span> — one that knows
              the ICAI syllabus, tracks your mocks, remembers your mistakes, and plans your week for
              you. Something that treats a CA student's time as the scarce, precious thing it
              actually is.
            </p>
            <p>
              That sketch became CA Unity Network. The platform you're on right now. Ideated by
              Team Unity, shaped by the community, and built with one non-negotiable rule: it stays free.
              Forever. For everyone.
            </p>
          </Chapter>


          <Chapter n="04" title="Nothing in our minds, everything for the students">
            <p>
              We'll be honest — we still don't have a "plan." No investors, no exit strategy, no
              premium tier waiting to launch. What we have is the same thing we had on 8th March
              2025: a desire to help as many CA students as we possibly can, and the network to
              actually do it.
            </p>
            <p>
              If you're here, you're part of the story now. Log in, set up your calendar, and let the
              network do what it does best — carry you through to your next attempt.
            </p>
          </Chapter>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          <Stat n="8,000+" label="Students in the network" />
          <Stat n="0₹" label="Cost, today and forever" />
          <Stat n="Mar '25" label="Founded" />
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/team"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-accent"
          >
            <Users className="h-4 w-4" /> Meet the team
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant hover:opacity-90"
          >
            Join the network <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Chapter({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-6 md:p-8">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-sm text-gold">{n}</span>
        <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">{title}</h2>
      </div>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-center">
      <div className="font-display text-3xl font-semibold text-gold">{n}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <UnityLogo size="sm" />
          <span className="font-display text-xl font-semibold tracking-tight">CA Unity Network</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
          <Link to="/team" className="text-sm text-muted-foreground hover:text-foreground">Team</Link>
          <Link to="/" hash="features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
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
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-gold" />
          <span>CA Unity Network — Developed with love by Team Unity</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/about" className="hover:text-foreground">About</Link>
          <Link to="/team" className="hover:text-foreground">Team</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <a
            href="https://wa.me/918828828184"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Mentoring
          </a>
        </div>
      </div>
    </footer>
  );
}
