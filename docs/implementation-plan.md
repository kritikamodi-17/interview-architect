# Delivery plan — Interview Architect

## Scope delivered for the first release

The project will ship as a polished, deployable vertical slice—not a content mockup. It will include full frontend/backend integration, meaningful seeded content, real progress persistence, and automated verification.

### Included

- Responsive React application with curriculum, search, question practice, and progress views
- Cloudflare Worker API and D1 schema/migrations
- Anonymous session and learner-progress persistence
- Detailed Redis and Kafka learning modules with original questions, rubrics, hints, and follow-ups
- Deterministic study-coach recommendations
- Unit, API integration, accessibility, and end-to-end test coverage
- Free-tier Cloudflare deployment configuration and GitHub Actions quality checks

### Explicitly deferred

- Paid LLM answer grading
- A CMS/admin interface
- Social features, uploads, real-time collaboration, and microservices
- OAuth and multi-user account merging

## Implementation phases

| Phase | Deliverable | Verification |
| --- | --- | --- |
| 1 | Workspace, shared contracts, build/test tooling, and Cloudflare config | Typecheck and baseline test suite pass. |
| 2 | Versioned curriculum schema, validator, Redis/Kafka seed content, and search index | Content validation rejects bad IDs, missing rubrics, and broken topic links. |
| 3 | Worker API, D1 migrations, anonymous sessions, attempts, bookmarks, and progress | API integration tests cover happy paths and invalid/unauthorized requests. |
| 4 | Responsive frontend app shell, curriculum browser, filters, search, and question detail | Component tests and keyboard/mobile review pass. |
| 5 | Timed practice, self-review rubric, progress dashboard, review queue, and study coach | End-to-end flow persists progress after reload. |
| 6 | QA hardening, documentation, deployment walkthrough, and GitHub automation | Content validation, typecheck, unit/API/E2E tests, and security checks pass. |

## Acceptance criteria

1. A learner can explore a structured backend-system-design curriculum and filter questions by topic, difficulty, format, and completion status.
2. Redis and Kafka each contain detailed learning topics and at least twelve high-quality original questions for the initial release.
3. A question includes an expected answer outline, hints, follow-ups, rubric, and common pitfalls.
4. A learner can begin and complete a timed practice attempt, score it, bookmark a question, and see updated progress after reloading.
5. The study coach recommends a question and explains why it was chosen, without making a paid AI call.
6. Invalid API requests, cross-origin write attempts, and unauthenticated access to personal data fail safely.
7. The site works on mobile and desktop, supports keyboard navigation, and has clear loading/error/empty states.
8. The full quality suite passes before deployment instructions are marked ready.

## Risk controls

- Keep the catalog static and versioned to avoid an unbounded content-management surface.
- Keep answer text local to avoid storing sensitive interview responses.
- Isolate all provider-specific code behind adapters.
- Avoid any cloud account action until the project has passed local QA and you approve deployment.
