# Production deployment and operations

This runbook documents the supported single-host deployment: Docker Compose, Caddy and PostgreSQL. Caddy is the only public-facing service; the Next.js container is not published and PostgreSQL lives on an internal Docker network.

**Shortcut:** every step below has a `just` recipe (`just --list`). A complete release is `just deploy-release`.

> **Verification status.** The application, migrations, role model, environment validator, smoke test and health endpoints were exercised against a real PostgreSQL 16 server and a production `next build`/`next start`. The Docker images, the Compose file and the Caddy configuration were **not** built or started in the environment where this runbook was written (no Docker available). Treat the first deployment as a rehearsal on a staging host.

## 1. Deployment architecture

```text
Internet
   │ HTTPS :443 / HTTP :80
   ▼
Caddy ──────────────── TLS certificates, HTTPS redirects, security headers, body-size limit
   │ private edge network
   ▼
Next.js standalone server :3000
   │ private backend network
   ▼
PostgreSQL :5432 ───── persistent Docker volume
```

The web and migrator containers run as unprivileged users with read-only root filesystems, narrow temporary mounts, dropped Linux capabilities and `no-new-privileges`. PostgreSQL is never published to the host. A bootstrap administrator creates two non-superuser roles:

- **Migration role** owns schema objects and may create/alter them. Only the one-shot migrator receives its password.
- **Runtime role** is what the web container uses. It has `SELECT/INSERT/UPDATE/DELETE` and sequence access, and cannot change the schema or triggers.

## 2. Requirements

- A Linux host with Docker Engine and Docker Compose v2.
- A DNS A record for the hostname (AAAA only if IPv6 works end to end); inbound TCP 80 and 443 open (UDP 443 optional, for HTTP/3).
- Disk for the PostgreSQL volume, images and off-host backups.
- The committed `pnpm-lock.yaml` (the image builds with `pnpm install --frozen-lockfile`) and the committed migrations under `drizzle/`.
- Outbound access from the image builder to the npm registry **and Google Fonts**: the app uses `next/font/google`, which downloads fonts at build time.
- `curl` on the host for the smoke test.

Node.js 26 (`.nvmrc`) is used for build and runtime. If `pnpm install` in the Docker build is rejected by pnpm's release-age policy (`minimumReleaseAge`), the lockfile references a package that was published very recently: wait or review the change; do not disable the policy in the Dockerfile.

## 3. Prepare environment and secrets

```bash
just deploy-init-env      # copies .env.production.example, generates four secrets, chmod 600
$EDITOR .env.production   # set APP_DOMAIN
just deploy-check
```

`deploy-init-env` refuses to overwrite an existing file. Doing it by hand is equivalent: `cp .env.production.example .env.production && chmod 600 .env.production`, then put a different `openssl rand -hex 32` value in each of `POSTGRES_ADMIN_PASSWORD`, `APP_DB_PASSWORD`, `MIGRATION_DB_PASSWORD` and `BETTER_AUTH_SECRET`.

`deploy-check` (`scripts/validate-production-env.sh`) parses the file **without executing it** and rejects: example placeholders, short or reused secrets, characters that are unsafe in secrets, group/other-readable permissions, a missing `pnpm-lock.yaml`, `conf/Caddyfile` or migrations, a stray `package-lock.json`, an invalid `DB_SSL`, non-numeric pool settings, `:latest` image tags, overlapping database roles and an invalid Compose configuration. It warns when public registration is enabled.

Keep `.env.production` out of source control. Compose mounts the values into the containers as secrets below `/run/secrets`; the application reads `*_FILE` paths rather than receiving passwords as ordinary environment variables. This uses environment-backed Compose secrets for a single Linux host; it is not a Swarm stack file. For a managed orchestrator, use the platform's secret manager (the application accepts `NAME` or `NAME_FILE` for every secret).

Keep `POSTGRES_ADMIN_USER`, `POSTGRES_DB`, `APP_DB_USER` and `MIGRATION_DB_USER` stable once the database volume exists.

