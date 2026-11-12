# Production deployment and operations

This runbook documents the supported single-host deployment. It uses Docker Compose, Caddy, and PostgreSQL. Caddy is the only public-facing service; the Next.js container is not published directly and PostgreSQL is isolated on an internal Docker network.

## 1. Deployment architecture

```text
Internet
   │ HTTPS :443 / HTTP :80
   ▼
Caddy ──────────────── TLS certificates and HTTPS redirects
   │ private edge network
   ▼
Next.js standalone server :3000
   │ private backend network
   ▼
PostgreSQL :5432 ───── persistent Docker volume
```

The application and migrator run as unprivileged users. The web and migrator containers have read-only root filesystems, narrowly scoped temporary mounts, dropped Linux capabilities, and `no-new-privileges`. PostgreSQL is not published to the host. A bootstrap administrator creates two non-superuser roles: a migration owner that can create/alter schema objects, and a runtime role limited to application DML (SELECT/INSERT/UPDATE/DELETE and sequence access).

## 2. Requirements

- A Linux host with Docker Engine and Docker Compose v2.
- A DNS A record for the deployment hostname pointing to the host. Add an AAAA record only when IPv6 is configured end to end.
- Inbound TCP ports 80 and 443 open in the host firewall and provider firewall. UDP 443 is optional but enables HTTP/3.
- Enough disk space for the PostgreSQL volume, Docker images, and off-host backups.
- A committed `package-lock.json` for repeatable production builds.
- Outbound access from the image builder to the pnpm registry and Google Fonts: the app currently imports `next/font/google`, which downloads font assets at build time.

Node.js 26 Active LTS is used for image build and runtime. The Docker image uses Next.js standalone output; Next.js documents standalone output as a self-contained Node server suitable for Docker. <https://nextjs.org/docs/app/getting-started/deploying>

## 3. Prepare environment and secrets

On the deployment host, create the deployment environment file:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Set `APP_DOMAIN` to the public hostname. Keep `POSTGRES_ADMIN_USER`, `POSTGRES_DB`, `APP_DB_USER`, and `MIGRATION_DB_USER` stable after the database volume has been initialized. The production environment check is run after the dependency lockfile is committed in the next section.

Generate four different high-entropy secrets:

```bash
openssl rand -hex 32  # PostgreSQL bootstrap account password
openssl rand -hex 32  # application runtime database password
openssl rand -hex 32  # migration database password
openssl rand -hex 32  # Better Auth secret
```

Put each generated value in the corresponding field in `.env.production`. Do not reuse these values. Better Auth requires a secret of at least 32 characters and recommends a high-entropy generated value. <https://better-auth.com/docs/installation>

Keep `.env.production` out of source control and restrict host access. Compose exposes these values to the selected containers as mounted secrets; the application reads `*_FILE` paths rather than receiving database/auth passwords as regular environment variables. Compose secrets are granted per service and mounted below `/run/secrets`. <https://docs.docker.com/compose/how-tos/use-secrets/>

The production Compose file uses environment-backed Compose secrets. This is intended for Docker Compose on a single Linux host; it is not a Swarm stack file. For a managed orchestrator, replace this secret source with the platform's secret manager.

## 4. Create a reproducible dependency lockfile

The supplied project archive does not contain `package-lock.json`. Do not treat floating dependency resolution as a stable production release. From the project root, run on a machine with registry access:

```bash
pnpm install --package-lock-only --ignore-scripts
```

Review and commit `package-lock.json`. Production Docker builds use `pnpm ci` when the lockfile exists. The Dockerfile has a warning-producing `pnpm install` fallback so the source can still be built before the lockfile is added; do not use that fallback for a controlled production release.

The Drizzle packages are pinned to the exact `1.0.0-rc.5` versions used by this project instead of the moving `rc` dist-tag. These are still release-candidate packages, not stable releases; plan and test a deliberate upgrade to a stable Drizzle release when the schema/API migration is supported. Current npm release information: <https://www.npmjs.com/package/drizzle-orm> and <https://www.npmjs.com/package/drizzle-kit>.

The Docker build stage sets non-secret placeholder database/auth values so Next.js can trace server modules without access to production credentials. They are not copied as runtime container environment settings; the final web container requires the real Compose-provided values and secret files.

Validate the production environment file and Compose interpolation before proceeding:

```bash
pnpm deploy:check
```

The check rejects example placeholders, short/reused secrets, unsafe file permissions, missing lockfiles, invalid hostnames/role names, overlapping database roles, and invalid Compose configuration. It warns when public registration is enabled.

## 5. Generate and commit the initial database migration

The source archive contains the current Drizzle schema but no generated migration SQL or journal. A new database will not have the application tables until this step is completed. This is a release prerequisite, not an automated step in the production startup path.

