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
