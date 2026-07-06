import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/chapters")({
  head: () => ({ meta: [{ title: "Chapters · PrepOS" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      subtitle="Chapter progress"
      title="Every chapter, ICAI-weighted."
      body="Track status, confidence, last-revised date, and notes per chapter. Weightage-aware sorting so high-mark chapters never slip."
    />
  ),
});
