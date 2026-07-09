import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { recordActivity } from "@/lib/activity.functions";

// Records a page_view event whenever the pathname changes, with time-on-page for the previous page.
export function useActivityTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const track = useServerFn(recordActivity);
  const prevPath = useRef<string | null>(null);
  const enteredAt = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const prev = prevPath.current;
    const duration = Math.floor((now - enteredAt.current) / 1000);

    if (prev && prev !== pathname && duration > 0 && duration < 3600) {
      // fire-and-forget
      track({ data: { activity_type: "page_view", page_path: prev, duration_seconds: duration } }).catch(() => {});
    }

    prevPath.current = pathname;
    enteredAt.current = now;

    // Also record entry (no duration)
    track({ data: { activity_type: "page_enter", page_path: pathname } }).catch(() => {});
  }, [pathname, track]);
}
