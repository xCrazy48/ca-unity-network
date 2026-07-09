import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "918828828184";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hi Team Unity, I'd like personal mentoring for my CA prep via CA Unity Network.",
)}`;

export function MentoringCard({ variant = "default" }: { variant?: "default" | "compact" }) {
  if (variant === "compact") {
    return (
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-hero px-4 py-2 text-sm font-medium text-foreground shadow-elegant transition hover:opacity-90"
      >
        <MessageCircle className="h-4 w-4 text-gold" />
        Personal Mentoring on WhatsApp
      </a>
    );
  }
  return (
    <section className="rounded-2xl border border-gold/40 bg-hero p-6 shadow-glow">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
        <MessageCircle className="h-3.5 w-3.5" /> Personal Mentoring
      </div>
      <h3 className="mt-3 font-display text-xl font-semibold">
        Need a human in your corner?
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Get 1:1 mentoring from Team Unity — strategy, doubt-solving, and honest
        feedback on your prep. Message on WhatsApp to book a slot.
      </p>
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-primary-foreground shadow-elegant transition hover:opacity-90"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp · 8828828184
      </a>
    </section>
  );
}

export { WHATSAPP_LINK, WHATSAPP_NUMBER };
