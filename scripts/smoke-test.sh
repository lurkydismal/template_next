#!/usr/bin/env bash
# Post-deployment smoke test against a running deployment (no credentials required).
#   scripts/smoke-test.sh https://app.example.com
#   scripts/smoke-test.sh                    # reads APP_DOMAIN from .env.production
# Exits non-zero on the first failed check.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
    [[ -f .env.production ]] || { printf 'ERROR: pass a base URL or create .env.production\n' >&2; exit 1; }
    domain="$(grep -E '^APP_DOMAIN=' .env.production | head -n1 | cut -d= -f2-)"
    [[ -n "$domain" ]] || { printf 'ERROR: APP_DOMAIN missing in .env.production\n' >&2; exit 1; }
    BASE_URL="https://$domain"
fi
BASE_URL="${BASE_URL%/}"
command -v curl >/dev/null 2>&1 || { printf 'ERROR: curl is required\n' >&2; exit 1; }

failures=0
check() { # check <description> <expected> <actual>
    if [[ "$2" == "$3" ]]; then
        printf 'ok    %s\n' "$1"
    else
        printf 'FAIL  %s (expected %s, got %s)\n' "$1" "$2" "$3" >&2
        failures=$((failures + 1))
    fi
}
status() { curl -sS -o /dev/null -m 15 -w '%{http_code}' "$@" || echo 000; }

check "liveness probe"                 200 "$(status "$BASE_URL/api/health/live")"
check "readiness probe (db + schema)"  200 "$(status "$BASE_URL/api/health/ready")"
check "notifications require a session" 401 "$(status "$BASE_URL/api/notifications")"
check "live-update stream requires a session" 401 "$(status "$BASE_URL/api/dashboard/changes")"

redirect="$(curl -sS -o /dev/null -m 15 -w '%{http_code} %{redirect_url}' "$BASE_URL/dashboard/tables" || echo '000 ')"
check "anonymous dashboard redirects to login" "307 $BASE_URL/auth/login" "$redirect"

signup="$(status -X POST -H 'Content-Type: application/json' -H "Origin: $BASE_URL" \
    -d '{"name":"smoke","email":"smoke-test@invalid.example","password":"not-a-real-password"}' \
    "$BASE_URL/api/auth/sign-up/email")"
check "public sign-up is closed" 400 "$signup"

headers="$(curl -sSI -m 15 "$BASE_URL/" || true)"
for header in strict-transport-security x-content-type-options x-frame-options; do
    if grep -qi "^$header:" <<<"$headers"; then
        printf 'ok    header %s present\n' "$header"
    else
        printf 'FAIL  header %s missing\n' "$header" >&2
        failures=$((failures + 1))
    fi
done

if ((failures > 0)); then
    printf '\n%d check(s) failed against %s\n' "$failures" "$BASE_URL" >&2
    exit 1
fi
printf '\nAll smoke checks passed against %s\n' "$BASE_URL"
