#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
ENV_FILE="${1:-.env.production}"

fail() {
    printf 'ERROR: %s\n' "$1" >&2
    exit 1
}

[[ -f "$ENV_FILE" ]] || fail "Environment file not found: $ENV_FILE"
[[ -f pnpm-lock.yaml ]] || fail "pnpm-lock.yaml is required for a controlled production deployment; commit it first"
[[ ! -f package-lock.json ]] || fail "package-lock.json found, but this project uses pnpm; remove it so the image builds from pnpm-lock.yaml"
[[ -f conf/Caddyfile ]] || fail "conf/Caddyfile is missing (mounted by compose.production.yaml)"
compgen -G "drizzle/*/migration.sql" > /dev/null || fail "no migrations found under drizzle/; generate and commit them first"

mode="$(stat -c '%a' "$ENV_FILE")"
(( (8#$mode & 077) == 0 )) || fail "$ENV_FILE must not be accessible by group/other users (run chmod 600)"

# Parse KEY=value lines without executing the file. Values must be shell-safe, which
# `openssl rand -hex 32` secrets, hostnames and image references all are.
lineno=0
while IFS= read -r line || [[ -n "$line" ]]; do
    lineno=$((lineno + 1))
    [[ -z "${line//[[:space:]]/}" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=([A-Za-z0-9._~+:/@%,-]*)$ ]]; then
        export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
    else
        # Never print the value: it may be a secret.
        fail "unsupported syntax on line $lineno of $ENV_FILE: use KEY=value with no spaces, quotes or \$"
    fi
done < "$ENV_FILE"

required=(
    APP_DOMAIN
    POSTGRES_ADMIN_USER
    POSTGRES_DB
    APP_DB_USER
    MIGRATION_DB_USER
    POSTGRES_ADMIN_PASSWORD
    APP_DB_PASSWORD
    MIGRATION_DB_PASSWORD
    BETTER_AUTH_SECRET
)

for name in "${required[@]}"; do
    [[ -n "${!name:-}" ]] || fail "$name is missing or empty"
    [[ "${!name}" != replace-with-* ]] || fail "$name still contains the example placeholder"
done

[[ "$APP_DOMAIN" =~ ^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$ ]] || fail "APP_DOMAIN must be a valid public DNS hostname without scheme, port, or path"
[[ "$APP_DOMAIN" != *example.com* ]] || fail "Replace the example APP_DOMAIN with your real hostname"

for name in POSTGRES_ADMIN_USER POSTGRES_DB APP_DB_USER MIGRATION_DB_USER; do
    [[ "${!name}" =~ ^[A-Za-z_][A-Za-z0-9_]{0,62}$ ]] || fail "$name must use 1-63 ASCII letters, digits, or underscores and start with a letter/underscore"
done

[[ "$POSTGRES_ADMIN_USER" != "$APP_DB_USER" ]] || fail "APP_DB_USER must differ from the PostgreSQL admin user"
[[ "$POSTGRES_ADMIN_USER" != "$MIGRATION_DB_USER" ]] || fail "MIGRATION_DB_USER must differ from the PostgreSQL admin user"
[[ "$APP_DB_USER" != "$MIGRATION_DB_USER" ]] || fail "APP_DB_USER and MIGRATION_DB_USER must be different roles"

for name in POSTGRES_ADMIN_PASSWORD APP_DB_PASSWORD MIGRATION_DB_PASSWORD BETTER_AUTH_SECRET; do
    value="${!name}"
    [[ "$value" =~ ^[A-Za-z0-9._~+-]+$ ]] || fail "$name may only contain letters, digits and . _ ~ + - (use openssl rand -hex 32)"
    (( ${#value} >= 32 )) || fail "$name must contain at least 32 characters"
done

secrets=(POSTGRES_ADMIN_PASSWORD APP_DB_PASSWORD MIGRATION_DB_PASSWORD BETTER_AUTH_SECRET)
for ((i = 0; i < ${#secrets[@]}; i++)); do
    left_name="${secrets[i]}"
    left_value="${!left_name}"
    for ((j = i + 1; j < ${#secrets[@]}; j++)); do
        right_name="${secrets[j]}"
        right_value="${!right_name}"
        [[ "$left_value" != "$right_value" ]] || fail "$left_name and $right_name must be different"
    done
done

case "${DB_SSL:-disable}" in
    disable|require|verify-full) ;;
    *) fail "DB_SSL must be disable, require or verify-full" ;;
esac

for name in DB_POOL_MAX DB_CONNECTION_TIMEOUT_MS DB_IDLE_TIMEOUT_MS DB_STATEMENT_TIMEOUT_MS; do
    [[ -z "${!name:-}" || "${!name}" =~ ^[0-9]+$ ]] || fail "$name must be a non-negative integer"
done

for name in APP_IMAGE MIGRATOR_IMAGE; do
    if [[ -n "${!name:-}" && "${!name}" == *:latest ]]; then
        fail "$name must not use the mutable :latest tag"
    fi
done

case "${AUTH_DISABLE_SIGN_UP:-true}" in
    true|false) ;;
    *) fail "AUTH_DISABLE_SIGN_UP must be true or false" ;;
esac

if [[ "${AUTH_DISABLE_SIGN_UP:-true}" != "true" ]]; then
    printf 'WARNING: AUTH_DISABLE_SIGN_UP=false; every new account currently receives the same protected dashboard access.\n' >&2
fi

command -v docker >/dev/null 2>&1 || fail "Docker CLI is required to validate Compose configuration"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required"
docker compose --env-file "$ENV_FILE" -f compose.production.yaml config --quiet

printf 'Production environment and Compose configuration look valid.\n'
