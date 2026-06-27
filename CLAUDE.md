# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This is a monorepo with **three independently-managed sub-projects** — there is no root `package.json` or workspace tooling. Each directory has its own `package.json` / `node_modules` and must be installed and run on its own (`cd <dir> && npm install`):

- **`errflow/`** — the published npm SDK (TypeScript, built with tsup). Embeds in a customer's Node app, captures errors, and POSTs enriched payloads to the API.
- **`api-errflow/`** — the NestJS 11 backend. Ingests errors, runs the AI auto-fix pipeline, and opens GitHub PRs.
- **`errflow-dashboard/`** — the Next.js 16 (App Router) dashboard.

Only `errflow/` is published to npm. `api-errflow` and `errflow-dashboard` are marked `private`.

## Commands

Run these from inside the relevant sub-project directory.

### errflow/ (SDK)
- `npm run build` — tsup, dual ESM/CJS output to `dist/`. Injects the package version at build time (see `tsup.config.ts` `define`).
- `npm run typecheck` — `tsc --noEmit`.
- `npm test` — vitest (`vitest run`). Tests live in `test/`.
- Single test file: `npx vitest run test/redact.test.ts`. By name: `npx vitest -t "masks JWTs"`.

### api-errflow/ (NestJS API)
- `npm run start:dev` — watch-mode dev server (default port 3001, global prefix `/api`).
- `npm run build` / `npm run start:prod` — compile to `dist/` and run.
- `npm run lint` — ESLint with `--fix`.
- `npm test` — Jest (config inline in `package.json`, `*.spec.ts`). Single test: `npx jest path/to/file.spec.ts` or `npm test -- -t "name"`.
- `npm run prisma:generate` — **regenerate the Prisma client after any schema change** (several services use `as any` on Prisma calls for fields that exist in the schema but require a regenerated client).
- `npm run prisma:migrate` / `npm run prisma:studio` / `npm run prisma:seed`.

### errflow-dashboard/ (Next.js)
- `npm run dev` / `npm run build` / `npm run start` / `npm run lint`.

**Local infrastructure:** the API needs a reachable **PostgreSQL** and **Redis** before it will start (Postgres via Prisma; Redis for the Bull queue and JWT blacklist/refresh storage). There is no bundled `docker-compose` — point `DATABASE_URL` / `DIRECT_DATABASE_URL` and `REDIS_URL` at your own instances.