For local development, configure `.env` using `.env.example`, start a PostgreSQL instance, and then run:

```bash
pnpm install
pnpm db:generate
```

Review the SQL under `drizzle/`, test it against an empty disposable PostgreSQL database, and commit the generated SQL and `drizzle/meta/` files. Do not hand-edit migration history or run `drizzle-kit push` against production.

For each later schema change:

1. Update `src/db/schema.ts` (and related schema modules).
2. Run `pnpm db:generate`.
3. Review the generated SQL for data loss, locking, defaults, foreign keys, and index creation.
4. Test the migration against an empty database and a production-like database copy. Validate the app runtime role can read/write the changed tables.
5. Commit the schema change and migration together. Do not deploy a release whose `drizzle/` folder lacks the migration it needs.

Drizzle's `migrate` command applies generated SQL files and records successful migrations in its migration log. <https://orm.drizzle.team/docs/drizzle-kit-migrate>

## 6. First deployment

Run all commands from the repository root. The Compose file is explicit, so use the same flags consistently:

```bash
export COMPOSE_FILE=compose.production.yaml
export COMPOSE_ENV_FILES=.env.production
```

If your Compose version does not support `COMPOSE_ENV_FILES`, pass `--env-file .env.production -f compose.production.yaml` to each command instead.

Build the web and migration images locally:

```bash
docker compose --env-file .env.production -f compose.production.yaml build web migrate
```

For images built by CI and stored in a registry instead, set immutable `APP_IMAGE` and `MIGRATOR_IMAGE` tags in `.env.production` and pull them with `docker compose ... pull web migrate` rather than building on the host. Do not deploy mutable `latest` tags.

Start PostgreSQL and wait until it is healthy:

```bash
docker compose --env-file .env.production -f compose.production.yaml up -d database
docker compose --env-file .env.production -f compose.production.yaml ps
```

The first initialization runs `deploy/postgres/init/10-create-app-role.sh`. It creates two non-superuser roles:

