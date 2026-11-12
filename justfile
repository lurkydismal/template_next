#!/usr/bin/env -S just --justfile

# Production Compose invocation. Every `deploy-*` recipe uses the same flags.
prod := "docker compose --env-file .env.production -f compose.production.yaml"
dev := "docker compose -f compose.dev.yaml"

default: run-debug

# List all recipes.
help:
    @just --list --unsorted

# Start development server with hot reload and debug-friendly output.
run-debug port='3000':
    pnpm dev -p '{{ port }}'

# Build the production-ready optimized application bundle.
build-release:
    pnpm build

# Start the built production server.
run-release port='3000':
    pnpm start -p '{{ port }}'

# Run the unit tests once (no database required).
run-unit-tests:
    pnpm test:run

# Run the unit tests in watch mode.
run-unit-tests-watch:
    pnpm test

# Run unit tests with a coverage report (text summary, HTML in coverage/, lcov).
run-tests-coverage:
    pnpm test:coverage

# Run integration tests against a migrated database (default: dev compose DB).
run-integration-tests url='postgres://db_user:db_password@127.0.0.1:5432/template_next':
    TEST_DATABASE_URL='{{ url }}' pnpm test:integration

# Type-check the whole project, including tests.
typecheck:
    pnpm typecheck

# Run formatting check, type-check and unit tests (what CI should run).
check:
    pnpm format:check
    pnpm typecheck
    pnpm test:run

# Install Chromium and the Chromium headless shell required by Playwright E2E tests.
install-e2e-tests-deps:
    pnpm playwright install chromium chromium-headless-shell

# Run the browser-less HTTP E2E tests (needs a migrated DB and `just build-release`).
run-e2e-api-tests:
    pnpm playwright test --project=api

# Run Playwright E2E tests using the Chromium project in headless mode.
run-e2e-tests:
    pnpm playwright test --project=api --project=chromium

# Run Playwright E2E tests using Chromium with the browser UI visible.
run-e2e-tests-headed:
    pnpm playwright test --project=chromium --headed

# Run Playwright E2E tests using Playwright's interactive UI mode.
run-e2e-tests-with-ui:
    pnpm playwright test --project=chromium --ui

# Format source files using the project's formatter configuration.
format:
    pnpm format

# Run static analysis and lint checks.
lint:
    pnpm lint -f markdown > fallow.md

# Run better static analysis and lint checks.
hard-lint:
    pnpm tsc --noEmit

# Generate a new migration from schema changes.
generate-migration:
    pnpm generate

# Apply pending migrations to the database.
migrate:
    pnpm migrate

# Interactively review and upgrade package versions.
packages-upgrade:
    ncu -ui

# Install project dependencies using cached packages when available.
packages-install:
    pnpm i --prefer-offline

# Pull the current database schema into schema.
pull-db-schema:
    pnpm db:pull

# Verify the migration history is consistent.
check-migrations:
    pnpm db:check

# Pull images for all services, skipping services that have no build context.
docker-pull:
    {{ dev }} pull --ignore-buildable

# Start all services.
docker-up-all:
    {{ dev }} up -d

# Start one service in detached mode.
docker-up image='database':
    {{ dev }} up -d '{{ image }}'

# Stop all running containers in the current Docker Compose project without removing containers, networks, or volumes.
docker-stop:
    {{ dev }} stop

# Stop and remove containers, networks, and default resources created by the current Docker Compose project.
docker-down:
    {{ dev }} down

# Open an interactive shell inside a running service container.
docker-interact image='database':
    {{ dev }} exec '{{ image }}' bash

# Stream logs from all services and follow output
docker-logs:
    {{ dev }} logs -f

# Attach to a running service container without signal proxying.
docker-attach image='database':
    -{{ dev }} attach --sig-proxy=false '{{ image }}' sh

# Show a one-time snapshot of resource usage statistics for containers in the current Docker Compose project.
docker-stats:
    {{ dev }} stats --no-stream

# Remove dangling Docker images that are no longer referenced by any tag.
docker-remove-unused-images:
    #!/usr/bin/env bash
    set -euo pipefail
    docker images -f "dangling=true" -q | xargs -r docker rmi

# Reload Caddy after editing conf/Caddyfile.
reverse-proxy-reload: caddy-reload

# Reload Caddy configuration inside the running production container.
caddy-reload:
    {{ prod }} exec -w /etc/caddy caddy caddy reload

# Generate a cryptographically secure random alphanumeric token of length `N`. Uses `openssl rand` as the entropy source, encodes as Base64, removes padding and non-alphanumeric output, then retries until the result is exactly `N` characters using only `[A-Za-z0-9]`.
generate-token length='32':
    #!/usr/bin/env bash
    set -euo pipefail
    while true; do
    s=$(openssl rand -base64 "$(({{ length }} + 3))" | tr -d '\n')
    s="${s%%=*}"   # remove all trailing '='
    s="${s:0:{{ length }}}"   # cut back to requested length
    # allow only base64 alnum
    if [[ "$s" =~ ^[A-Za-z0-9]+$ && ${#s} -eq {{ length }} ]]; then
        echo "$s"
        break
    fi
    done

# ---------------------------------------------------------------------------
# Production deployment (docs/DEPLOYMENT.md). Requires .env.production.
# ---------------------------------------------------------------------------

# Create .env.production from the template with freshly generated secrets (refuses to overwrite).
deploy-init-env:
    #!/usr/bin/env bash
    set -euo pipefail
    [[ ! -e .env.production ]] || { echo "ERROR: .env.production already exists" >&2; exit 1; }
    umask 077
    cp .env.production.example .env.production
    for name in POSTGRES_ADMIN_PASSWORD APP_DB_PASSWORD MIGRATION_DB_PASSWORD BETTER_AUTH_SECRET; do
        sed -i "s|^$name=.*|$name=$(openssl rand -hex 32)|" .env.production
    done
    echo "Created .env.production (mode 600). Now set APP_DOMAIN, then run: just deploy-check"

# Validate .env.production and the Compose configuration.
deploy-check:
    pnpm deploy:check

# Build the web and migrator images from the working tree.
deploy-build:
    {{ prod }} build web migrate

# Start PostgreSQL and wait until it is healthy.
deploy-db:
    {{ prod }} up -d --wait database

# Apply database migrations with the one-shot migrator (migration role).
deploy-migrate:
    {{ prod }} --profile ops run --rm migrate

# Start (or update) the web application and Caddy.
deploy-up:
    {{ prod }} up -d web caddy

# Stop all production containers. Never removes volumes.
deploy-down:
    {{ prod }} down

# Show service state and health.
deploy-ps:
    {{ prod }} ps

# Follow production logs (optionally for one service).
deploy-logs service='':
    {{ prod }} logs -f --tail=100 {{ service }}

# Run the post-deployment smoke test against APP_DOMAIN (or pass a URL).
deploy-smoke url='':
    bash scripts/smoke-test.sh {{ url }}

# Take and verify a PostgreSQL backup (set BACKUP_AGE_RECIPIENT to encrypt).
deploy-backup:
    ./scripts/backup-postgres.sh

# Full release: validate, build, back up, migrate, start, smoke-test. Stops at the first failure.
deploy-release: deploy-check deploy-build deploy-db deploy-backup deploy-migrate deploy-up
    {{ prod }} ps
    just deploy-smoke
