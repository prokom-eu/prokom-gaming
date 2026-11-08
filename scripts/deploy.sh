#!/usr/bin/env bash
# Deploy one image (commit SHA from GHCR) to a stack, with automatic rollback (G16; a copy of
# prokom-web scripts/deploy.sh with Gaming's names, one site host and Umami in the stack).
# Usage: scripts/deploy.sh <staging|prod> <sha> [--fail-smoke-for-test]
#   run by scripts/server/deploy-gate.sh (pipeline) with the deploy files of the same commit.
# Steps: (prod: backup predeploy) → pull → APP_IMAGE_TAG in .env.<stack> → up -d app (+ umami, not
# fatal) → app healthy → smoke test on the app's loopback port, for the host of SITE_URL; staging ok
# → its SHA in ../.gaming-staging-ok (the only SHA production accepts). A failure after the tag change:
#   - no new migrations ran → previous tag back, checked with the core smoke test (SMOKE_CORE=1:
#     health, panel, home page — the full test of this commit may expect routes the old image
#     does not have), exit 1;
#   - new migrations ran → NO rollback: the old image may not work on the new schema; the new
#     image stays, exit 1 — decide by hand (docs/runbook.md „Cofnięcie”);
#   - rollback itself fails → forward to the new image again, so the stack does not stay down.
# --fail-smoke-for-test: pretend the smoke test failed (test of the rollback, docs/runbook.md).
# Log: ../deploys.log (one line per deploy, shared with prokom-web), output also in
# ../deploy-output.log. Never prints the content of .env files.
set -euo pipefail
# The pipeline's SSH session may drop (cancel, timeout): keep going instead of dying half way.
trap '' PIPE HUP

stack="${1:?usage: scripts/deploy.sh <staging|prod> <sha> [--fail-smoke-for-test]}"
sha="${2:?usage: scripts/deploy.sh <staging|prod> <sha> [--fail-smoke-for-test]}"
fail_smoke="${3:-}"
case "$stack" in staging | prod) ;; *) echo "Unknown stack: $stack" >&2; exit 2 ;; esac
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo "Not a full commit SHA: $sha" >&2; exit 2; }
case "$fail_smoke" in '' | --fail-smoke-for-test) ;; *) echo "Unknown option: $fail_smoke" >&2; exit 2 ;; esac

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
env_file=".env.$stack"
[ -f "$env_file" ] || { echo "Missing $root/$env_file" >&2; exit 2; }
image="ghcr.io/prokom-eu/prokom-gaming"
app="prokom-gaming-$stack-app-1"
pg="prokom-gaming-$stack-postgres-1"
db="prokom_gaming_$stack"
compose=(docker compose --env-file "$env_file" -f docker/compose.prod.yml)
[ "$stack" = staging ] && compose+=(-f docker/compose.staging.yml)

log() {
  local line
  line="$(date -u +%Y-%m-%dT%H:%M:%SZ) deploy gaming-$stack: $*"
  echo "$line" >>"$root/../deploy-output.log"
  echo "$line" 2>/dev/null || true
}
# One value from an env file, without sourcing it (the file holds secrets).
env_value() { sed -n "s/^$2=//p" "$1" | tail -1; }

# One deploy at a time per server — the same lock file as prokom-web (both repos sit in
# /srv/prokom); the gate already holds it for a pipeline deploy.
if [ "${DEPLOY_LOCK_HELD:-}" != 1 ]; then
  exec 9>"$root/../.deploy.lock"
  flock -w 600 9 || { log "another deploy still running"; exit 1; }
fi

prev="$(env_value "$env_file" APP_IMAGE_TAG)"
port="$(env_value "$env_file" APP_PORT)"
site_url="$(env_value "$env_file" SITE_URL)"
host="${site_url#*://}"
host="${host%%/*}"
[ -n "$port" ] && [ -n "$host" ] || { log "APP_PORT or SITE_URL missing in $env_file"; exit 2; }

record() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) gaming-$stack ${prev:0:7} -> ${sha:0:7} $1" >>"$root/../deploys.log"; }

set_tag() {
  # sed -i keeps the file mode (600) and owner.
  sed -i "s/^APP_IMAGE_TAG=.*/APP_IMAGE_TAG=$1/" "$env_file"
  [ "$(env_value "$env_file" APP_IMAGE_TAG)" = "$1" ]
}

