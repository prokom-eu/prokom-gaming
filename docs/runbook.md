# Runbook — prokom-gaming na serwerze

Krok po kroku: pierwsze uruchomienie, dane startowe, wdrożenia, cofnięcie, kopie. Opis stosów i zmiennych: `docs/wdrozenia.md`. **Serwer, Nginx, kopie B2 i monitoring są już postawione przez `prokom-web`** — wspólne kroki (utwardzenie, GHCR, rclone, klucz `age`, Better Stack, „strona nie działa”) są w `prokom-web/docs/runbook.md`; tu tylko to, co dochodzi dla Gaming.

## 0. Co gdzie jest

| Rzecz | Gdzie | Uwagi |
|---|---|---|
| Pliki wdrożenia | `/srv/prokom/prokom-gaming` (`docker/`, `scripts/`, `.env.example`, `REVISION`) | nie klon repo; podmienia je bramka przy każdym wdrożeniu |
| Stos stagingu | `prokom-gaming-staging`, zmienne `.env.staging` | `prokom-gaming-staging-app-1`, `-postgres-1`, `-umami-1` |
| Stos produkcji | `prokom-gaming-prod`, zmienne `.env.prod` | baza `prokom_gaming_prod` |
| Nginx + certbot | stos `prokom-proxy` z repo `prokom-web` (`/srv/prokom/prokom-web`) | szablony `gaming-*.conf.template` |
| Kopie | `scripts/backup.sh`, `restore.sh`, `.env.backup` (tu) | `../backups/gaming/`, B2 `gaming-<stos>/` |
| Bramka wdrożeń | `~/bin/prokom-gaming-deploy-gate` | kopia `scripts/server/deploy-gate.sh`, poza plikami wdrożenia |
| Dzienniki wdrożeń | `/srv/prokom/deploys.log`, `deploy-output.log` | wspólne z `prokom-web` (linie `gaming-staging`, `gaming-prod`) |

**Pliki wdrożenia są wspólne dla obu stosów:** wdrożenie stagingu podmienia `docker/` i `scripts/` także dla produkcji, a staging może wyprzedzać produkcję o dni — nocny `backup.sh prod` i ręczne `$prod …` używają wtedy nowszych plików (jak w `prokom-web`). Zmiana w `compose.prod.yml` albo skryptach, która nie pasuje do starszego obrazu produkcji, wymaga wdrożenia produkcji tym samym obrazem albo ręcznej uwagi.

**SHA dla produkcji:** ostatnie, które przeszło staging — `cat /srv/prokom/.gaming-staging-ok` (pisze je `deploy.sh` po zielonym smoke stagingu; to samo co ostatnia linia `gaming-staging … ok` w `../deploys.log`).

Skróty (w `/srv/prokom/prokom-gaming`):
```bash
staging="docker compose --env-file .env.staging -f docker/compose.prod.yml -f docker/compose.staging.yml"
prod="docker compose --env-file .env.prod -f docker/compose.prod.yml"
```

## 1. Staging — jednorazowo

1. **DNS** wg `docs/dns.md` (PR, potem Seohost): `staging` → IP serwera. Sprawdzenie: `Resolve-DnsName staging.prokomgaming.pl -Type A`.
2. **Pliki wdrożenia** (Git Bash w repo, gałąź `develop` po scaleniu G16):
   ```bash
   ssh prokom-vps 'install -d /srv/prokom/prokom-gaming /srv/prokom/backups/gaming'
   git archive --format=tar HEAD docker scripts .env.example | ssh prokom-vps 'tar -x -C /srv/prokom/prokom-gaming'
   ```
3. **Zmienne:** `.env.staging` wg `docs/wdrozenia.md` → „Zmienne serwera” (`chmod 600`). `APP_IMAGE_TAG` = SHA pierwszego obrazu Gaming z GHCR (Actions → „Image” po scaleniu G16). Na start bez `UMAMI_URL`/`UMAMI_API_KEY` (klucz powstaje w kroku 8) i bez `IMAP_*` (krok 10). Para VAPID: `pnpm dlx web-push@3.6.7 generate-vapid-keys` na komputerze → od razu do menedżera haseł i do pliku.
4. **Nginx:** po scaleniu PR Gaming w `prokom-web` (szablony trafią na serwer z wdrożeniem stagingu `prokom-web`): w `/srv/prokom/prokom-web/.env.proxy` `GAMING_STAGING_HOST=staging.prokomgaming.pl`; certyfikat (port 80 wolny tylko na chwilę — Nginx stoi ok. 1 min):
   ```bash
   cd /srv/prokom/prokom-web
   docker compose --env-file .env.proxy -f docker/compose.proxy.yml stop nginx
   docker compose --env-file .env.proxy -f docker/compose.proxy.yml run --rm -p 80:80 --entrypoint certbot certbot certonly --standalone --cert-name prokom-gaming-staging -d staging.prokomgaming.pl
   docker compose --env-file .env.proxy -f docker/compose.proxy.yml up -d nginx
   ```
   (Gdy produkcja `prokom-web` już działa, proxy uruchamiaj z jej nakładką — `prokom-web/docs/runbook.md` §3.)
