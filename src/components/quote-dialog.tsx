import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

const STORAGE_KEY = "cun_quote_last_shown";

export function QuoteDialog() {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<typeof QUOTES[number] | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const last = localStorage.getItem(STORAGE_KEY);
    if (last !== today) {
      // Pick deterministic quote per day
      const seed = today.split("-").reduce((a, b) => a + parseInt(b, 10), 0);
      setItem(QUOTES[seed % QUOTES.length]);
      setOpen(true);
      localStorage.setItem(STORAGE_KEY, today);
    }
  }, []);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-gold/40 bg-hero shadow-glow sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-gold/20 text-gold">
            <Sparkles className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center font-display text-xs uppercase tracking-[0.2em] text-gold">
            Today's spark
          </DialogTitle>
          <DialogDescription asChild>
            <div className="mt-2 text-center">
              <p className="font-display text-xl leading-snug text-foreground">
                "{item.quote}"
              </p>
              <p className="mt-3 text-sm text-muted-foreground">— {item.author}</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => setOpen(false)}
            className="mx-auto bg-gold text-primary-foreground hover:opacity-90"
          >
            Let's get to work
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