## 4. Dependencies and migrations

Production builds are controlled by two committed artefacts:

- `pnpm-lock.yaml`: the Docker build uses `--frozen-lockfile`, so it fails when `package.json` and the lockfile disagree.
- `drizzle/<timestamp>_<name>/migration.sql`: applied in order by the migrator.

The migration history is:

1. `…_tranquil_ricochet`: tables generated from `src/db/schema.ts` (the generated name is arbitrary; keep it, renaming applied migrations breaks history).
2. `…_audit_and_updated_at_triggers`: hand-written SQL that Drizzle cannot generate. It adds the `tables.updated_at` trigger, the field-level audit trigger, and the append-only protection of `record_changes` (see [audit-history.md](audit-history.md)). **Without this migration the deployment has no audit trail**, which is why `/api/health/ready` reports "not ready" when the audit trigger is missing.

For each later schema change: edit `src/db/schema.ts`, run `just generate-migration` (use `pnpm db:generate --custom` for hand-written SQL), review the SQL for data loss/locking/defaults/foreign keys, test against an empty database and a production-like copy, and commit the schema change and migration together. Never run `drizzle-kit push` against production or hand-edit applied migrations. Drizzle's `migrate` applies the SQL files and records them in its migration log: <https://orm.drizzle.team/docs/drizzle-kit-migrate>.

The Drizzle packages are pinned to `1.0.0-rc.5`. They are release candidates; plan a deliberate upgrade to a stable release.

## 5. First deployment

```bash
just deploy-build     # web + migrator images
just deploy-db        # start PostgreSQL and wait until healthy
just deploy-migrate   # one-shot migrator, migration role
just deploy-up        # web + Caddy
just deploy-smoke     # post-deployment checks
```

Each recipe wraps `docker compose --env-file .env.production -f compose.production.yaml …`. If you prefer images built by CI, set immutable `APP_IMAGE` / `MIGRATOR_IMAGE` tags in `.env.production`, `docker compose … pull web migrate`, and deploy with `up -d --no-build`. Never deploy mutable `latest` tags (the validator rejects them).

On the first start PostgreSQL runs `deploy/postgres/init/10-create-app-role.sh`, which creates the two roles and these grants:

- Migration role: `CONNECT` and **`CREATE` on the database**, plus `CREATE` on schema `public`. Database-level `CREATE` is required because `drizzle-kit migrate` always executes `CREATE SCHEMA IF NOT EXISTS public`, and PostgreSQL checks that privilege before it notices the schema exists. The role still cannot create roles or touch other databases.
- Runtime role: `USAGE` on `public` and default `SELECT/INSERT/UPDATE/DELETE` plus sequence privileges on objects the migration role creates.

Init scripts run only when the data directory is empty. **Upgrading an existing volume** created from an earlier version of this script needs one statement as the admin (otherwise migrations fail with `permission denied for database`):

```bash
docker compose --env-file .env.production -f compose.production.yaml exec database \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "GRANT CREATE ON DATABASE \"$POSTGRES_DB\" TO \"$MIGRATION_DB_USER\""'
```

Changing users or passwords in `.env.production` does not rewrite existing roles; rotate them deliberately with SQL and coordinated secret updates.

### TLS to PostgreSQL

The bundled PostgreSQL has no TLS, and traffic stays on a private Docker network, so `DB_SSL` defaults to `disable`. This matters for the migrator too: `drizzle-kit` forces TLS for host/user/password credentials unless told otherwise, which fails against a server without TLS ("The server does not support SSL connections"). `drizzle.config.ts` therefore passes `ssl: false` unless `DB_SSL` is `require` or `verify-full`, which you need for a managed database.

### Caddy

Caddy obtains and renews certificates automatically; keep `caddy_data` persistent (deleting it discards certificate state and can hit issuance rate limits). `conf/Caddyfile` adds security headers, limits request bodies to 2 MB, compresses ordinary responses, and serves `/api/dashboard/changes` (server-sent events) with `flush_interval -1` and **without** compression, so live updates are not buffered. After editing it run `just caddy-reload`.