5. **Pierwszy start stosu:** `cd /srv/prokom/prokom-gaming && $staging up -d`; `docker inspect -f '{{.State.Health.Status}}' prokom-gaming-staging-app-1` → `healthy` (migracje na pustej bazie, do kilku minut).
6. **Dane startowe** — §2.
7. **Pierwszy admin** — Nginx blokuje formularz pierwszego konta na zawsze. Tunel z komputera:
   ```bash
   ssh -N -L 3201:127.0.0.1:3201 prokom-vps
   ```
   → `http://localhost:3201/admin/create-first-user` (hasło ≥ 12 znaków, menedżer haseł „prokom-gaming panel staging”). Potem tunel zamknij (Ctrl+C).
8. **Umami** (każdy stos ma **osobne** Umami — staging port 3211, produkcja 3210; strona, konto i klucz z jednego nie działają w drugim):
   - tunel `ssh -N -L 3211:127.0.0.1:3211 prokom-vps` → `http://localhost:3211`, logowanie domyślne z dokumentacji Umami (`admin` / `umami`) → **od razu zmiana hasła** (Profile → Change password; menedżer haseł „Umami Gaming staging”);
   - Settings → Websites → „Add website” (`staging.prokomgaming.pl`) → skopiuj **Website ID**; Profile → API keys → „Create key” (klucz nie trafia do czatu);
   - zapis na serwerze: `ssh -t prokom-vps '~/bin/gaming-umami staging'` (skrypt `scripts/server/umami-setup.sh`, instalacja jak w jego nagłówku): Website ID widoczny, klucz wpisywany niewidocznie; dopisuje `UMAMI_URL`, `UMAMI_WEBSITE_ID`, `UMAMI_API_KEY`, `UMAMI_SCRIPT_URL=/_s/script.js`, restartuje aplikację i sprawdza klucz (`pasują (200)`; 401 = Website ID albo klucz z innego Umami).
   - Sprawdzenie: smoke („has the Umami script”), panel → Ustawienia → „Statystyki strony” = połączone; wejście na stronę widać w Umami. Ustawione 5.11.2026.
9. **Bramka i klucz pipeline'u** (środowisko GitHub `staging` w repo `prokom-gaming`, wdrożenia tylko z `develop`):
   ```bash
   install -m 700 /srv/prokom/prokom-gaming/scripts/server/deploy-gate.sh ~/bin/prokom-gaming-deploy-gate
   ssh-keygen -t ed25519 -N '' -C github-gaming-staging -f /tmp/gaming-staging
   ```
   W `~/.ssh/authorized_keys`: `restrict,command="/home/<admin>/bin/prokom-gaming-deploy-gate staging" <zawartość /tmp/gaming-staging.pub>`. Klucz prywatny wprost do sekretu (`gh secret set STAGING_SSH_KEY --env staging --repo prokom-eu/prokom-gaming < /tmp/gaming-staging`, z komputera z `gh` — plik przenieś przez `ssh prokom-vps cat /tmp/gaming-staging | gh secret set …`), potem `rm /tmp/gaming-staging*`. Zmienne środowiska: `STAGING_SSH_TARGET=<admin>@194.28.50.70`, `STAGING_SSH_KNOWN_HOSTS` — te same wartości co w `prokom-web`. Próba bez GitHuba: `SSH_ORIGINAL_COMMAND="deploy staging <SHA>" ~/bin/prokom-gaming-deploy-gate staging`.