- `MIGRATION_DB_USER` owns schema objects and can create/alter objects in `public`. Only the one-shot migrator receives its password.
- `APP_DB_USER` is the web runtime identity. It receives `USAGE` on `public` and default `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and sequence privileges on objects created by the migration role. It cannot create or alter schema objects.

The migration ledger is configured in `public`, where the migration role has the required permissions. PostgreSQL init scripts run only when the data directory is empty. Changing users or passwords in `.env.production` does not rewrite existing database roles; role creation and password rotation must be handled deliberately with SQL and coordinated secret updates.

Apply migrations using the dedicated one-shot migrator image:

```bash
docker compose --env-file .env.production -f compose.production.yaml --profile ops run --rm migrate
```

Start the application and Caddy:

```bash
docker compose --env-file .env.production -f compose.production.yaml up -d web caddy
```

Check health and recent logs:

```bash
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml logs --tail=100 web database caddy
curl --fail https://"$(grep '^APP_DOMAIN=' .env.production | cut -d= -f2-)"/api/health/live
curl --fail https://"$(grep '^APP_DOMAIN=' .env.production | cut -d= -f2-)"/api/health/ready
```

Caddy obtains and renews public certificates automatically. Keep `caddy_data` persistent; deleting it discards certificate/account state and may trigger issuance rate limits.

## 7. Authentication setup and access control

Production sign-up is disabled by default (`AUTH_DISABLE_SIGN_UP=true`). The current application does **not** implement email verification, password-reset email delivery, user roles, or per-user dashboard permissions. The protected route checks only whether a session exists. Consequently, any account that can register can access the same protected dashboard surface.

For a first user, choose a controlled bootstrap procedure:

1. Restrict access to the site at the firewall or upstream access proxy.
2. Temporarily set `AUTH_DISABLE_SIGN_UP=false` and recreate only the `web` service:
   `docker compose --env-file .env.production -f compose.production.yaml up -d --force-recreate web`
3. Create the intended account.
4. Set `AUTH_DISABLE_SIGN_UP=true` and recreate `web` again with the same command.
5. Remove the temporary network restriction only after checking that registration is disabled and the account is usable.

Do not leave public registration enabled until role-based authorization and any required account-verification workflow are implemented. Do not assume an unverified email address belongs to the registrant.

`BETTER_AUTH_URL` is configured to the canonical HTTPS origin. `BETTER_AUTH_TRUSTED_ORIGINS` is restricted to that origin. Better Auth validates trusted origins to reduce CSRF and open-redirect risks; do not add localhost or wildcard origins to production without a specific requirement. <https://better-auth.com/docs/reference/security>

## 8. Environment variable reference

| Variable                   |      Required | Purpose                                                                                 |
| -------------------------- | ------------: | --------------------------------------------------------------------------------------- |
| `APP_DOMAIN`               | Yes (Compose) | Public hostname used by Caddy and Better Auth URL.                                      |
| `POSTGRES_ADMIN_USER`      |           Yes | PostgreSQL bootstrap/superuser name; normally `postgres`.                               |
| `POSTGRES_ADMIN_PASSWORD`  |  Yes (secret) | Bootstrap account password; mounted only into PostgreSQL.                               |
| `POSTGRES_DB`              |           Yes | Database name; normally `template_next`.                                                |
| `APP_DB_USER`              |           Yes | Runtime role; normally `template_next_app`. It has DML/sequence privileges only.        |
| `APP_DB_PASSWORD`          |  Yes (secret) | Password for the web runtime role.                                                      |
| `MIGRATION_DB_USER`        |           Yes | Schema-owner/migration role; normally `template_next_migrator`.                         |
| `MIGRATION_DB_PASSWORD`    |  Yes (secret) | Password mounted only into the one-shot migrator and DB bootstrap.                      |
| `BETTER_AUTH_SECRET`       |  Yes (secret) | Better Auth signing/encryption secret; minimum 32 characters.                           |
| `AUTH_DISABLE_SIGN_UP`     |            No | Defaults to `true` in production and `false` otherwise.                                 |
| `DB_POOL_MAX`              |            No | Maximum PostgreSQL connections per web container; default `10`.                         |
| `DB_CONNECTION_TIMEOUT_MS` |            No | Pool connection timeout; default `5000`.                                                |
| `DB_IDLE_TIMEOUT_MS`       |            No | Idle connection lifetime; default `30000`.                                              |
| `DB_STATEMENT_TIMEOUT_MS`  |            No | PostgreSQL statement timeout; default `30000`.                                          |
| `NEXT_PUBLIC_GITHUB_LINK`  |            No | Public link compiled into the browser bundle at image build time. Rebuild to change it. |

Inside the web container, `POSTGRES_USER`/`POSTGRES_PASSWORD_FILE` refer to `APP_DB_USER`/`APP_DB_PASSWORD`. Inside the migrator they refer to `MIGRATION_DB_USER`/`MIGRATION_DB_PASSWORD`. Both receive only the secret they need. `POSTGRES_ADMIN_PASSWORD` is mounted only into PostgreSQL. The app supports the `_FILE` suffix for server secrets. For a non-Compose deployment, supply the corresponding direct variables or secret-file paths yourself.

`NEXT_PUBLIC_*` values are public browser configuration, not secrets. Next.js inlines those values during build; changing them only in the running container does not update the client bundle.

## 9. Routine updates

Use a reviewed release commit or immutable image tag. Do not deploy directly from an unreviewed working tree.

```bash
# Fetch/review the release and ensure package-lock.json is committed.
git pull --ff-only

# Build the new runtime and migration images.
docker compose --env-file .env.production -f compose.production.yaml build web migrate

# Take and validate a database backup before schema changes.
./scripts/backup-postgres.sh

# Apply the migration before starting code that requires the new schema.
docker compose --env-file .env.production -f compose.production.yaml --profile ops run --rm migrate

