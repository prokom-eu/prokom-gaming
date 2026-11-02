#!/usr/bin/env bash
# Backup of one Gaming stack: database + Umami's database + uploaded media, encrypted, copied off
# the server (G16; a copy of prokom-web scripts/backup.sh — same keys, same B2 bucket).
# Usage: scripts/backup.sh <prod|staging> [predeploy]
#   cron, every night:        scripts/backup.sh prod   (and staging)
#   before a production deploy: scripts/backup.sh prod predeploy
# Result: one file prokom-gaming-<stack>-<UTC time>.tar.age (inside: db.dump from pg_dump -Fc,
# umami.dump, media.tar, manifest.txt), in BACKUP_DIR/<stack>/<kind>/ and
# RCLONE_REMOTE/gaming-<stack>/<kind>/ (prokom-web's stacks use <stack>/ in the same bucket).
# Kinds and retention: daily 14 days, monthly (the backup of the 1st) ~3 months, predeploy 30 days.
# Settings: `.env.backup` in the repo root (or BACKUP_ENV=<file>), see .env.example:
#   AGE_RECIPIENT  public age key (the private one is only in the password manager)
#   RCLONE_REMOTE  off-server target, e.g. offsite:prokom-backups (rclone config on the server)
#   BACKUP_DIR     local copies (default ../backups/gaming, next to the repo)
#   BACKUP_LOCAL_ONLY=1  skip the off-server copy (local tests only)
#   BACKUP_HEARTBEAT_URL_<STACK>  Better Stack heartbeat (S10c): pinged after a good backup, <url>/fail
#                  on a failed one; no ping for a day = alert on the phone (docs/runbook.md)
# Restore: scripts/restore.sh, procedure: docs/runbook.md.
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash on Windows (local test): keep container paths as they are

stack="${1:?usage: scripts/backup.sh <prod|staging> [predeploy]}"
kind="${2:-daily}"
case "$stack" in prod | staging) ;; *) echo "Unknown stack: $stack" >&2; exit 2 ;; esac
case "$kind" in daily | predeploy) ;; *) echo "Unknown kind: $kind" >&2; exit 2 ;; esac

root="$(cd "$(dirname "$0")/.." && pwd)"
env_file="${BACKUP_ENV:-$root/.env.backup}"
if [ -f "$env_file" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a
fi
log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) backup prokom-gaming-$stack: $*"; }

heartbeat_var="BACKUP_HEARTBEAT_URL_$(echo "$stack" | tr '[:lower:]' '[:upper:]')"
heartbeat="${!heartbeat_var:-}"
ping_heartbeat() {
  [ -n "$heartbeat" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null "$heartbeat$1" || log "heartbeat ping failed"
}

# A failed backup (any error under set -e) reports itself at once, not only after a silent day.
on_exit() {
  local status=$?
  rm -rf "${work:-}"
  if [ "$status" -ne 0 ]; then ping_heartbeat /fail; fi
}
trap on_exit EXIT

: "${AGE_RECIPIENT:?set AGE_RECIPIENT (public age key) in .env.backup}"
backup_dir="${BACKUP_DIR:-$root/../backups/gaming}"
if [ -z "${RCLONE_REMOTE:-}" ] && [ "${BACKUP_LOCAL_ONLY:-}" != 1 ]; then
  echo "Set RCLONE_REMOTE (off-server copy, ADR-019 in prokom-web) or BACKUP_LOCAL_ONLY=1 for a local test." >&2
  exit 2
fi

project="prokom-gaming-$stack"
db="prokom_gaming_$stack"
pg="$project-postgres-1"
media_volume="${project}_media"
# The PostgreSQL image of the stack also serves as the throwaway container for the media volume.
helper_image="$(docker inspect -f '{{.Config.Image}}' "$pg")"

# The unencrypted dump holds personal data (inquiries, orders, customers): kept next to the backups (not in /tmp)
# and removed on exit.
mkdir -p "$backup_dir"
work="$(mktemp -d "$backup_dir/.backup-XXXXXX")"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="$project-$stamp.tar.age"

log "database $db"
docker exec "$pg" pg_dump -U prokom -d "$db" -Fc >"$work/db.dump"
# A dump pg_restore cannot read is no backup: check it before it replaces older ones.
docker exec -i "$pg" pg_restore --list >/dev/null <"$work/db.dump"

# Statistics (ADR-G009): no personal data, but months of traffic history worth keeping.
log "database umami"
docker exec "$pg" pg_dump -U prokom -d umami -Fc >"$work/umami.dump"
docker exec -i "$pg" pg_restore --list >/dev/null <"$work/umami.dump"

log "media volume $media_volume"
docker run --rm -v "$media_volume:/media:ro" "$helper_image" tar -C /media -cf - . >"$work/media.tar"

{
  echo "stack=$stack"
  echo "kind=$kind"
  echo "created=$stamp"
  echo "database=$db"
  echo "app_image=$(docker inspect -f '{{.Config.Image}}' "$project-app-1" 2>/dev/null || echo unknown)"
  echo "migrations:"
  docker exec "$pg" psql -U prokom -d "$db" -tAc 'select name from payload_migrations order by name'
} >"$work/manifest.txt"

kinds=("$kind")
# The first backup of a month is kept longer as the monthly one.
[ "$kind" = daily ] && [ "$(date -u +%d)" = 01 ] && kinds+=(monthly)

target="$backup_dir/$stack/$kind"
mkdir -p "$target"
tar -C "$work" -cf - db.dump umami.dump media.tar manifest.txt | age -r "$AGE_RECIPIENT" >"$target/$name"
log "written $target/$name ($(du -h "$target/$name" | cut -f1))"
for extra in "${kinds[@]:1}"; do
  mkdir -p "$backup_dir/$stack/$extra"
  cp "$target/$name" "$backup_dir/$stack/$extra/$name"
done

retention_days() {
  case "$1" in daily) echo 14 ;; monthly) echo 93 ;; predeploy) echo 30 ;; esac
}

for k in "${kinds[@]}"; do
  days="$(retention_days "$k")"
  if [ -n "${RCLONE_REMOTE:-}" ]; then
    remote="$RCLONE_REMOTE/gaming-$stack/$k/"
    log "off-server copy to $remote"
    rclone copy "$backup_dir/$stack/$k/$name" "$remote"
    rclone delete --min-age "${days}d" "$remote"
  fi
  find "$backup_dir/$stack/$k" -name '*.tar.age' -mtime +"$days" -delete
done

ping_heartbeat ""
log "done"