The Compose file mounts `./conf/Caddyfile`. (An earlier revision referenced `./Caddyfile`, which does not exist.)

## 6. Authentication and access control

The application protects pages with a session check in `src/proxy.ts`, and every API route and server action with its own check (`guardRoute` / `requireSession`). Authorization is **session-only**: there are no roles, ownership rules or per-user permissions, so every account has the same access to the dashboard. Consequently:

- `AUTH_DISABLE_SIGN_UP` defaults to `true` in production. Anonymous visitors are redirected to `/auth/login`, and `POST /api/auth/sign-up/email` answers `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`.
- Production refuses to start unless `BETTER_AUTH_SECRET` has at least 32 characters and `BETTER_AUTH_URL` is an `https://` origin (plain `http://localhost` is tolerated so `next start` can be tried locally). Cookies are `Secure` when the URL is https, and Better Auth's rate limiter is on (`AUTH_RATE_LIMIT=false` exists for automated tests only).
- Email verification and password-reset delivery are not configured.

Bootstrapping the first user:

1. Restrict site access at the firewall or an upstream access proxy.
2. Set `AUTH_DISABLE_SIGN_UP=false` and recreate only the web service: `docker compose --env-file .env.production -f compose.production.yaml up -d --force-recreate web`.
3. Register the intended account(s).
4. Set `AUTH_DISABLE_SIGN_UP=true`, recreate `web` again, then run `just deploy-smoke` (it asserts that sign-up is closed).
5. Lift the temporary network restriction.

Do not leave registration open until role-based authorization and any account-verification workflow exist. `BETTER_AUTH_TRUSTED_ORIGINS` is restricted to the canonical origin; do not add wildcards or localhost in production. <https://better-auth.com/docs/reference/security>

**What the dashboard layer enforces** (all covered by tests):

- the generic table actions accept only an allowlisted table (`tables`); Better Auth tables, notifications and the audit log cannot be reached through them;
- the actor recorded as author/last editor is always the session user's id, never a client value; client-supplied `author_id`, `last_editor_id`, `created_at` and `updated_at` are discarded;
- `updated_at` is maintained by the database and only moves when a row really changes.

## 7. Environment variable reference

| Variable                                                                                                     |       Required | Purpose                                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | -------------: | ------------------------------------------------------------------------------------------------------- |
| `APP_DOMAIN`                                                                                                 |  Yes (Compose) | Public hostname used by Caddy and Better Auth.                                                          |
| `POSTGRES_ADMIN_USER`                                                                                        |            Yes | PostgreSQL bootstrap user; normally `postgres`.                                                         |
| `POSTGRES_ADMIN_PASSWORD`                                                                                    |   Yes (secret) | Bootstrap password; mounted only into PostgreSQL.                                                       |
| `POSTGRES_DB`                                                                                                |            Yes | Database name.                                                                                          |
| `APP_DB_USER` / `APP_DB_PASSWORD`                                                                            |            Yes | Runtime role (DML only) and its secret.                                                                 |
| `MIGRATION_DB_USER` / `MIGRATION_DB_PASSWORD`                                                                |            Yes | Schema-owner role and its secret; mounted only into the migrator and DB bootstrap.                      |
| `BETTER_AUTH_SECRET`                                                                                         |   Yes (secret) | Signing/encryption secret, at least 32 characters.                                                      |
| `AUTH_DISABLE_SIGN_UP`                                                                                       |             No | `true`/`false`; default `true` in production, `false` otherwise.                                        |
| `AUTH_RATE_LIMIT`                                                                                            |             No | `true`/`false`; default `true` in production. Disable only for automated tests.                         |
| `DB_SSL`                                                                                                     |             No | `disable` (default) / `require` / `verify-full`. Applies to the app and the migrator.                   |
| `DB_POOL_MAX`                                                                                                |             No | Connections per web container; default `10`.                                                            |
| `DB_CONNECTION_TIMEOUT_MS`                                                                                   |             No | Default `5000`.                                                                                         |
| `DB_IDLE_TIMEOUT_MS`                                                                                         |             No | Default `30000`.                                                                                        |
| `DB_STATEMENT_TIMEOUT_MS`                                                                                    |             No | Default `30000`.                                                                                        |
| `APP_IMAGE`, `MIGRATOR_IMAGE`                                                                                |             No | Immutable image references when images come from a registry.                                            |
| `NEXT_PUBLIC_GITHUB_LINK`                                                                                    |             No | Public link compiled into the browser bundle at build time; rebuild to change.                          |
| `DB_HOST`, `DB_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS` | Set by Compose | What the application reads; `POSTGRES_PASSWORD` and `BETTER_AUTH_SECRET` also accept a `_FILE` variant. |

