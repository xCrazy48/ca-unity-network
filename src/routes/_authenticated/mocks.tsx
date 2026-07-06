import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/mocks")({
  head: () => ({ meta: [{ title: "Mock Tests · PrepOS" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      subtitle="Mock test tracker"
      title="Turn scores into action items."
      body="Log mocks with per-paper score, time taken, and weak areas. Trend charts and AI recommendations tell you exactly which chapter to rework."
    />
  ),
});
