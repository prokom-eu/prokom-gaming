#!/usr/bin/env bash
# Writes the Umami settings of one Gaming stack into its .env file and restarts the app
# (docs/runbook.md §1.8, §4). Installed on the server as ~/bin/gaming-umami:
#   install -m 700 /srv/prokom/prokom-gaming/scripts/server/umami-setup.sh ~/bin/gaming-umami
# Usage, from the computer: ssh -t prokom-vps '~/bin/gaming-umami staging|prod'
# The website ID is shown; the API key is typed hidden and never printed or logged.
set -euo pipefail
stack="${1:-}"
case "$stack" in
  staging) port=3201 ;;
  prod) port=3200 ;;
  *) echo "usage: gaming-umami staging|prod"; exit 1 ;;
esac
cd /srv/prokom/prokom-gaming
env_file=".env.$stack"
[ -f "$env_file" ] || { echo "$env_file missing"; exit 1; }

read -r -p "Website ID ze strony w Umami (np. 1a2b3c4d-...): " website_id
[[ "$website_id" =~ ^[0-9a-f-]{36}$ ]] || { echo "To nie wygląda na identyfikator strony (UUID)."; exit 1; }
read -r -s -p "Klucz API z Umami (wklej, nie będzie widoczny): " api_key; echo
[ -n "$api_key" ] || { echo "Pusty klucz."; exit 1; }

umask 077
cp "$env_file" "$env_file.bak-umami"
sed -i '/^UMAMI_URL=/d;/^UMAMI_WEBSITE_ID=/d;/^UMAMI_API_KEY=/d;/^UMAMI_SCRIPT_URL=/d' "$env_file"
{
  echo "UMAMI_URL=http://umami:3000"
  echo "UMAMI_WEBSITE_ID=$website_id"
  echo "UMAMI_API_KEY=$api_key"
  # Both stacks load the tracker (runda v2 §1.3, R1; policy paragraph in the draft for the lawyer).
  echo "UMAMI_SCRIPT_URL=/_s/script.js"
} >> "$env_file"
chmod 600 "$env_file"
rm -f "$env_file.bak-umami"

if [ "$stack" = staging ]; then
  compose="docker compose --env-file .env.staging -f docker/compose.prod.yml -f docker/compose.staging.yml"
else
  compose="docker compose --env-file .env.prod -f docker/compose.prod.yml"
fi
$compose up -d app >/dev/null 2>&1
for _ in $(seq 1 30); do
  s=$(docker inspect -f '{{.State.Health.Status}}' "prokom-gaming-$stack-app-1" 2>/dev/null || true)
  [ "$s" = healthy ] && break
  sleep 4
done
echo "Aplikacja $stack: ${s:-?}"
code=$(curl -s -o /dev/null -w '%{http_code}' -H "authorization: Bearer $api_key" \
  "http://127.0.0.1:$((port + 10))/api/websites/$website_id" || true)
[ "$code" = 200 ] && echo "Umami: klucz i strona pasują (200)." || echo "Umami odpowiedziało $code — sprawdź identyfikator i klucz."
