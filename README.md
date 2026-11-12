# Template Next

A Next.js 16 template with email/password authentication (Better Auth), PostgreSQL (Drizzle ORM), a server-driven data grid for editing table rows, live updates over server-sent events, and an audited change history.

- [Quick start](#quick-start)
- [Everyday commands](#everyday-commands)
- [Configuration](#configuration)
- [How it works](#how-it-works)
- [Testing](#testing)
- [Production deployment](#production-deployment)
- [Project layout](#project-layout)
- [Known limitations](#known-limitations)

## Quick start

Requirements: Node.js 26 (`.nvmrc`), [pnpm](https://pnpm.io), Docker (for PostgreSQL), and optionally [just](https://github.com/casey/just).

```bash
cp .env.example .env          # local settings; replace BETTER_AUTH_SECRET
just docker-up                # PostgreSQL from compose.dev.yaml  (or use your own server)
pnpm install
just migrate                  # apply migrations
just run-debug                # pnpm dev → http://localhost:3000
```

Without `just`, use the underlying commands (`docker compose -f compose.dev.yaml up -d database`, `pnpm db:migrate`, `pnpm dev`). Registration is open in development, so create an account at `/auth/register`.

`just --list` shows every recipe, and `just help` prints them in file order.

## Everyday commands

| Task                              | Command                                                    |
| --------------------------------- | ---------------------------------------------------------- |
| Dev server                        | `just run-debug`                                           |
| Unit tests                        | `just run-unit-tests` · watch: `just run-unit-tests-watch` |
| Coverage                          | `just run-tests-coverage`                                  |
| Integration tests (real Postgres) | `just run-integration-tests`                               |
| E2E (HTTP) / E2E (browser)        | `just run-e2e-api-tests` / `just run-e2e-tests`            |
| Format, types, unit tests         | `just check`                                               |
| New migration (after schema edit) | `just generate-migration`, review the SQL, `just migrate`  |
| Validate migration history        | `just check-migrations`                                    |
| Production release                | `just deploy-release` ([runbook](docs/DEPLOYMENT.md))      |

Review generated SQL before applying it. Never use `drizzle-kit push` against production.

## Configuration

Server settings come from the environment. Every secret can be given directly (`NAME=value`) or as a file (`NAME_FILE=/run/secrets/name`), which is how the production Compose stack supplies them. Malformed values stop the process at startup instead of being ignored.

| Variable                                                                                   | Default (dev / prod)           | Purpose                                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------ |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DB_HOST`                             | required                       | Database connection. `DB_PORT` defaults to `5432`.                                   |
| `DB_SSL`                                                                                   | `disable`                      | `disable`, `require` or `verify-full`; also honoured by the migrator.                |
| `DB_POOL_MAX`, `DB_CONNECTION_TIMEOUT_MS`, `DB_IDLE_TIMEOUT_MS`, `DB_STATEMENT_TIMEOUT_MS` | `10`, `5000`, `30000`, `30000` | Pool limits and timeouts.                                                            |
| `BETTER_AUTH_URL`                                                                          | —                              | Public origin. Production requires `https://` (plain `http://localhost` is allowed). |
| `BETTER_AUTH_SECRET`                                                                       | — / ≥ 32 characters            | Signing secret. Generate with `just generate-token 48`.                              |
| `BETTER_AUTH_TRUSTED_ORIGINS`                                                              | the base URL                   | Comma-separated extra origins.                                                       |
| `AUTH_DISABLE_SIGN_UP`                                                                     | `false` / `true`               | Closes registration.                                                                 |
| `AUTH_RATE_LIMIT`                                                                          | `false` / `true`               | Better Auth rate limiter; disable only for automated tests.                          |
| `NEXT_PUBLIC_GITHUB_LINK`                                                                  | unset                          | Public link, compiled into the client bundle.                                        |

The full production variable list is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#7-environment-variable-reference).

## How it works

**Authentication and authorization.** Pages are protected by `src/proxy.ts` (anonymous visitors go to the login page, or to registration when sign-up is open). API routes and server actions do not rely on the proxy: each one checks the session itself (`guardRoute` for route handlers, `requireSession` for actions), and the checks are covered by tests. Authorization is session-only; there are no roles or per-user permissions, so every signed-in user has the same access.

**Table actions.** The dashboard reads and writes rows through generic server actions (`src/lib/dashboard/common`). They accept only an allowlisted table (currently `tables`), validate input with zod schemas derived from the Drizzle table, parse form values by column type, and stamp `author_id` / `last_editor_id` from the session. Client-supplied authorship and timestamp columns are discarded.

**Live updates.** After a successful write the server broadcasts a change event on an in-process bus. Signed-in browsers hold a server-sent-events connection to `/api/dashboard/changes` and refresh the affected grid; the client reconnects with exponential backoff and resynchronizes after a reconnect or after coming back online. The bus is per process, which suits the single-container deployment (see the runbook before running replicas).

**Audit history.** PostgreSQL triggers record field-level changes to `tables` in an append-only `record_changes` table and maintain `updated_at`, even for writes that bypass the app. Details: [docs/audit-history.md](docs/audit-history.md).

**Health.** `GET /api/health/live` (process) and `GET /api/health/ready` (database, schema and audit trigger) are public, uncached and reveal no internal detail.

## Testing

| Layer         | Location                  | Needs                                       | What it covers                                                                                                                                                                                              |
| ------------- | ------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit          | `tests/*.test.ts`         | nothing                                     | Env/config parsing, session guards, table-action authorization, `save()` create/update rules, form parsing, validation, schemas, notifications and SSE routes, event bus, health, the client reconnect hook |
| Integration   | `tests/integration`       | a migrated PostgreSQL (`TEST_DATABASE_URL`) | Real `save()`/`getRows()`, audit and `updated_at` triggers, append-only history, account deletion, check/foreign-key constraints, least-privilege role, concurrency                                         |
| E2E (HTTP)    | `tests/e2e/*.api.spec.ts` | built app + database                        | Real server: anonymous 401s, forged cookies, sign-in/out, notification API, SSE delivery and fan-out, health                                                                                                |
| E2E (browser) | `tests/e2e/*.ui.spec.ts`  | the above + Chromium                        | Redirects, dashboard grid and add-row control, stream connectivity across sessions                                                                                                                          |

```bash
just run-unit-tests          # fast, no services
just run-tests-coverage      # thresholds guard the security-critical modules

# Integration: a migrated database. For the strongest check, connect as the unprivileged
# runtime role of a database created by the production init script.
just docker-up && just migrate
just run-integration-tests   # or: just run-integration-tests postgres://app_role:pw@host:5432/db

# E2E: needs the same database, a production build and (for browser tests) Chromium
just build-release
just run-e2e-api-tests       # starts `next start` on :3100 with sign-up enabled, or set E2E_BASE_URL
just install-e2e-tests-deps && just run-e2e-tests
```

Notes: integration tests tag their rows with a per-run marker and remove what they can; audit rows are intentionally permanent. An integration run with a superuser skips the least-privilege assertions. See [docs/TESTING.md](docs/TESTING.md) for conventions.

## Production deployment

The supported topology is one host running Docker Compose: Caddy (automatic HTTPS) → Next.js → PostgreSQL on a private network, with separate migration and runtime database roles, a validated environment file, health probes, a post-deploy smoke test and an encrypted-backup script.

```bash
just deploy-init-env     # creates .env.production with generated secrets; set APP_DOMAIN
just deploy-release      # check → build → db → backup → migrate → up → smoke test
```

Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) first: it covers bootstrap of the first user, upgrades of existing volumes, rollback, backup and restore, monitoring, and a troubleshooting table.

## Project layout

```
src/app/                 routes: pages, /api/notifications, /api/dashboard/changes, /api/health/*
src/components/          data grid, row dialog, dashboard UI
src/db/                  Drizzle schema, relations, pool (src/db/index.ts)
src/lib/auth/            Better Auth setup and runtime config
src/lib/dal/             session guards for routes and actions
src/lib/dashboard/       table actions, event bus, client event hook
src/lib/env.ts           environment parsing (_FILE secrets, bounded numbers, booleans)
drizzle/                 committed migrations (including the audit/trigger migration)
deploy/ conf/ scripts/   Postgres init, Caddy config, env validator, backup and smoke scripts
tests/                   unit, integration/, e2e/
docs/                    DEPLOYMENT.md, TESTING.md, audit-history.md
```

## Known limitations

- Authorization is session-only (no roles or ownership); keep public registration closed unless every account should have full dashboard access.
- Email verification and password-reset delivery are not configured.
- The live-update bus is in-process, so only a single web container is supported.
- `pnpm typecheck` currently reports six errors in UI components (MUI v9 typings); because `next build` type-checks, they must be fixed before a production image can be built. See the runbook.
- The Docker/Compose/Caddy deployment files are documented but were not built or started when this documentation was written; rehearse on a staging host.