The API will **refuse to boot** if required env vars are missing — `src/config/env.validation.ts` validates `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `GROQ_API_KEY` at startup (also asserts the two JWT secrets differ and `ENCRYPTION_KEY` is 64 hex chars).

## The core flow (spans all three projects)

This is the architecture that requires reading multiple files to grasp:

1. **SDK capture** (`errflow/src/monitor.ts`, `context.ts`): on an uncaught error (or `Errflow.capture()`), the SDK builds a payload with stack frames, ±5-line code snippets, git blame, recent git diff, breadcrumbs, and request context, then POSTs to the API. Secrets in collected code/diffs are masked (`redact.ts`) and a `beforeSend` hook can modify/drop the event.
2. **Ingest** (`api-errflow/src/modules/ingest/`): `POST /api/ingest`, authed by the `X-Errflow-Key` header (`ApiKeyGuard`; keys are SHA-256 hashed at rest). `IngestService` dedups within 60s by fingerprint, computes severity, flags regressions (a previously `FIX_READY` fingerprint reappearing), enforces the org's monthly fix limit, then enqueues a Bull job `process-error` on the `pipeline` queue (Redis).
3. **Pipeline** (`api-errflow/src/modules/pipeline/pipeline.service.ts`): decrypts the project's GitHub token (AES-256-GCM, `common/crypto/crypto.service.ts`), parses the stack, fetches the offending file from GitHub, then calls `AiFixService.generateAndDecide()`.
4. **AI fix decision** (`api-errflow/src/modules/ai-fix/ai-fix.service.ts`): Groq generates a fix (model from `GROQ_MODEL`, default `llama-3.1-8b-instant`). It becomes a PR only if confidence and changed-line count clear the thresholds (`MIN_CONFIDENCE_FOR_PR` / `MAX_CHANGED_LINES` constants at the top of the file) **and** the project's existing Jest tests pass (`runExistingTests` uses `spawnSync`, never a shell string). Otherwise the fix is saved for manual review.
5. **PR + notify**: on `open_pr`, the pipeline creates a branch, commits the fix, opens a PR (`github/github.service.ts`), records a `PullRequest`, increments `fixesUsedThisMonth`, and pushes a WebSocket notification to the org room. Failures/successes also email org owners/admins (Resend or Gmail SMTP).

The `ErrorStatus` / `FixStatus` / `Severity` enums in `prisma/schema.prisma` are the state machine that drives this flow.

## Auth & multi-tenancy (api-errflow)

- Every `User` belongs to an `Organization` (the tenant boundary). Roles: `OWNER`, `ADMIN`, `SUPER_ADMIN`.
- JWT access tokens are short-lived and blacklisted in Redis on logout; refresh tokens are stored in Redis and **validated against it on every refresh** (a stolen-but-revoked token is rejected). Lifetimes come from the `JWT_*_EXPIRES_IN` env vars. See `modules/auth/auth.service.ts`.
- Authorization for admin routes is enforced by `AdminGuard` / `SuperAdminGuard` applied at the admin controllers — **not** by URL string matching. `JwtStrategy.validate()` only validates the token and loads the user.
- GitHub OAuth: the **dashboard** performs the code exchange (NextAuth) and sends only the `access_token` to `POST /api/auth/github/oauth`; the API verifies identity by calling the GitHub API server-side. Never trust client-supplied email/identity.
- WebSocket (`websockets/websocket.gateway.ts`): the gateway joins each client to its own `org:{organizationId}` room from the verified JWT at connection time. There is intentionally no client-driven `join-room`.

## Dashboard auth (errflow-dashboard)

Two separate auth surfaces: regular users via NextAuth v5 (`lib/auth.ts`, Credentials + GitHub providers) and admins via a custom flow (`lib/admin-auth.ts`). The `/admin/**` routes are excluded from NextAuth middleware and use their own login. `NEXT_PUBLIC_API_URL` must include the `/api` prefix; CORS on the API is driven by `FRONTEND_URL`.

## SDK internals worth knowing (errflow)

- Breadcrumbs and request context live in an `AsyncLocalStorage` store so concurrent requests on a server can't leak context into each other's payloads; code outside any request scope falls back to a shared global store. `Errflow.middleware()` establishes the per-request scope.
- The SDK is **silent by default** — all internal logs route through `logger.ts` and only emit when `debug: true` (or `ERRFLOW_DEBUG=true`).
- Context collection (git blame/diff via `execFile`, snippets via `fs/promises`) is fully async and runs concurrently; git is never invoked through a shell.
- The SDK does **not** load `.env` itself — the host app is responsible for its own env.

## Known rough edges

- **`api-errflow` has no tests yet** — Jest is configured (`*.spec.ts`) but no spec files exist, so a green `npm test` there proves nothing. Only the SDK (`errflow/`) has a real suite.
- **`as any` on Prisma calls** in the auth/pipeline services target columns (e.g. encrypted GitHub token fields) that exist in `schema.prisma` but need a regenerated client — run `npm run prisma:generate` after pulling schema changes, and prefer fixing the types over adding more casts.
- **Dependency caveats before upgrading:** `api-errflow` uses `@nestjs/bull` (the older Bull integration, not `@nestjs/bullmq`), and `errflow-dashboard` is on `next-auth` **v5 beta** — both have migration friction, so don't bump them casually.

## Secrets

`.env` files are gitignored; only `.env.example` / `.env.template` (placeholders) are committed. The API's `ENCRYPTION_KEY` decrypts GitHub OAuth tokens stored in the DB — rotating it makes existing stored tokens unreadable (users must reconnect GitHub).
