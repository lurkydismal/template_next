#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${1:-.env.production}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_PATH="$BACKUP_DIR/template-next-$TIMESTAMP.dump"
TEMP_PATH="$BACKUP_PATH.partial"
[[ ! -e "$BACKUP_PATH" && ! -e "$BACKUP_PATH.age" ]] || {
    printf 'ERROR: backup path already exists for timestamp %s\n' "$TIMESTAMP" >&2
    exit 1
}

[[ -f "$ENV_FILE" ]] || {
    printf 'ERROR: environment file not found: %s\n' "$ENV_FILE" >&2
    exit 1
}
mode="$(stat -c '%a' "$ENV_FILE")"
(( (8#$mode & 077) == 0 )) || {
    printf 'ERROR: %s must not be accessible by group/other users (run chmod 600)\n' "$ENV_FILE" >&2
    exit 1
}
command -v sha256sum >/dev/null 2>&1 || {
    printf 'ERROR: sha256sum is required\n' >&2
    exit 1
}
command -v flock >/dev/null 2>&1 || {
    printf 'ERROR: flock is required to prevent overlapping backups\n' >&2
    exit 1
}
if [[ -n "${BACKUP_AGE_RECIPIENT:-}" ]] && ! command -v age >/dev/null 2>&1; then
    printf 'ERROR: BACKUP_AGE_RECIPIENT is set but age is not installed\n' >&2
    exit 1
fi
command -v docker >/dev/null 2>&1 || {
    printf 'ERROR: Docker CLI is required\n' >&2
    exit 1
}
docker compose version >/dev/null 2>&1 || {
    printf 'ERROR: Docker Compose v2 is required\n' >&2
    exit 1
}

umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
exec 9> "$BACKUP_DIR/.backup.lock"
chmod 600 "$BACKUP_DIR/.backup.lock"
flock -n 9 || {
    printf 'ERROR: another backup is already running\n' >&2
    exit 1
}

compose=(docker compose --env-file "$ENV_FILE" -f compose.production.yaml)
cleanup() {
    rm -f "$TEMP_PATH"
}
trap cleanup EXIT

printf 'Creating PostgreSQL custom-format backup: %s\n' "$BACKUP_PATH"
"${compose[@]}" exec -T database \
    sh -eu -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
    > "$TEMP_PATH"

[[ -s "$TEMP_PATH" ]] || {
    printf 'ERROR: pg_dump produced an empty file\n' >&2
    exit 1
}

# Validate that PostgreSQL can read the archive before publishing it.
"${compose[@]}" exec -T database pg_restore --list < "$TEMP_PATH" > /dev/null
mv "$TEMP_PATH" "$BACKUP_PATH"
sha256sum "$BACKUP_PATH" > "$BACKUP_PATH.sha256"
chmod 600 "$BACKUP_PATH" "$BACKUP_PATH.sha256"

if [[ -n "${BACKUP_AGE_RECIPIENT:-}" ]]; then
    if ! age --recipient "$BACKUP_AGE_RECIPIENT" --output "$BACKUP_PATH.age" "$BACKUP_PATH"; then
        rm -f "$BACKUP_PATH.age"
        printf 'ERROR: encryption failed; plaintext backup was retained at %s\n' "$BACKUP_PATH" >&2
        exit 1
    fi
    chmod 600 "$BACKUP_PATH.age"
    sha256sum "$BACKUP_PATH.age" > "$BACKUP_PATH.age.sha256"
    chmod 600 "$BACKUP_PATH.age.sha256"
    rm -f "$BACKUP_PATH" "$BACKUP_PATH.sha256"
    BACKUP_PATH="$BACKUP_PATH.age"
fi

printf 'Backup completed and checksum written: %s\n' "$BACKUP_PATH"
printf 'Copy it to encrypted off-host storage and test a restore regularly.\n'
