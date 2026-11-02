#!/usr/bin/env bash
# Forced command of the pipeline's SSH keys (G16; pattern: prokom-web scripts/server/deploy-gate.sh).
# One script, two keys in authorized_keys, each fixed to one stack by the argument:
#   restrict,command="/home/<admin>/bin/prokom-gaming-deploy-gate staging" ssh-ed25519 … (staging key)
#   restrict,command="/home/<admin>/bin/prokom-gaming-deploy-gate prod" ssh-ed25519 …    (production key)
# The pipeline sends only `deploy <stack> <sha>`; the stack must match the key's argument. It sends
# no files: the deploy files (docker/, scripts/, .env.example) come out of the image
# ghcr.io/prokom-eu/prokom-gaming:<sha> (/deploy, Dockerfile), which only the "Image" workflow
# builds from develop. Production accepts only the last SHA that passed staging's smoke test
# (../.gaming-staging-ok, written by deploy.sh) — the image staging runs and the boss looked at.
# Installed OUTSIDE the deploy files, so a deploy never replaces it:
#   install -m 700 scripts/server/deploy-gate.sh ~/bin/prokom-gaming-deploy-gate
# By hand on the server (same path as the pipeline):
#   SSH_ORIGINAL_COMMAND="deploy staging <sha>" ~/bin/prokom-gaming-deploy-gate staging
set -euo pipefail

repo=/srv/prokom/prokom-gaming
image=ghcr.io/prokom-eu/prokom-gaming
allowed="${1:-}"
case "$allowed" in staging | prod) ;; *) echo "deploy-gate: key without a stack (staging|prod)" >&2; exit 2 ;; esac
read -r -a cmd <<<"${SSH_ORIGINAL_COMMAND:-}"
if [ ${#cmd[@]} -ne 3 ] || [ "${cmd[0]}" != deploy ] || [ "${cmd[1]}" != "$allowed" ] ||
  [[ ! "${cmd[2]}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "deploy-gate: only 'deploy $allowed <40-char sha>' is allowed" >&2
  exit 2
fi
stack="$allowed"
sha="${cmd[2]}"

# One deploy at a time — the same lock as deploy.sh and prokom-web, held from the file swap to the end.
exec 9>"$repo/../.deploy.lock"
flock -w 600 9 || { echo "deploy-gate: another deploy still running" >&2; exit 1; }
export DEPLOY_LOCK_HELD=1

if [ "$stack" = prod ]; then
  passed="$(cat "$repo/../.gaming-staging-ok" 2>/dev/null || true)"
  if [ -z "$passed" ] || [ "$sha" != "$passed" ]; then
    echo "deploy-gate: production takes only the last image that passed staging (${passed:0:7})" >&2
    exit 1
  fi
fi

work="$(mktemp -d "$repo/../.deploy-files-XXXXXX")"
cid=''
cleanup() {
  if [ -n "$cid" ]; then docker rm -f "$cid" >/dev/null 2>&1 || true; fi
  rm -rf "$work"
}
trap cleanup EXIT

docker pull -q "$image:$sha" >/dev/null || { echo "deploy-gate: image $image:$sha not found" >&2; exit 1; }
cid="$(docker create "$image:$sha")"
if ! docker cp -q "$cid:/deploy" "$work/new" 2>/dev/null; then
  echo "deploy-gate: $image:$sha has no /deploy — deploy it by hand, docs/runbook.md" >&2
  exit 1
fi
for p in docker scripts/deploy.sh scripts/smoke.sh scripts/backup.sh .env.example; do
  [ -e "$work/new/$p" ] || { echo "deploy-gate: /deploy/$p missing in the image" >&2; exit 1; }
done

# Swap the deploy files with two renames (.env.* and everything else in the repo stay).
mkdir "$work/old"
for d in docker scripts; do
  [ -e "$repo/$d" ] && mv "$repo/$d" "$work/old/$d"
  mv "$work/new/$d" "$repo/$d"
done
cp "$work/new/.env.example" "$repo/.env.example"
echo "${sha:0:7}" >"$repo/REVISION" # version of the deploy files (deploys.log: running image)

cleanup
trap - EXIT
exec bash "$repo/scripts/deploy.sh" "$stack" "$sha"