docker compose --env-file .env.production -f compose.production.yaml up -d web caddy
docker compose --env-file .env.production -f compose.production.yaml ps
```

Migrations should be forward-compatible with the currently running release where possible (expand/contract): add nullable columns/tables first, deploy code that reads/writes them, backfill, then remove obsolete columns in a later release. Avoid long blocking DDL during peak traffic.

## 10. Rollback strategy

Keep the previous known-good application and migrator image references for each release. If a release fails before a migration runs, redeploy the previous image and verify health. If a migration has already run, do **not** assume the old application image is compatible with the new schema and do not automatically run reverse SQL. Prefer a tested forward-fix migration. For destructive or unrecoverable data changes, restore the last verified backup into a separate database, validate it, and then perform a planned cutover.

For an image rollback, update `APP_IMAGE` in `.env.production` to the immutable image tag recorded for the previous release, then pull and run it:

```bash
docker compose --env-file .env.production -f compose.production.yaml pull web
docker compose --env-file .env.production -f compose.production.yaml up -d --no-build web caddy
```

Keep `.env.production` at mode `0600`. This rolls back application code only; it does not reverse a database migration.

## 11. Backups and recovery

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

## 12. Health checks, logs, and incidents

- `GET /api/health/live`: process liveness only; it does not query PostgreSQL.
- `GET /api/health/ready`: checks PostgreSQL and the migrated Better Auth `user` table; returns HTTP 503 if the database is unavailable or the initial schema has not been applied. It returns no connection string or exception detail.
- `docker compose ps`: service state and health.
- `docker compose logs --since=15m web database caddy`: application, database, and proxy logs. Compose rotates JSON logs to bounded local files.

For an incident, capture logs and service state, check host memory/disk and the PostgreSQL volume, check database connectivity/readiness, and verify the last known good backup before making destructive changes. Restart a failing service only after recording the error. Do not expose database ports for remote troubleshooting; use an SSH tunnel or a private management network.

## 13. Operational safeguards and known gaps

- **TLS:** expose only ports 80/443; retain Caddy's `/data` and `/config` volumes. Confirm certificate issuance and renewal after DNS/firewall changes.
- **Database isolation:** PostgreSQL is not host-published and is reachable only on the internal backend network. The web runtime and migrator use different non-superuser roles; the runtime role has DML/sequence access but no schema creation privileges.
- **Secrets:** keep `.env.production` mode `0600`; do not commit it or place secrets in Docker build args, images, logs, or client-side `NEXT_PUBLIC_*` variables. Rotate credentials as a coordinated change. Changing `BETTER_AUTH_SECRET` can invalidate signed/encrypted auth state and existing cached session cookies; plan a re-login window.
- **Database schema:** production changes use reviewed, committed Drizzle migrations. Do not use `drizzle-kit push` for production changes.
- **Backups:** schedule `scripts/backup-postgres.sh`, encrypt archives (for example with `age`), copy them off-host, monitor freshness, and routinely test restores. The repository provides a validated one-shot backup script but does not install a scheduler or an off-host storage integration.
- **Registration/authorization:** public sign-up is disabled by default. This app currently has no per-user roles or ownership restrictions; add authorization before allowing multiple trust levels.
- **Email:** email verification and password-reset delivery are not configured. Do not claim accounts are verified.
- **Rate limiting:** this project does not configure an additional global API rate limiter or upstream WAF in this Compose stack. Keep sign-up disabled in production; confirm the deployed Better Auth rate-limit configuration and add edge rate limits for `/api/auth/*` and other sensitive endpoints before exposing additional public flows.
- **Image updates:** `node:26-bookworm-slim`, `postgres:17-alpine`, and `caddy:2-alpine` track their major lines. For strict supply-chain reproducibility, pin image digests in the release process and update them deliberately after testing security fixes.
- **Capacity:** `DB_POOL_MAX` is per web container. Multiply it by the maximum web replicas and migration/administrative connections when sizing PostgreSQL `max_connections`.
- **Monitoring:** Compose health checks report state but do not send alerts and do not automatically restart a container solely because it becomes unhealthy. Add an external uptime/alerting check for `/api/health/ready`, container health, disk usage, certificate expiry, and backup age.
- **Host security:** keep the OS and Docker patched, restrict SSH, enable unattended security updates where appropriate, and monitor CPU, memory, disk, container restarts, and backup age.

## 14. Troubleshooting

| Symptom                          | Checks                                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web stays unhealthy              | `docker compose logs web database`; verify `DB_HOST=database`, app DB role/password, and that migrations were applied.                                                                                             |
| PostgreSQL init role missing     | Check whether the named volume already existed; init scripts run only for an empty data directory. Create/repair the role manually as the database admin.                                                          |
| Better Auth fails at startup     | Verify `BETTER_AUTH_SECRET` has at least 32 characters, secret is mounted, `BETTER_AUTH_URL` is the canonical HTTPS origin, and DNS/Proxy preserve the public host.                                                |
| Caddy cannot issue a certificate | Verify public DNS, inbound 80/443, no conflicting listener, and persistent writable `caddy_data`/`caddy_config` volumes.                                                                                           |
| Auth cookie is rejected          | Check the public URL is HTTPS, trusted origins match exactly, proxy headers are not rewritten incorrectly, and host clocks are synchronized.                                                                       |
| Migration command fails          | Check DB health, migration-role grants, migration SQL/journal committed to `drizzle/`, `migrations.schema` set to `public`, and that the migrator image was rebuilt from the same release commit as the web image. |
| Disk is filling                  | Check Docker images/logs, PostgreSQL volume, and backup retention; move backups off-host and prune only known-unused images.                                                                                       |

## Test strategy before release

Run `pnpm test:unit`, `pnpm test:integration`, and `pnpm test` for the Vitest suites. For a browser smoke test, provision a disposable database with the committed migrations, seed a test user, install Chromium with `just install-e2e-tests-deps`, then set `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` and run `pnpm test:e2e`. Never run these suites against production data. The E2E suite exercises anonymous route denial, required-field validation, table create/update actions, and cross-tab live refresh. See `tests/e2e/README.md` for setup.
