# Requirements Discovery Document

**Artifact slug:** `design-studio-practice-workflow` (paired SDD: `design-studio-practice-workflow.md`)  
**Workflow ID:** `ceb65545-76fa-4dc7-97a7-1f7eff67ae1e`  
**Date:** `2026-08-09T10:02:03.000Z`  
**Status:** READY_FOR_SDD  
**Work type:** `feature`

## 1. Business objective

Transform Interview Architect's single-question self-review page into a credible SDE-2 system-design practice experience. Backend and system-design candidates should be able to run a focused Learn or Mock session, record a structured design response, respond to deterministic interviewer probes, receive evidence-based feedback, and resume the right next session from the product's existing dashboard and question bank. Success means a learner can complete that full loop without an account, paid AI dependency, or loss of privacy for free-form draft content.

## 2. Functional requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-1 | A learner can launch a question as either a guided **Learn** session or a timed **Mock** session from a stable question URL, with the selected mode visually and semantically clear. | Must | User intent and existing practice flow |
| FR-2 | The practice experience provides a structured workspace for clarifications, scale, architecture, APIs/data model, reliability, observability/security, trade-offs, and reflection instead of only one plain-text draft. | Must | User intent |
| FR-3 | Structured work autosaves locally under a session-aware storage model; a learner can leave, reload, and resume without exposing free-form answer content to D1 by default. | Must | Product privacy principle and existing local drafts |
| FR-4 | Learn mode provides progressive hints, answer guidance, and deterministic interviewer follow-ups; Mock mode hides coaching/answer material until submission while retaining the timer and follow-up sequence. | Must | User intent and existing question content |
| FR-5 | A learner can submit a completed session with rubric scores, see strengths, gaps, and a next-practice recommendation grounded in the rubric, and have the completion reflected in existing progress data. | Must | User intent and existing attempt/progress flow |
| FR-6 | The dashboard and question bank expose clear actions to start a selected mode, resume active practice, and start review-due work rather than only display informational signals. | Should | Live UI audit and existing APIs |
| FR-7 | Completing a server-backed attempt is safely retryable when a network response is lost; the client must distinguish a successful replay from a conflicting second completion. | Must | Backend reconnaissance |
| FR-8 | The anonymous data-erasure action removes every Interview Architect browser-owned draft/session key as well as server-owned learner data. | Must | Privacy audit |

## 3. Non-functional requirements

| ID | Category | Requirement | Metric / verification |
|---|---|---|---|
| NFR-1 | Privacy | Free-form structured workspace content stays on the device by default. Any newly persisted learner metadata has a documented deletion path. | API and browser-storage deletion tests; no artifact payload in D1 requests by default. |
| NFR-2 | Reliability | Start and completion mutations remain idempotent across reloads and lost responses. | API integration tests cover start replay, completion replay, and true conflict handling. |
| NFR-3 | Accessibility | The studio is keyboard-operable, has visible focus and labels, respects reduced motion, and remains usable at mobile widths. | Playwright keyboard/mobile coverage and manual semantic review. |
| NFR-4 | Performance | Static question content and the practice shell render independently of background learner synchronization. | No full-page personalized-data blocker for question rendering; build remains within existing CI checks. |
| NFR-5 | Maintainability | The existing large PracticePage is decomposed into focused components/hooks with shared types at domain/API boundaries. | Typecheck, focused tests, and review of responsibility boundaries. |

## 4. Repositories

### Involved

| Repo | Role | Notes |
|---|---|---|
| `kritikamodi-17/interview-architect` | modifiable | npm-workspace modular monolith: React/Vite frontend, Hono Worker API, Cloudflare D1, static validated curriculum, Vitest and Playwright. |

### Modifiable

- `kritikamodi-17/interview-architect` — primary repository. Relevant routes and state: `apps/web/src/pages/PracticePage.tsx`, `apps/web/src/hooks/useLearner.tsx`, `apps/web/src/pages/DashboardPage.tsx`, `apps/web/src/pages/QuestionBankPage.tsx`, `apps/api/src/app.ts`, `apps/api/src/repository/*`, `packages/domain/src/index.ts`, `infra/migrations`, and `tests/e2e`.

### Read-only

- None.

## 5. Constraints

