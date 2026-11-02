#!/usr/bin/env bash
# Smoke test after a deploy (G16; pattern: prokom-web scripts/smoke.sh). Run by scripts/deploy.sh.
# Usage: scripts/smoke.sh <base-url> [site-host]
#   scripts/smoke.sh http://127.0.0.1:3201 staging.prokomgaming.pl   # the app on the server
#   scripts/smoke.sh https://127.0.0.1 staging.prokomgaming.pl       # through Nginx
#   scripts/smoke.sh http://127.0.0.1:3100                           # local (host: localhost)
# Every request goes to the address of <base-url>, but for the site's domain (curl --connect-to):
# the right `Host` and TLS name (SNI), before DNS and behind Nginx alike.
# Only routes that answer without content entered in the panel — a failed smoke test rolls the
# deploy back. Optional environment:
#   SMOKE_AUTH       user:password for a server behind basic auth (staging through Nginx)
#   SMOKE_INSECURE=1 accept a self-signed certificate (local test of Nginx)
#   SMOKE_CORE=1     only health, panel login and the home page — routes every version has
#                    (deploy.sh checks a rolled-back older image with it)
# Through Nginx (https base) it also checks that the first-admin form is closed (docs/runbook.md).
# Exit code 1 on any failure.
set -euo pipefail

base="${1:?usage: scripts/smoke.sh <base-url> [site-host]}"
host="${2:-localhost}"

scheme="${base%%://*}"
address="${base#*://}"
address="${address%%/*}"
if [[ "$address" == *:* ]]; then
  port="${address##*:}"
  address="${address%:*}"
else
  port=$([ "$scheme" = https ] && echo 443 || echo 80)
fi

curl_opts=(-s -o /dev/null -w '%{http_code}' --max-time 15)
[ -n "${SMOKE_AUTH:-}" ] && curl_opts+=(-u "$SMOKE_AUTH")
[ "${SMOKE_INSECURE:-}" = 1 ] && curl_opts+=(-k)

failures=0

# check <expected status> <path> [curl option ...]
check() {
  local expected="$1" path="$2" status
  shift 2
  status=$(curl "${curl_opts[@]}" "$@" --connect-to "${host}:${port}:${address}:${port}" \
    "${scheme}://${host}:${port}${path}" || true)
  if [ "$status" = "$expected" ]; then
    echo "ok    ${status} ${host}${path}"
  else
    echo "FAIL  ${status} ${host}${path} (expected ${expected})"
    failures=$((failures + 1))
  fi
}

check 200 /api/health
# The admin build (import map, assets) is the most fragile part of a standalone image.
check 200 /admin/login
check 200 /
if [ "${SMOKE_CORE:-}" != 1 ]; then
  check 200 /zestawy
  check 200 /konfigurator
  check 200 /zapytanie
  check 200 /sitemap.xml
  check 200 /robots.txt
  check 404 /tej-strony-nie-ma
  if [ "$scheme" = https ]; then
    # Nginx closes the first-admin form for good (an empty `users` table would let anyone in).
    check 404 /admin/create-first-user
    check 404 /api/users/first-register -X POST
  fi
fi

if [ "$failures" -gt 0 ]; then
  echo "Smoke test failed: ${failures} check(s)."
  exit 1
fi
echo "Smoke test passed."
