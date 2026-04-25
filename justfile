#!/usr/bin/env -S just --justfile

default: run-debug

# Start development server with hot reload and debug-friendly output.
run-debug:
    pnpm dev

# Build the production-ready optimized application bundle.
build-release:
    pnpm build

# Start the built production server.
run-release:
    pnpm start

# Run the test suite.
run-tests:
    pnpm test

# Format source files using the project's formatter configuration.
format:
    pnpm format

# Run static analysis and lint checks.
lint:
    pnpm lint

# Generate a new migration from schema changes.
generate-migration:
    pnpm generate

# Apply pending migrations to the database.
migrate:
    pnpm migrate

# Interactively review and upgrade package versions.
packages-upgrade:
    ncu -ui

# Install project dependencies.
packages-install:
    pnpm i

# Pull the current database schema into schema.
pull-db-schema:
    pnpm pull

# Pull images for all services, skipping services that have no build context.
docker-pull:
    docker compose  pull --ignore-buildable

# Start all services.
docker-up-all:
    just docker-up

# Start one service in detached mode.
docker-up image='postgres':
    docker compose up -d '{{ image }}'

# Stop all running containers in the current Docker Compose project without removing containers, networks, or volumes.
docker-stop:
    docker compose stop

# Stop and remove containers, networks, and default resources created by the current Docker Compose project.
docker-down:
    docker compose down

# Open an interactive shell inside a running service container.
docker-interact image='postgres':
    docker compose exec '{{ image }}' bash

# Attach to a running service container without signal proxying.
docker-attach image='postgres':
    -docker compose attach --sig-proxy=false '{{ image }}' sh

# Show a one-time snapshot of resource usage statistics for containers in the current Docker Compose project.
docker-stats:
    docker compose stats --no-stream

# Remove dangling Docker images that are no longer referenced by any tag.
docker-remove-unused-images:
    #!/usr/bin/env bash
    set -euo pipefail
    docker images -f "dangling=true" -q | xargs -r docker rmi

# Reload the reverse proxy.
reverse-proxy-reload: caddy-reload

# Reload Caddy configuration inside the running container.
caddy-reload:
    docker compose exec -w /etc/caddy caddy caddy reload

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
