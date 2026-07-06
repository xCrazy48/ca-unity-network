import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Planner · PrepOS" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ComingSoon
      subtitle="To-do planner"
      title="Drag, drop, done."
      body="Recurring tasks, priorities, AI-generated tasks, and automatic rescheduling for anything you miss."
    />
  ),
});
