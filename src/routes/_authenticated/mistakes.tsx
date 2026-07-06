import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/mistakes")({
  head: () => ({ meta: [{ title: "Mistake Book · PrepOS" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      subtitle="Mistake book"
      title="Errors, on a schedule."
      body="Log every mistake with source, chapter, concept, correction. Spaced repetition brings each one back exactly when you'd forget."
    />
  ),
});
