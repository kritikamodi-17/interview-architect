# QA strategy — Interview Architect

The project is not considered ready because the screens look complete. Each user-facing workflow needs automated evidence, with manual checks reserved for visual polish and deployment verification.

## Test pyramid

| Layer | What it verifies | Representative checks |
| --- | --- | --- |
| Content unit tests | Editorial data is structurally safe | Unique IDs/slugs, valid topic references, complete rubrics, no raw HTML, Redis/Kafka coverage. |
| Domain unit tests | Pure learning logic is correct | Mastery calculation, review scheduling, coach ranking, filtering, and progress percentages. |
| API integration tests | HTTP behavior and privacy boundaries | Malformed payloads return `422`, a missing session returns `401`, progress stays private, cross-origin writes are rejected, and retrying an attempt start reuses the active attempt. |
| Frontend checks | Build-time safety and main state rendering | Typecheck, production build, loading/empty/error states, semantic controls. |
| End-to-end smoke tests | A real learner journey works | Browse → filter → practice → self-score → refresh → updated dashboard. |

## Release-critical scenarios

1. A visitor opens the curriculum and can navigate to Redis and Kafka without an API dependency.
2. Search for `cache stampede` and `Kafka exactly once` returns relevant, published questions.
3. A learner can reveal hints in order, reveal the answer, apply a rubric self-score, and complete an attempt.
4. Reloading preserves the learner's server-side progress while keeping free-form answer drafts local.
5. The study coach recommends an appropriately timed question and explains its choice.
6. An invalid question ID, malformed score, or cross-origin write does not mutate learner data.
7. Keyboard-only navigation reaches the search controls, question content, hint buttons, and score actions in a visible focus order.
8. The UI remains readable at small mobile and wide desktop widths.

## Content-quality gate

The content validator is a hard gate. Every published question must have:

- a stable ID and slug
- a valid module and topic
- difficulty and estimated time
- answer outline, trade-offs, failure modes, and key terms
- at least one hint and two follow-up questions
- a three-to-five-dimension scoring rubric whose weights total 100
- no raw HTML or unsafe links

For senior-level Redis and Kafka questions, a human editorial review should also confirm that the answer names real consistency/failure caveats instead of presenting simplistic guarantees.

## Manual checks before sharing publicly

- Run a production build and test it with the Cloudflare local runtime.
- Verify Lighthouse mobile performance and WCAG AA contrast on the landing, catalog, and question views.
- Test the anonymous-session cookie on the deployed HTTPS domain.
- Confirm D1 migrations run against the remote database before enabling production traffic.
- Verify that no `.dev.vars`, tokens, user answer text, or test data are included in the Git history or build output.