- Preserve the Cloudflare Worker + D1 modular-monolith architecture; Redis and Kafka remain curriculum subjects, not application infrastructure.
- Preserve anonymous cookie-backed identity and privacy-first local drafts unless a later approved scope explicitly adds consented artifact synchronization.
- Do not introduce a paid AI requirement or a generic chat interface for this release.
- Use strict TypeScript, Zod validation, same-origin mutation protection, parameterized D1 statements, and append-only migrations.
- Update the D1 and in-memory repository implementations together when API persistence changes.
- Keep all validation, unit/API, build, and browser E2E gates passing.
- Base the feature branch on the repository's actual `main` branch.

## 6. External dependencies

| System | Purpose | Integration |
|---|---|---|
| Cloudflare Workers + Static Assets | Same-origin React SPA and Hono API hosting | `infra/wrangler.jsonc` |
| Cloudflare D1 | Anonymous learner progress and attempts | Worker `DB` binding and repository layer |
| Browser local storage | Current learner snapshot and private draft persistence | `useLearner` and `PracticePage`; to be centralized/refined |
| GitHub Actions | Quality verification | `.github/workflows/ci.yml` |

## 7. Assumptions

1. The existing static question schema (requirements, constraints, hints, follow-ups, answer sections, rubric) is sufficient for deterministic Learn and Mock sequencing in this release.
2. No account, peer collaboration, live AI interviewer, or cloud synchronization of free-form design artifacts is required for the first Design Studio release.
3. A stable question URL plus a `mode` query parameter is an acceptable initial deep-link model.
4. Rubric display labels can support immediate UI feedback, but long-lived cross-content analytics require stable rubric/skill identifiers in a later scoped change.
5. `main` is the intended integration branch because it is the checked-out and CI-protected branch in the repository.

## 8. Risks

| ID | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R-1 | Enlarging the existing monolithic PracticePage creates regression-prone UI state. | High | High | First extract focused session components and a session hook while retaining current behavior; add UI/E2E coverage per mode. |
| R-2 | Multiple browser keys leave private draft content behind after a learner erases data. | High | Medium | Centralize app storage ownership, clear the known prefix, and test deletion with and without browser `Clear-Site-Data` support. |
| R-3 | A lost completion response causes a false error or duplicate mastery update. | High | Medium | Persist operation receipts or equivalent completion-replay semantics, and test duplicate completion requests. |
| R-4 | Mock mode becomes a superficial visual toggle rather than interview-like practice. | Medium | Medium | Enforce different information visibility, timer behavior, and deterministic follow-up interaction in acceptance tests. |
| R-5 | Rich artifact features expand into server-side storage and account management prematurely. | Medium | Medium | Keep artifact drafts local in the default scope; make server synchronization a separate scope option. |

## 9. Open questions

- Should a completed Mock session retain private structured artifacts only locally forever, or offer an explicit future opt-in export/sync flow? Default assumption: local-only.
- Should the default delivery include deterministic “Today’s Plan” generation, or limit this release to clearer dashboard/review entry points and defer personalization data models? The SDD will present bounded options.
- Should the initial studio include a Mermaid text area, a visual canvas, or neither? Default assumption: plain structured sections first; no unsanitized diagram rendering.

## Appendix

### Glossary

- **Design Studio:** structured system-design practice workspace for a single question.
- **Learn session:** guided practice with progressively revealed help.
- **Mock session:** timed practice with coaching hidden until completion.
- **Interviewer probe:** a deterministic follow-up question selected from the question's existing editorial content.
- **Session artifact:** a local structured answer section, reflection, or future diagram source.

### Reference files reviewed

- `apps/web/src/pages/PracticePage.tsx`
- `apps/web/src/hooks/useLearner.tsx`
- `apps/web/src/pages/DashboardPage.tsx`
- `apps/web/src/pages/QuestionBankPage.tsx`
- `apps/api/src/app.ts`
- `apps/api/src/repository/repository.ts`
- `apps/api/src/repository/d1-repository.ts`
- `packages/domain/src/index.ts`
- `infra/migrations/0001_initial.sql` through `0004_idempotent_in_progress_attempts.sql`
- `tests/e2e/study-flow.spec.ts`

### Explicitly out of scope for the default release

- Paid-model integration, provider keys, or generic AI chat.
- Account/OAuth migration, peer practice, messaging, notifications, or social features.
- Redis, Kafka, queues, or microservices as Interview Architect runtime infrastructure.
- Server-side synchronization of free-form workspace artifacts without a separately approved privacy design.
