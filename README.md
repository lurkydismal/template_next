# Template Next

A Next.js application using Better Auth, PostgreSQL, and Drizzle ORM.

## Development

1. Install the Node.js 26 Active LTS runtime (the repository includes `.nvmrc`) and pnpm.
2. Copy `.env.example` to `.env` and replace the example secrets.
3. Start PostgreSQL and create the configured database/user.
4. Install dependencies with `pnpm install`.
5. Start the application with `pnpm dev`. `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and the PostgreSQL connection variables are required at runtime; see `.env.example`.

Database schema changes are managed with Drizzle migrations:

```bash
just generate-migration
just migrate
```

Review generated SQL before applying it. Do not use `drizzle-kit push` against production.

## Production deployment

The supported single-host deployment uses Docker Compose, Caddy for automatic HTTPS, and PostgreSQL on a private container network. It includes separate migration/runtime database roles, health probes, a production environment validator, and a validated backup script. Start with [the production deployment and operations runbook](docs/DEPLOYMENT.md).

Important production limitations:

- Email verification and password-reset email delivery are not configured.
- The current authorization layer checks for a signed-in session but does not implement per-user roles or dashboard permissions. Do not enable public registration unless every registered user is intended to receive the same dashboard access.
- The initial Drizzle migration and `package-lock.json` are not present in this source archive. Generate/review/commit the migration and create/commit the lockfile before the first controlled production deployment; see the runbook.

## Tests

Install dependencies with `pnpm i ci` (the committed lockfile is required for reproducible CI installs), then use the following suites:

```bash
pnpm test:unit         # pure validation, form parsing, auth and event-bus behavior
pnpm test:integration  # server actions, API authorization, notification validation and SSE routes
pnpm test                  # all Vitest unit and integration tests
just install-e2e-tests-deps
pnpm test:e2e          # browser-level auth, table validation, CRUD and live update flow
```

End-to-end tests require a dedicated disposable PostgreSQL database with the Drizzle migrations applied and an existing test account. Set `E2E_USER_EMAIL` and `E2E_USER_PASSWORD`; see [tests/e2e/README.md](tests/e2e/README.md). `E2E_BASE_URL` can target an already-running test deployment. Never point tests at production data.

Coverage includes:

- Unit: row-dialog field validation (number bounds, UUID, hex, IP/ports, async lookup and lookup failure, grouped requirements), FormData parsing, initial row values, session-identity checks, and event-bus delivery/unsubscribe/failure isolation.
- Integration: create/update persistence arguments, server-owned audit metadata, failed/missing-row behavior, authentication before cached row reads, notification request authorization and validation, notification persistence/broadcast, and authenticated SSE delivery/cleanup.
- End-to-end: anonymous dashboard/SSE denial, required-field feedback, create and update flows, and live refresh in a second authenticated browser tab.

Current authorization tests assert the implemented authentication boundary: anonymous users cannot read or mutate dashboard data, notifications, or the live event stream. They do not imply role-based authorization; the application does not yet define roles or per-table permissions.
