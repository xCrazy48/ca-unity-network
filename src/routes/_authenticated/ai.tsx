import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({ meta: [{ title: "AI Engine · PrepOS" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      subtitle="AI revision engine"
      title="Your plan, rewritten every day."
      body="7-day, 3-day, and 1-day pre-paper plans. Weak-chapter diagnosis from mock scores. Rescue Mode for the final stretch."
    />
  ),
});
