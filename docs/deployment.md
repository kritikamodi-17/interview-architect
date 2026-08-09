# Free deployment guide — Interview Architect

The app is designed for a single, free-first Cloudflare deployment:

```text
Cloudflare Worker + Static Assets
├── React application
├── Hono API at /api/v1/*
└── D1 (SQLite) learner-progress database
```

This is a good fit for a personal portfolio project because the static frontend, lightweight API, and small relational data set share one provider and one domain. Cloudflare documents free static-asset delivery, Worker limits, and D1 free-tier allowances in its [Static Assets guide](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), and [D1 pricing guide](https://developers.cloudflare.com/d1/platform/pricing/).

## Before first deployment

1. For local development, apply the checked-in D1 migrations before starting the app. The root `npm run dev` does this automatically; it is also available as an explicit command:

   ```bash
   npm run db:migrate:local
   npm run dev
   ```

2. Create a free Cloudflare account and sign in locally with `npx wrangler login`.
3. Create a D1 database:

   ```bash
   npx wrangler d1 create interview-architect
   ```

4. Copy the returned database ID into `infra/wrangler.jsonc` in place of the placeholder ID.
5. Apply the first migration remotely:

   ```bash
   npx wrangler d1 migrations apply interview-architect --remote --config infra/wrangler.jsonc
   ```

6. Run local verification before deployment:

   ```bash
   npm ci
   npm run content:validate
   npm run typecheck
   npm test
   npm run build
   ```

7. Deploy the Worker and static frontend:

   ```bash
   npx wrangler deploy --config infra/wrangler.jsonc
   ```

## Secrets and configuration

- Do not commit `.dev.vars`, cookies, Cloudflare API tokens, or future AI-provider keys.
- If an optional provider integration is enabled later, store its key as a Cloudflare secret with `wrangler secret put`, never in the frontend bundle.
- The MVP does not require a secret to run: it uses anonymous sessions and deterministic coaching.
- The frontend build includes an `_headers` file that sets a CSP, clickjacking protection, and a restrictive permissions policy for static assets. If you add a third-party script, image host, or font provider later, update that CSP deliberately.

## GitHub deployment automation

After the project is pushed to the personal GitHub account, a repository workflow can deploy on `main`. Store a least-privilege `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions secrets. Cloudflare documents the token-based GitHub Actions approach in its [deployment guide](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).

Deployment will remain a separate final action: it requires your Cloudflare account authorization and the resulting production URL will be verified before it is shared.
