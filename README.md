# Interview Architect

An interview-preparation platform for backend and system-design candidates. It pairs a structured curriculum with detailed, original question prompts, practice workflows, progress tracking, and an explainable study coach.

**Live demo:** [interview-architect.kritikamodi.workers.dev](https://interview-architect.kritikamodi.workers.dev)

The first release covers eight backend-system-design modules, with especially deep coverage of **Redis** and **Kafka**. It includes databases, APIs, caching, reliability, distributed systems, observability, and security case studies.

## Product principles

- **Free to run and host:** React frontend, Cloudflare Worker API, and Cloudflare D1 storage fit within their free tiers for a personal project.
- **No paid AI dependency:** The study coach uses a deterministic recommendation engine. An optional provider interface can support a real AI model later without making the app depend on one.
- **Original, structured learning content:** Questions live as versioned, validated files in this repository—not scraped interview material.
- **Privacy-minded by default:** Answer drafts stay in the learner's browser. The backend stores only the progress data needed for the app.

## Stack

- Frontend: React, TypeScript, Vite, accessible CSS components
- Backend: Hono on Cloudflare Workers
- Database: Cloudflare D1 (SQLite), with local development support
- Shared code: TypeScript domain and content-validation packages
- Testing: Vitest, Worker/API integration tests, Playwright end-to-end tests
- Deployment: Cloudflare Workers + Static Assets, GitHub Actions checks

## Included in this release

- 8 modules, 18 topics, and 68 original published prompts (Redis: 20; Kafka: 24)
- Searchable question bank with filters, progressive hints, reference answer outlines, follow-ups, and scoring rubrics
- Timed practice, bookmarks, spaced-review signals, and an explainable deterministic study coach
- Anonymous cookie-backed progress persistence with Cloudflare D1 migrations
- Automated content, domain, API, build, and browser end-to-end checks
- Cloudflare Workers + Static Assets deployment configuration that remains free-first for a personal project

## Run locally

Requires Node 22 or later.

```bash
npm ci
npm run dev
```

The development command applies local D1 migrations and starts the Vite frontend at `http://127.0.0.1:5173` plus the Worker API at `http://127.0.0.1:8787`.

## Verify

```bash
npm run content:validate
npm run typecheck
npm test
npm run build
npm run test:e2e
```

See [the architecture](docs/architecture.md), [QA strategy](docs/qa-strategy.md), and [free deployment guide](docs/deployment.md) for the implementation details and release workflow.
