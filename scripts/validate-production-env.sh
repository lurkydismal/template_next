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
[[ -f package-lock.json ]] || fail "package-lock.json is required for a controlled production deployment; generate and commit it first"

mode="$(stat -c '%a' "$ENV_FILE")"
(( (8#$mode & 077) == 0 )) || fail "$ENV_FILE must not be accessible by group/other users (run chmod 600)"

set -a
# This file must contain shell-compatible assignments. Generated secrets are hex strings.
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

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