10. **Próby panelu przed demo (spec. panelu, „Dopisek do G16”):** IMAP — `IMAP_*` w `.env.staging`, `$staging up -d app`, mail na skrzynkę z numerem `PKG-…` w temacie trafia do wątku; odpowiedź z panelu ma kopię w „Wysłane” (po próbie `IMAP_*` z `.env.staging` usuń, jeśli produkcja ma czytać tę skrzynkę); push — panel dodany do ekranu głównego na Androidzie i iPhonie, Ustawienia → „Wyślij próbne”; jeden ręczny przebieg „Sprawdź ceny”; maile weryfikacji i resetu konta klienta (linki z `SITE_URL`); zapytanie ze strony → oba maile w skrzynce, poza spamem (Gmail, Outlook) — SPF/DKIM/DMARC wg `docs/dns.md`.
11. **Kopie i monitoring:** `.env.backup` (600) jak w `prokom-web` (`AGE_RECIPIENT="$(cat /srv/prokom/secrets/age.pub)"`, `RCLONE_REMOTE=offsite:prokom-backups-r7k2`); próba `scripts/backup.sh staging` → `done`, plik w `rclone lsf offsite:prokom-backups-r7k2/gaming-staging/daily/`. Cron (`crontab -e`, UTC, po kopiach `prokom-web`):
   ```
   0 3 * * * cd /srv/prokom/prokom-gaming && scripts/backup.sh staging >> ../backups/backup.log 2>&1
   ```
   Better Stack: heartbeat „Kopia Gaming staging” → `BACKUP_HEARTBEAT_URL_STAGING`; monitor `https://staging.prokomgaming.pl/api/health` z nagłówkiem loginu `monitor` (`prokom-web` `staging-login.sh`).
12. **Test powrotu:** `scripts/deploy.sh staging <nowszy SHA> --fail-smoke-for-test` → w `../deploys.log` „FAILED, rolled back”, potem ten SHA normalnie.

## 2. Dane startowe (zrzut lokalnego seeda)

Seed na serwerze nie działa. Dane (16 zestawów, 57 opcji, partia cen, 1 584 klatki, FAQ, poradniki, treści prawne, szablony maili, 46 zdjęć) robimy lokalnie na **tym samym commicie co obraz** i wgrywamy `restore.sh`. Zawierają tylko dane publicznego repo — bez kont i danych osobowych, więc plik `.tar` nie musi być szyfrowany.

Lokalnie (Git Bash, działa `docker/compose.dev.yml`):
```bash
sha=<SHA obrazu na stagingu>
git worktree add ../gaming-import "$sha" && cd ../gaming-import && pnpm install --frozen-lockfile
docker exec prokom-gaming-dev-postgres-1 createdb -U prokom prokom_gaming_staging
export DATABASE_URL=postgresql://prokom:prokom@127.0.0.1:54321/prokom_gaming_staging \
  PAYLOAD_SECRET="$(openssl rand -hex 32)" MEDIA_DIR="$PWD/import-media" \
  SMTP_HOST=127.0.0.1 SMTP_PORT=1026 MAIL_FROM_ADDRESS=import@example.invalid \
  SEED_ADMIN_EMAIL=import@example.invalid SEED_ADMIN_PASSWORD="$(openssl rand -hex 16)"
pnpm payload migrate && pnpm seed
# bez admina seeda i bez przykładowych zamówień, egzemplarzy i „gotowych od ręki” (FK: cascade / set null)
docker exec prokom-gaming-dev-postgres-1 psql -U prokom -d prokom_gaming_staging -v ON_ERROR_STOP=1 \
  -c 'delete from orders; delete from units; delete from stock; delete from users;'
mkdir import
docker exec prokom-gaming-dev-postgres-1 pg_dump -U prokom -d prokom_gaming_staging -Fc > import/db.dump
tar -C import-media -cf import/media.tar .
printf 'stack=staging\nkind=import\ncreated=%s\ndatabase=prokom_gaming_staging\napp_image=%s\n' "$(date -u +%Y%m%dT%H%M%SZ)" "$sha" > import/manifest.txt
tar -C import -cf gaming-start.tar db.dump media.tar manifest.txt
scp gaming-start.tar prokom-vps:/srv/prokom/backups/gaming/
```
Na serwerze:
```bash
cd /srv/prokom/prokom-gaming
scripts/restore.sh ../backups/gaming/gaming-start.tar prokom-gaming-staging prokom_gaming_staging
bash scripts/smoke.sh http://127.0.0.1:3201 staging.prokomgaming.pl
rm ../backups/gaming/gaming-start.tar
```
Sprawdzone lokalnie 02.11 (G16) na stosie z obrazu: po wgraniu smoke zielony, `/zestawy/wampir` i zdjęcia 200, 0 kont, 0 zamówień. Lokalnie sprzątanie: `cd ../prokom-gaming && git worktree remove --force ../gaming-import`, `docker exec prokom-gaming-dev-postgres-1 dropdb -U prokom prokom_gaming_staging`.

Po wgraniu: pierwszy admin (§1.7), treści do poprawy w panelu — dane firmy, regulamin, polityka (STAN G15 „Treści z nowymi danymi firmy”). **Produkcja:** ta sama procedura z `prokom_gaming_prod` albo kopia stagingu — decyzja przed produkcją (`docs/wdrozenia.md`).

