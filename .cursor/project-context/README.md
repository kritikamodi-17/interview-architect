# Interview Architect project context

This folder is the live, project-specific context for the SDLC workflow. It was generated from the repository on 2026-08-09 and is intentionally separate from the reusable delivery-kit templates.

| File | What it captures |
| --- | --- |
| `project.mdc` | Repository identity, workspaces, dependencies, verification commands, CI, and delivery constraints. |
| `architecture.mdc` | React/Worker/D1 boundaries, source layout, persistence, privacy, and integration points. |
| `coding-standards.mdc` | TypeScript conventions, test strategy, review expectations, and entropy policy. |
| `deployment.mdc` | Local and production Cloudflare deployment, CI, rollback, and operational facts. |
| `business-flows.mdc` | Learner-facing curriculum, practice, progress, review, coach, and privacy-deletion journeys. |

Known non-blocking gaps: there is no Jira integration, no staging environment, no GitHub deployment workflow, and no external APM configured. Those are documented as current repository facts rather than assumed capabilities.
