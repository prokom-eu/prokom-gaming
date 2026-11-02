#!/usr/bin/env bash
# Restores a backup made by scripts/backup.sh into a running Gaming stack (G16; a copy of prokom-web
# scripts/restore.sh). DESTRUCTIVE for the target: its database (and Umami's, when the backup has
# it) is dropped and recreated, its media volume emptied. Also loads the starting data made from
# the local seed (docs/runbook.md „Dane startowe”) — that file has no Umami database.
# Usage: scripts/restore.sh [--no-start] <backup file | rclone remote path> <project> <database>
#   test on a fresh stack:      scripts/restore.sh offsite:prokom-backups-r7k2/gaming-prod/daily/<file> prokom-gaming-restoretest prokom_gaming_prod
#   rollback with the database: scripts/restore.sh --no-start ../backups/gaming/prod/predeploy/<file> prokom-gaming-prod prokom_gaming_prod
#                               then `docker compose … up -d` (the image from .env.prod)
# The target stack must exist (its postgres running). The app is stopped for the restore. Without
# --no-start the SAME container is started again — the image it was created from, not the tag in
# .env.prod; after a tag change use --no-start and `up -d`. Pending migrations of the started
# image run when it starts (prodMigrations).
# Safety: the database in the backup's manifest must equal <database> (RESTORE_ANY_DB=1 to restore
# into another one on purpose); prokom-gaming-prod / prokom-gaming-staging ask to type the project name
# (RESTORE_CONFIRM=<project> answers it).
# Settings: `.env.backup` (or BACKUP_ENV=<file>) — AGE_IDENTITY: file with the PRIVATE age key,
# taken from the password manager for the restore and deleted afterwards. A plain `.tar` (same
# inside, not encrypted) needs no key: only the starting data from the public seed, refused unless
# its manifest says kind=import — never a decrypted backup of a server (personal data).
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash on Windows (local test): keep container paths as they are

usage="usage: scripts/restore.sh [--no-start] <backup file | remote path> <project> <database>"
start_app=1
if [ "${1:-}" = --no-start ]; then
  start_app=0
  shift
fi
source="${1:?$usage}"
project="${2:?$usage}"
db="${3:?$usage}"

root="$(cd "$(dirname "$0")/.." && pwd)"
env_file="${BACKUP_ENV:-$root/.env.backup}"
if [ -f "$env_file" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a
fi
plain=0
case "$source" in *.tar) plain=1 ;; esac
[ "$plain" = 1 ] || : "${AGE_IDENTITY:?set AGE_IDENTITY (file with the private age key)}"
backup_dir="${BACKUP_DIR:-$root/../backups/gaming}"

pg="$project-postgres-1"
app="$project-app-1"
umami="$project-umami-1"
media_volume="${project}_media"
helper_image="$(docker inspect -f '{{.Config.Image}}' "$pg")"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) restore $project: $*"; }

# The decrypted dump holds personal data (inquiries, orders, customers): kept next to the backups (not in /tmp) and
# removed on exit.
mkdir -p "$backup_dir"
work="$(mktemp -d "$backup_dir/.restore-XXXXXX")"
trap 'rm -rf "$work"' EXIT

if [ -f "$source" ]; then
  file="$source"
else
  log "download $source"
  rclone copyto "$source" "$work/backup.tar.age"
  file="$work/backup.tar.age"
fi

if [ "$plain" = 1 ]; then
  cp "$file" "$work/backup.tar"
elif ! age -d -i "$AGE_IDENTITY" -o "$work/backup.tar" "$file"; then
  log "cannot decrypt — wrong AGE_IDENTITY or not a backup file; nothing was changed"
  exit 1
fi
tar -C "$work" -xf - <"$work/backup.tar" # stdin: GNU tar reads "C:/…" as a remote host
rm "$work/backup.tar"
echo "--- manifest"
cat "$work/manifest.txt"
echo "---"

if [ "$plain" = 1 ] && [ "$(sed -n 's/^kind=//p' "$work/manifest.txt")" != import ]; then
  log "an unencrypted file must be starting data (kind=import in its manifest) — never a server backup; nothing was changed"
  exit 1
fi

backup_db="$(sed -n 's/^database=//p' "$work/manifest.txt")"
if [ "$backup_db" != "$db" ] && [ "${RESTORE_ANY_DB:-}" != 1 ]; then
  log "the backup is of database $backup_db, not $db — wrong file or target? (RESTORE_ANY_DB=1 if intended); nothing was changed"
  exit 1
fi

case "$project" in
  prokom-gaming-prod | prokom-gaming-staging)
    if [ "${RESTORE_CONFIRM:-}" != "$project" ]; then
      read -r -p "This replaces the database and media of $project. Type the project name: " answer
      [ "$answer" = "$project" ] || { echo "Aborted." >&2; exit 1; }
    fi
    ;;
esac

if docker inspect "$app" >/dev/null 2>&1; then
  log "stop app"
  docker stop "$app" >/dev/null
fi

log "database $db (drop, create, restore)"
docker exec "$pg" dropdb -U prokom --if-exists --force "$db"
docker exec "$pg" createdb -U prokom "$db"
docker exec -i "$pg" pg_restore -U prokom -d "$db" --no-owner --exit-on-error <"$work/db.dump"

if [ -f "$work/umami.dump" ]; then
  log "database umami (drop, create, restore)"
  docker stop "$umami" >/dev/null 2>&1 || true
  docker exec "$pg" dropdb -U prokom --if-exists --force umami
  docker exec "$pg" createdb -U prokom umami
  docker exec -i "$pg" pg_restore -U prokom -d umami --no-owner --exit-on-error <"$work/umami.dump"
  docker start "$umami" >/dev/null 2>&1 || log "umami not started — docker compose … up -d"
fi

log "media volume $media_volume"
# uid 1000 = user `node` of the app image, which writes new uploads to this volume.
docker run --rm -i -v "$media_volume:/media" "$helper_image" \
  sh -c 'find /media -mindepth 1 -delete && tar -C /media -xf - && chown -R 1000:1000 /media' \
  <"$work/media.tar"

if [ "$start_app" = 0 ]; then
  log "done — app left stopped; start it with docker compose … up -d, then scripts/smoke.sh"
  exit 0
fi

if docker inspect "$app" >/dev/null 2>&1; then
  log "start app ($(docker inspect -f '{{.Config.Image}}' "$app")), waiting for health"
  docker start "$app" >/dev/null
  for _ in $(seq 1 60); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$app")"
    [ "$status" = healthy ] && break
    sleep 3
  done
  [ "$status" = healthy ] || { log "app not healthy ($status) — see docker logs $app"; exit 1; }
fi

log "done — now run scripts/smoke.sh against this stack"
