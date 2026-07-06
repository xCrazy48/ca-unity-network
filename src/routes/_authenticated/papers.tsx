import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/papers")({
  head: () => ({ meta: [{ title: "Papers · PrepOS" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      subtitle="Paper-wise tracking"
      title="All six papers, one board."
      body="Each paper's chapters, weightage, syllabus coverage, and mock trend in a single view — with ICAI-marked priority for what to attack next."
    />
  ),
});
