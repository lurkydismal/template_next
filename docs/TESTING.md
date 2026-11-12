# Testing guide

Run everything that needs no services with `just run-unit-tests`. The other layers need a database; see the README for commands.

## Principles

- **Test the boundary that enforces the rule.** Authorization is asserted where it is enforced (route handlers, `save()`, server actions), not only at the proxy.
- **Prove a test can fail.** For security-relevant tests, temporarily break the code (for example stop stripping `author_id`, remove a `guardRoute` call, re-expose all tables) and confirm a test goes red.
- **Prefer real PostgreSQL for data rules.** Triggers, constraints, grants and the append-only audit table cannot be verified with mocks; those live in `tests/integration`.
- **Never assert on secrets or driver errors.** Error responses must stay generic; tests check that database messages do not leak.

## Layers and helpers

- `tests/helpers/db.ts` — `queryChain()` builds an awaitable stand-in for a Drizzle query builder; `sessionFor()` builds a session stub.
- `vitest.config.ts` aliases `server-only` to a stub and enforces per-file coverage thresholds for the security-critical modules. Coverage covers library, API, proxy and utility code; UI components are exercised by the E2E suite.
- Client hooks run under jsdom via the `// @vitest-environment jsdom` docblock with a fake `EventSource` and fake timers (`tests/clientEvents.test.ts`).
- Integration tests are skipped unless `TEST_DATABASE_URL` is set, and run files serially.
- E2E projects: `api` (no browser) and `chromium` (add Firefox/WebKit with `E2E_ALL_BROWSERS=true`). The Playwright client sends an `Origin` header, as browsers do, because Better Auth rejects cookie-bearing POSTs without one. When Playwright starts the server itself it enables sign-up and disables the auth rate limiter for that process only.

## Adding tests

1. New server action or route: add an anonymous-caller test (no data access, no side effects), then the behaviour.
2. New column kind or form field: extend `tests/formParserTypes.test.ts` (drizzle 1.0 reports compound type names such as `bigint int64`, `object date`; arrays are marked by `dimensions`).
3. New trigger or constraint: add a migration, then an integration test through both the application path and raw SQL.
4. New live-update behaviour: cover the bus (`changeEvents`), the stream (`routes.sse`) and the client hook (`clientEvents`).

## Not covered

- Visual/interaction details of the row dialog and grid (the browser E2E suite only checks that they render and connect).
- Docker image builds, Compose, Caddy and the backup script need Docker and are rehearsed manually (`just deploy-release` on staging, then `just deploy-smoke`).