Invalid values fail fast at startup (a malformed number, boolean or `DB_SSL` stops the process rather than falling back silently). Inside the web container `POSTGRES_USER`/`POSTGRES_PASSWORD_FILE` are the runtime role; inside the migrator they are the migration role. `NEXT_PUBLIC_*` values are public browser configuration, not secrets, and are inlined at build time.

## 8. Routine updates

Deploy a reviewed release commit or immutable image tag, never an unreviewed working tree.

```bash
git pull --ff-only
just deploy-release     # check → build → db → backup → migrate → up → smoke
```

Individual steps stay available (`deploy-check`, `deploy-build`, `deploy-backup`, `deploy-migrate`, `deploy-up`, `deploy-smoke`); the release recipe stops at the first failure, so a failed backup or migration never reaches `deploy-up`.

Make migrations forward-compatible with the running release where possible (expand/contract): add nullable columns/tables first, deploy code that uses them, backfill, remove obsolete columns in a later release, and avoid long blocking DDL at peak traffic.

## 9. Rollback strategy

Keep the previous known-good application and migrator image references for each release. If a release fails before a migration runs, redeploy the previous image and verify health. If a migration has already run, do **not** assume the old application image is compatible with the new schema and do not automatically run reverse SQL. Prefer a tested forward-fix migration. For destructive or unrecoverable data changes, restore the last verified backup into a separate database, validate it, and then perform a planned cutover.

For an image rollback, update `APP_IMAGE` in `.env.production` to the immutable image tag recorded for the previous release, then pull and run it:

```bash
docker compose --env-file .env.production -f compose.production.yaml pull web
docker compose --env-file .env.production -f compose.production.yaml up -d --no-build web caddy
```

Keep `.env.production` at mode `0600`. This rolls back application code only; it does not reverse a database migration.

## 10. Backups and recovery

The PostgreSQL data directory is stored in the named `postgres_data` volume. A Docker volume is persistence, not a backup.

Create and validate a custom-format dump:

```bash
./scripts/backup-postgres.sh
```

The script uses `pg_dump -Fc`, checks that the archive can be listed by `pg_restore`, writes a SHA-256 checksum, and creates files with restrictive permissions. It writes to `backups/` by default. To encrypt before retaining the archive, install `age` on the host and set a recipient public key:

```bash
BACKUP_AGE_RECIPIENT='age1...' ./scripts/backup-postgres.sh
```

When encryption succeeds, the plaintext dump is removed. Keep the matching private identity outside the production host. Copy the resulting dump and checksum off-host, apply a retention policy, and monitor backup-job failures and disk usage. The script refuses an environment file readable by group/other users and uses `flock` to prevent overlapping backup runs. The script is a one-shot operation; schedule it with cron/systemd or a managed backup service. Example crontab entry (run under a dedicated host account that has access to Docker and the protected environment file):

```cron
15 2 * * * cd /srv/template-next && BACKUP_AGE_RECIPIENT='age1...' ./scripts/backup-postgres.sh >> /var/log/template-next-backup.log 2>&1
```

