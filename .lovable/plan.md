This is a very large scope — I'll break it into phases so we can ship a solid foundation first, then layer AI and advanced tracking. Please confirm the phasing (or tell me to compress) before I start building.

## Product vision
A student's central command center from registration to exam day, always answering: "What should I study next to maximize marks?" Premium SaaS polish (Notion/Linear/Motion caliber), ICAI-specific workflows for CA Intermediate.

## Tech foundation
- TanStack Start (already scaffolded) + Tailwind v4 design system
- Lovable Cloud (Supabase) for auth, DB, RLS, storage
- Lovable AI Gateway for the AI Revision Engine, Daily Brief, Weekly Review, Rescue Mode
- shadcn components + framer-motion, Recharts for analytics, dnd-kit for planner
- Full CRUD everywhere, RLS-scoped per user

## Phase 1 — Foundation (this turn)
1. Design system: dark/light tokens, premium typography pairing, gradient/shadow tokens, motion primitives
2. Landing page: hero, feature grid, "how it works", testimonials, FAQs, pricing-ready section, CTA → auth
3. Auth (email/password + Google) with `/auth` and `/reset-password`
4. Profile: attempt (May/Sep/Jan), group (G1/G2/Both), editable exam dates (3-day or 6-day), daily study hours, coaching schedule
5. App shell (sidebar + topbar), protected `_authenticated` subtree
6. Dashboard skeleton with readiness score, countdown, today's priorities, streak, quick actions
7. Supabase schema + RLS for: profiles, exam_config, papers, chapters (seeded ICAI weightage), progress, tasks, mistakes, formulas, mocks, mtps, rtp_pyq
8. SEO metadata, sitemap, robots

## Phase 2 — Tracking modules
- Paper-wise + Chapter-wise progress (ICAI weightage-aware)
- Mock Test Tracker (scores, trends, analytics, AI recommendations)
- MTP Tracker
- RTP & PYQ checklist (May 2024 → May 2026) chapter × subject grid
- Mistake Book (source, chapter, concept, correction, spaced revision, status)
- Formula & Concept Vault (search, tags, confidence, SRS reminders)

## Phase 3 — Planner + AI Engine
- To-Do Planner: drag-and-drop, recurring tasks, priorities, auto-reschedule
- AI Revision Engine (server functions via AI Gateway):
  - Weekly rebuild after missed targets
  - 7/3/1-day pre-paper revision plans
  - ICAI resource recommendations (Module/RTP/MTP/PYQ)
  - Weak-chapter diagnosis from mock performance
  - Marks → chapter action items
  - Continuous reprioritization
- Rescue Mode (high-yield only when time is short)
- Daily AI Brief + Weekly AI Review

## Phase 4 — Polish
- Charts, empty states, global search, filters, toasts, keyboard shortcuts, accessibility pass, animations, mobile responsiveness

## Questions before I start
1. **Scope for this turn**: OK to ship Phase 1 (foundation + landing + auth + profile + dashboard shell + schema) now, then iterate? Or do you want everything in one massive turn (will be lower quality per feature)?
2. **Design direction**: Any preference — dark-first like Linear, warm editorial, or should I generate 3 design directions to pick from?
3. **Auth**: Email/password + Google sign-in as default OK?

Reply with answers (or "just go — Phase 1, pick the best design, default auth") and I'll build.