migrations() {
  docker exec "$pg" psql -U prokom -d "$db" -tAc 'select name from payload_migrations order by name'
}

wait_healthy() {
  local status=''
  for _ in $(seq 1 60); do # migrations run at start: up to 5 minutes
    status="$(docker inspect -f '{{.State.Health.Status}}' "$app" 2>/dev/null || echo missing)"
    [ "$status" = healthy ] && return 0
    sleep 5
  done
  log "app not healthy ($status) — docker logs $app"
  return 1
}

# smoke [core]: the full smoke test of this commit, or with `core` only the routes every version has.
smoke() {
  SMOKE_CORE="$([ "${1:-}" = core ] && echo 1 || true)" bash scripts/smoke.sh "http://127.0.0.1:$port" "$host" 2>&1 |
    while IFS= read -r l; do log "$l"; done
  return "${PIPESTATUS[0]}"
}

# The app with its new tag (postgres starts with it as a dependency). Umami separately and never
# fatal: statistics down must not roll back — or fake a failed rollback of — a working app.
start() {
  "${compose[@]}" up -d app 2>&1 | while IFS= read -r l; do log "$l"; done
  [ "${PIPESTATUS[0]}" -eq 0 ] || return 1
  "${compose[@]}" up -d umami 2>&1 | while IFS= read -r l; do log "$l"; done
  [ "${PIPESTATUS[0]}" -eq 0 ] ||
    log "umami not started — the app runs without statistics; check: docker logs prokom-gaming-$stack-umami-1"
  wait_healthy
}

fail() {
  local applied
  applied="$(migrations 2>/dev/null || echo unknown)"
  if [ "$applied" != "$migrations_before" ]; then
    log "FAILED — new migrations ran, so NO rollback (old image may not run on the new schema);"
    log "${sha:0:7} stays — check it and decide by hand: docs/runbook.md"
    record "FAILED, not rolled back (migrations applied)"
    exit 1
  fi
  log "FAILED — back to ${prev:0:7}"
  if set_tag "$prev" && start && smoke core; then
    log "rollback done, ${prev:0:7} is running"
    record "FAILED, rolled back"
  else
    log "ROLLBACK FAILED — forward to ${sha:0:7} again, so $stack does not stay down"
    if set_tag "$sha" && start; then
      record "FAILED, rollback failed, ${sha:0:7} running again"
    else
      record "FAILED, rollback failed, $stack DOWN"
    fi
    log "manual action: docs/runbook.md"
  fi
  exit 1
}

[[ "$prev" =~ ^[0-9a-f]{40}$ ]] || { log "APP_IMAGE_TAG in $env_file is not a SHA: '$prev'"; exit 2; }
log "${prev:0:7} -> ${sha:0:7}"

if [ "$stack" = prod ]; then
  log "backup before the deploy"
  scripts/backup.sh prod predeploy || { log "backup failed — nothing changed"; record "FAILED, backup"; exit 1; }
fi

# Pull first: a missing image stops the deploy before anything changes.
docker pull -q "$image:$sha" >/dev/null ||
  { log "image $image:$sha not found — nothing changed"; record "FAILED, no image"; exit 1; }
migrations_before="$(migrations)"

set_tag "$sha" || fail
start || fail
if [ "$fail_smoke" = --fail-smoke-for-test ]; then
  log "smoke test failure forced (--fail-smoke-for-test)"
  fail
fi
smoke || fail

log "done, ${sha:0:7} is running"
record "ok"
# Production accepts only an image that passed staging's smoke test (deploy-gate.sh). Not the tag
# in .env.staging: after a failed deploy that stays on the new, failed SHA.
if [ "$stack" = staging ]; then echo "$sha" >"$root/../.gaming-staging-ok"; fi

# Old app images fill the disk: keep the images both stacks name in their .env files.
keep=" $sha $prev "
for f in .env.staging .env.prod; do
  [ -f "$f" ] && keep+="$(env_value "$f" APP_IMAGE_TAG) "
done
docker image ls "$image" --format '{{.Tag}}' | while read -r tag; do
  case "$keep" in *" $tag "*) ;; *) docker image rm "$image:$tag" >/dev/null 2>&1 || true ;; esac
done