Separately synchronize the completed archive and checksum to encrypted off-host storage. Restrict access to backup logs and remember that membership in the Docker group is effectively root-level access on the host. Test restores into a separate empty database regularly; an untested dump is not a verified backup.

Restore is destructive to the target database. Prefer a separate recovery database first. Verify the checksum before restoring, for example `sha256sum -c backups/template-next-YYYYMMDDTHHMMSSZ.dump.sha256`. For an encrypted dump, decrypt to a restricted temporary file on a trusted machine first (`umask 077 && age -d -i /secure/path/age-identity.txt -o /secure/path/restore.dump backup.dump.age`) and use that file in the commands below.

```bash
# Create a temporary target database owned by the migration role.
docker compose --env-file .env.production -f compose.production.yaml exec database \
  sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE template_next_restore OWNER \"$MIGRATION_DB_USER\";"'

# Restore objects as the migration owner.
cat backups/template-next-YYYYMMDDTHHMMSSZ.dump | \
  docker compose --env-file .env.production -f compose.production.yaml exec -T database \
  sh -c 'pg_restore -U "$POSTGRES_USER" --role "$MIGRATION_DB_USER" -d template_next_restore --no-owner'

# Recreate runtime grants in the recovery database (default privileges are per database).
cat <<'SQL' | docker compose --env-file .env.production -f compose.production.yaml exec -T database \
  sh -c 'psql -U "$POSTGRES_USER" -d template_next_restore -v app_user="$APP_DB_USER" -v migration_user="$MIGRATION_DB_USER"'
GRANT CONNECT ON DATABASE template_next_restore TO :"app_user";
GRANT USAGE ON SCHEMA public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
SQL
```

After validation, schedule a maintenance window and perform a planned cutover. The grants above are needed because PostgreSQL default privileges are scoped to a database. Do not run `docker compose down -v` during normal deployment; `-v` deletes the persistent database and Caddy volumes.

## 11. Health checks, logs and incidents

- `GET /api/health/live` — process liveness; does not query PostgreSQL.
- `GET /api/health/ready` — runs one bounded (3 s) query that checks PostgreSQL, the Better Auth `user` table, the `tables` table and the audit trigger. Returns `503 {"status":"unavailable"}` without any connection detail when the database is down or migrations are missing. The web container's Docker health check uses this endpoint.
- `just deploy-ps`, `just deploy-logs [service]` — service state and logs (Compose rotates JSON logs to bounded local files).
- `just deploy-smoke` — anonymous end-to-end checks: probes, 401s on protected APIs, redirect to login, sign-up closed, security headers.

For an incident, capture logs and service state, check host memory/disk and the PostgreSQL volume, check readiness, and verify the last backup before anything destructive. Do not expose database ports for troubleshooting; use an SSH tunnel or a private management network.

Server-sent events (`/api/dashboard/changes`) keep one HTTP connection per open dashboard tab. The event bus is **in-process**: with a single web container (the supported topology) every client sees every change. If you ever run several web replicas, a change made on one replica is not pushed to clients connected to another; add a shared bus (for example PostgreSQL `LISTEN/NOTIFY`) first.

## 12. Operational safeguards and known gaps

