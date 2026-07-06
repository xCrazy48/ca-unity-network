import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/formulas")({
  head: () => ({ meta: [{ title: "Formula Vault · PrepOS" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      subtitle="Formula & concept vault"
      title="Search, tag, revise."
      body="Save formulas and key concepts with confidence scores. Spaced-repetition reminders keep them cold-recall ready by exam day."
    />
  ),
});