## 3. Wdrożenie stagingu (pipeline)

Każde scalenie do `develop`: „Image” → „Deploy staging” → bramka → `scripts/deploy.sh staging <SHA>` (opis i reguły powrotu: `docs/wdrozenia.md` → „Pipeline”; zachowanie identyczne jak `prokom-web/docs/runbook.md` §2). Ręcznie: Actions → „Deploy staging” → Run workflow z pełnym SHA z `develop` (ponowne wdrożenie albo cofnięcie do starszego obrazu).

## 4. Produkcja

**Warunek:** zadanie „SZEF · akceptacja” w Asanie odhaczone; obraz działa na stagingu (smoke zielony, sprawdzony na telefonie).

**Pierwsze wdrożenie (raz):**
1. DNS: `@` i `www` → IP (`docs/dns.md`).
2. Certyfikat `prokom-gaming-prod` (`-d prokomgaming.pl -d www.prokomgaming.pl`) jak w §1.4; `GAMING_PROD_HOST=prokomgaming.pl` w `.env.proxy`; proxy z nakładką `docker/compose.proxy.gaming-prod.yml` (`prokom-web`) — od tej chwili zawsze z nią.
3. `.env.prod` (osobne sekrety, osobna para VAPID, `SITE_ENV=production`, `APP_IMAGE_TAG` = SHA ze stagingu), `$prod up -d`, dane startowe (§2, decyzja z `docs/wdrozenia.md`), pierwszy admin tunelem na port 3200, Umami produkcji (§1.8 z portem 3210, stroną `prokomgaming.pl` i `gaming-umami prod`; skrypt śledzący także na produkcji — runda v2 §1.3, akapit o statystykach w projekcie polityki dla prawnika; bez Umami smoke produkcji nie przejdzie). Ustawione 5.11.2026.
4. Bramka: druga linia w `authorized_keys` z `… prokom-gaming-deploy-gate prod` i osobnym kluczem `github-gaming-production`; środowisko GitHub `production` (tylko `develop`) z `PRODUCTION_SSH_KEY`, `PRODUCTION_SSH_TARGET`, `PRODUCTION_SSH_KNOWN_HOSTS`.
5. Cron: `15 3 * * * cd /srv/prokom/prokom-gaming && scripts/backup.sh prod >> ../backups/backup.log 2>&1`; heartbeat `BACKUP_HEARTBEAT_URL_PROD`; monitor Better Stack `https://prokomgaming.pl/api/health`; Search Console (sitemap).

**Każde wdrożenie:** `gh workflow run deploy-production.yml --repo prokom-eu/prokom-gaming -f sha=<SHA, które przeszło staging>` (albo Actions → „Deploy production”). Serwer: kopia `predeploy` → obraz → `healthy` → smoke → przy błędzie powrót. Potem smoke przez Nginx: `bash scripts/smoke.sh https://127.0.0.1 prokomgaming.pl` i PR `develop → main`.

## 5. Cofnięcie

**A. Tylko obraz** (nowa wersja nie dodała migracji — `git diff --stat <stary> <nowy> -- src/migrations`):
- staging: Actions → „Deploy staging” z poprzednim SHA;
- produkcja: bramka produkcji przyjmuje tylko SHA ze stagingu, więc cofnięcie na serwerze: `scripts/deploy.sh prod <poprzedni SHA>` (poprzedni tag: `../deploys.log`, linie `gaming-prod`).

**B. Obraz + baza** (migracja niezgodna wstecz albo zepsute dane):
1. W `.env.prod` poprzedni `APP_IMAGE_TAG`.
2. `scripts/restore.sh --no-start ../backups/gaming/prod/predeploy/<plik> prokom-gaming-prod prokom_gaming_prod` (klucz prywatny `age` — `prokom-web/docs/runbook.md` §6.1; `--no-start` konieczne, inaczej wystartuje nowy obraz i ponowi migrację).
3. `$prod up -d`, zdrowie, smoke. Zapytania między kopią a cofnięciem giną — sprawdź skrzynkę Gaming i wpisz ręcznie.

## 6. Odtworzenie z kopii, test odtworzenia, awarie
Jak `prokom-web/docs/runbook.md` §6–§8 z nazwami Gaming: projekt `prokom-gaming-<stos>`, baza `prokom_gaming_<stos>`, kopie `gaming-<stos>/` w B2, stos testowy `prokom-gaming-restoretest` (compose produkcji z `--project-name` i osobnym plikiem env, porty inne niż 3200/3210).