- **TLS:** expose only 80/443; retain Caddy's `/data` and `/config` volumes; confirm issuance and renewal after DNS/firewall changes.
- **Database isolation:** not host-published; separate non-superuser runtime and migration roles; the runtime role cannot change schema, triggers or grants. The audit table rejects `UPDATE`/`DELETE` for every role (the one exception: clearing `actor_id` when an account is deleted).
- **Fail-fast configuration:** missing or malformed secrets, a short auth secret or a non-https production URL stop the process at startup instead of running insecurely.
- **Secrets:** `.env.production` mode `0600`, never committed, never in build args, images, logs or `NEXT_PUBLIC_*`. Rotate as a coordinated change; changing `BETTER_AUTH_SECRET` invalidates sessions.
- **Schema changes:** reviewed, committed migrations only.
- **Backups:** schedule `scripts/backup-postgres.sh`, encrypt, copy off-host, monitor age, test restores. The repository provides the one-shot script, not a scheduler, retention policy or off-host integration.
- **Authorization:** session-only (see section 6). Add roles/ownership before allowing multiple trust levels.
- **Email:** verification and password reset are not configured.
- **Rate limiting:** Better Auth's built-in limiter is on in production (in-memory, per container). Caddy has no built-in rate limiter; add edge limits or a WAF for `/api/auth/*` and any new public flow.
- **Content-Security-Policy:** not set; the MUI/Emotion styling needs inline styles, so a policy has to be designed and tested deliberately.
- **Images:** `node:26-bookworm-slim`, `postgres:17-alpine` and `caddy:2-alpine` track major lines. Pin digests in your release process for strict reproducibility. Do not change PostgreSQL's major version in place on an existing volume.
- **Capacity:** `DB_POOL_MAX` is per web container; multiply by replicas and add migration/admin connections when sizing `max_connections`.
- **Monitoring:** Compose health checks do not alert or restart on their own. Add external checks for `/api/health/ready`, container health, disk, certificate expiry and backup age.
- **Host security:** patch the OS and Docker, restrict SSH, and remember that Docker-group membership is effectively root.
- **Known repository issue:** `next build` runs a TypeScript check, and six errors in UI components (MUI v9 typings: `Stack`/`Typography` system props, `Checkbox inputRef`, and a `FieldConfig` generic variance) predate the changes in this document and make `pnpm build` — and therefore the Docker build — fail until they are fixed. `pnpm typecheck` lists them.

## 13. Troubleshooting

| Symptom                              | Checks                                                                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image build fails at `pnpm build`    | Run `pnpm typecheck`; see the known repository issue above. Fonts need outbound access to `fonts.googleapis.com`.                                                     |
| `pnpm install` rejected in the build | pnpm's `minimumReleaseAge` policy flagged a very recent package in the lockfile. Wait, or review it; do not disable the policy in the image.                          |
| Web stays unhealthy                  | `just deploy-logs web`; `curl` the ready endpoint from inside the network; verify `DB_HOST=database`, runtime role/password, and that migrations ran.                 |
| Ready returns 503                    | Logs show `reason: database` (unreachable/credentials) or `reason: schema` (migrations or audit trigger missing: run `just deploy-migrate`).                          |
| Web exits immediately                | A startup check failed: `BETTER_AUTH_SECRET` under 32 characters, `BETTER_AUTH_URL` not https, or a malformed `DB_*`/`AUTH_*` value. The log names the variable.      |
| `permission denied for database`     | The migration role lacks `CREATE` on the database (volume created before this fix): run the `GRANT CREATE ON DATABASE` statement in section 5.                        |
| "server does not support SSL"        | The migrator is forcing TLS: make sure `drizzle.config.ts` is the committed version and `DB_SSL` is unset/`disable` for the bundled database.                         |
| PostgreSQL init role missing         | The volume already existed; init scripts run only for an empty data directory. Create/repair roles manually as the admin.                                             |
| Caddy cannot issue a certificate     | Verify public DNS, inbound 80/443, no conflicting listener, and persistent `caddy_data`/`caddy_config`.                                                               |
| Live updates stall behind the proxy  | Check that `/api/dashboard/changes` is served by the `flush_interval -1` block in `conf/Caddyfile`, and that no other proxy in front buffers `text/event-stream`.     |
| Auth cookie rejected                 | Public URL must be https, trusted origins must match exactly, proxy headers must not be rewritten, host clocks synchronized.                                          |
| Migration fails                      | Check DB health, migration-role grants, that the migrator image was rebuilt from the same commit as the web image, and that `drizzle/` contains the needed migration. |
| Disk filling                         | Check Docker images/logs, the PostgreSQL volume and backup retention; move backups off-host and prune only known-unused images.                                       |
