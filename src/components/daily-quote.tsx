import { Sparkles } from "lucide-react";

const QUOTES: { quote: string; author: string }[] = [
  { quote: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { quote: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { quote: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { quote: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" },
  { quote: "Great things never come from comfort zones.", author: "Anonymous" },
  { quote: "Study while others are sleeping; work while others are loafing.", author: "William A. Ward" },
  { quote: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
  { quote: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { quote: "Motivation gets you going; discipline keeps you growing.", author: "John C. Maxwell" },
];

export function DailyQuote() {
  const today = new Date().toISOString().slice(0, 10);
  const seed = today.split("-").reduce((a, b) => a + parseInt(b, 10), 0);
  const item = QUOTES[seed % QUOTES.length];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Daily motivation
          </div>
          <p className="mt-1 font-display text-lg leading-snug text-foreground">
            "{item.quote}"
          </p>
          <p className="mt-1 text-sm text-muted-foreground">— {item.author}</p>
        </div>
      </div>
    </section>
  );
}
