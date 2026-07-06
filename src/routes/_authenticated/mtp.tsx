import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/mtp")({
  head: () => ({ meta: [{ title: "MTP · PrepOS" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      subtitle="MTP tracker"
      title="Every official ICAI MTP, tracked."
      body="Plan, attempt, and review every Mock Test Paper. Score trends per session tell you if you're peaking at the right time."
    />
  ),
});
