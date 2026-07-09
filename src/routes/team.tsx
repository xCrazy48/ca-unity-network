import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Heart, MessageCircle, Users } from "lucide-react";
import { SiteHeader, SiteFooter } from "./about";
import ronilAsset from "@/assets/ronil.jpg.asset.json";
import rushilAsset from "@/assets/rushil.jpg.asset.json";


export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team Unity — The people behind CA Unity Network" },
      {
        name: "description",
        content:
          "Meet Team Unity — the students building CA Unity Network. Founded by Ronil Dodhia and Rushil Bauva on 8th March 2025.",
      },
      { property: "og:title", content: "Team Unity — The people behind CA Unity Network" },
      {
        property: "og:description",
        content:
          "The friends, founders, and mentors keeping CA Unity Network free for 8000+ students.",
      },
    ],
  }),
  component: TeamPage,
});

type Member = {
  name: string;
  role: string;
  initials: string;
  photo?: string;
  bio: string;
  tag: string;
};

const founders: Member[] = [
  {
    name: "Ronil Dodhia",
    role: "Co-founder · Product & Mentoring",
    initials: "RD",
    photo: ronilAsset.url,
    tag: "Ideated the platform",
    bio: "CA aspirant who kept sketching on the back of mock answer sheets until this platform existed. Handles product direction, 1:1 mentoring on WhatsApp, and most of the community's late-night doubts.",
  },
  {
    name: "Rushil Bauva",
    role: "Co-founder · Community & Marketing",
    initials: "RB",
    photo: rushilAsset.url,
    tag: "The people's guy",
    bio: "The people's guy — and the marketing brain behind the network. Runs community, moderation, partnerships, and outreach, and keeps the network's culture warm, honest, and student-first.",
  },
];


const contributors: Member[] = [
  {
    name: "The 8,000+",
    role: "The Network",
    initials: "★",
    tag: "Every member",
    bio: "Every student who has ever answered a doubt, shared a note, posted a mock score, or sent a friend our way. You are literally the team — this platform exists because you keep showing up.",
  },
];

function TeamPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="relative bg-hero grain overflow-hidden border-b border-border">
        <div className="mx-auto max-w-4xl px-6 pb-16 pt-20 md:pt-28">
          <p className="text-sm uppercase tracking-[0.2em] text-gold">Team Unity</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] md:text-6xl">
            The students <span className="text-gold">behind the network</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            No investors. No corporate parent. Just students building for students — with a lot of
            help from the 8,000+ people already in the network.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-gold" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Founders</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {founders.map((m) => (
            <MemberCard key={m.name} m={m} />
          ))}
        </div>

        <div className="mt-16 mb-4 flex items-center gap-2">
          <Heart className="h-4 w-4 text-gold" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">The rest of the team</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {contributors.map((m) => (
            <MemberCard key={m.name} m={m} />
          ))}
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6">
            <h3 className="font-display text-xl font-semibold">Want your name here?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We're always looking for CA students who want to help build — mentors, writers,
              organisers, testers. Ping us on WhatsApp and tell us what you'd love to work on.
            </p>
            <a
              href="https://wa.me/918828828184"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-background px-4 py-2 text-sm hover:bg-accent"
            >
              <MessageCircle className="h-4 w-4" /> Say hi on WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-16 rounded-3xl border border-border bg-hero p-10 text-center">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">
            Study with the network, not against it.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Free forever. All features. Whatever attempt you're prepping for.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90"
          >
            Create your account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function MemberCard({ m }: { m: Member }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 transition hover:border-gold/40 hover:shadow-elegant">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gold font-display text-lg font-semibold text-primary-foreground shadow-glow">
          {m.initials}
        </div>
        <div>
          <h3 className="font-display text-xl font-semibold">{m.name}</h3>
          <p className="text-sm text-muted-foreground">{m.role}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{m.bio}</p>
      <div className="mt-4 inline-flex items-center rounded-full bg-accent px-3 py-1 text-[11px] uppercase tracking-wider text-gold">
        {m.tag}
      </div>
    </div>
  );
}
