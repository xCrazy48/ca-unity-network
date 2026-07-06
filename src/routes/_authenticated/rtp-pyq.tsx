import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/rtp-pyq")({
  head: () => ({ meta: [{ title: "RTP & PYQ · PrepOS" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      subtitle="RTP & PYQ checklist"
      title="May 2024 → May 2026, chapter-wise."
      body="Every session's RTP and PYQ mapped to paper and chapter. Tick as you go — PrepOS knows what's left before your paper."
    />
  ),
});
