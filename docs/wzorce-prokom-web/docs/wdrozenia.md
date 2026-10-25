# Wdrożenia

> Serwer: VPS Seohost (ADR-002). Adresy, użytkownik SSH i ścieżki uzupełniamy w S10.

## Środowiska
| Środowisko | Gałąź | Adres | Baza | Indeksowanie |
|---|---|---|---|---|
| lokalne | dowolna | `*.localhost:3000` | Docker lokalnie | — |
| staging | `develop` | `staging.<domena>` (hasło) | `prokom_staging` (stos `prokom-staging`) | `noindex` |
| produkcja | `main` | domeny docelowe | `prokom_prod` (stos `prokom-prod`) | tak |

## Pipeline (GitHub Actions)
1. PR → lint, typecheck, test, build, gitleaks.
2. Merge do `develop` → obraz Docker (tag = SHA) → GHCR (`ghcr.io/prokom-eu/prokom-web`) → wdrożenie na staging przez SSH → migracje → smoke test (`scripts/smoke.sh`) → testy e2e → Lighthouse CI (budżet z `jakosc.md`).
3. Merge `develop` → `main` **tylko po akceptacji szefa w Asanie** → ten sam obraz (zbudowany z `develop`, nie budowany ponownie) na produkcję → `pg_dump` → migracje → smoke test.
4. Smoke test nie przechodzi → wdrożenie nieudane, automatyczny powrót do poprzedniego obrazu aplikacji (baza bez zmian), alert.

## Obraz i start aplikacji (S9a)
- `Dockerfile` (wieloetapowy): pełna instalacja → `pnpm build` (zmienne tylko atrapy) → obraz z `.next/standalone`, użytkownik `node`, `HEALTHCHECK` na `/api/health`. Lokalnie: `docker build -t prokom-web:local .`.
- `.github/workflows/image.yml`: każdy push do `develop` → `ghcr.io/prokom-eu/prokom-web:<SHA>`. Na `main` obraz **nie** jest budowany: squash do `main` daje nowy SHA, a produkcja ma dostać obraz przetestowany na stagingu — pipeline S10 promuje tag z `develop` (np. `docker buildx imagetools create`).
- `docker/compose.prod.yml`: `app` + `postgres` (wolumeny `pgdata`, `media`; limity pamięci; rotacja logów 5 × 10 MB). Zmienne w `.env.prod` obok repo (wzór: `.env.example`, sekcja „Server only”).
- **Migracje** uruchamia sama aplikacja przy starcie (`prodMigrations` w `payload.config.ts`, tylko `NODE_ENV=production`) — wdrożenie jest gotowe, gdy `/api/health` odpowiada 200. Przed wdrożeniem produkcji: `pg_dump` (skrypt w S9b).
- `/api/health` odpowiada na każdym hoście (200 / 503, bez danych). Każda odpowiedź ma `X-Request-Id` (przyjęty z Nginx `$request_id` albo nowy) — ten sam identyfikator jest w logach.
- Logi: JSON na stdout (`level`, `time`, `msg`, `tenant`, `requestId`) — `lib/log.ts` i logger Payload w produkcji. Odczyt: `docker compose -f docker/compose.prod.yml logs app`.
- Smoke test: `PANEL_HOST=<domena panelu> bash scripts/smoke.sh http://127.0.0.1:3000 <domena> …` (Host w nagłówku; bez domen — trzy lokalne `*.localhost`, panel domyślnie `panel.localhost`). Sprawdza na każdej domenie `/`, `sitemap.xml`, `robots.txt`, `/mapa-strony` i 404 dla `/admin`; domena z „biznes” w nazwie musi dać 200 na `/oferta`, `/zapytanie`, `/aktualnosci`, pozostałe — 404 (strażnik linii). Tylko trasy działające bez treści z panelu, bo błąd smoke cofa wdrożenie.

## Nginx i staging (S9b-1)
Trzy stosy Docker Compose na jednym serwerze, połączone siecią `prokom-proxy`:
- `docker/compose.proxy.yml` (`prokom-proxy`): Nginx + certbot, jedyny z portami 80/443. Konfiguracja w `docker/nginx/`: `nginx.conf`, `snippets/`, `templates/` (domeny z `.env.proxy`). Aplikacje znajduje po nazwie kontenera (`prokom-prod-app-1`, `prokom-staging-app-1`) w chwili żądania, więc startuje także, gdy jeden stos nie działa.
- `docker/compose.prod.yml` (`prokom-prod`) i ta sama definicja + `docker/compose.staging.yml` (`prokom-staging`): osobne bazy, wolumeny i limity pamięci. Staging zawsze czyta `.env.staging` (na sztywno w nakładce), więc nie może dostać sekretów produkcji.

Co robi Nginx:
- HTTP → HTTPS (301), poza `/.well-known/acme-challenge/` (odnawianie certyfikatów).
- Obce hosty: brak odpowiedzi (444, a przez HTTPS bez certyfikatu).
- Nadpisuje nagłówki od klienta: `Host`, `X-Real-IP` (limit zapytań w aplikacji), `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Request-Id` (`$request_id` — ten sam identyfikator w logu Nginx i aplikacji).
- Nagłówki: HSTS (bez `includeSubDomains`, bo pro-kom.eu ma inne usługi), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, bazowe CSP (`frame-ancestors`, `base-uri`, `object-src`, `form-action`). Strony: ramki zabronione, poza `/podglad/` (tylko z domeny panelu). Panel: ramki tylko z własnej domeny.
- Limity: body 64 KB na domenach stron, 20 MB na panelu (obrazy); `/api/health` 1 żądanie/s na IP (zapas 10), `/api/inquiry` 10/min na IP (zapas 5) — odpowiedź 429.
- Staging: hasło (basic auth) i `X-Robots-Tag: noindex, nofollow` na wszystkim.
- Logi dostępu JSON na stdout, adres **bez query** (tokeny podglądu nie trafiają do access logu). Wyjątek: log błędów Nginx przy błędzie aplikacji (502, restart) zapisuje pełną linię żądania, także z tokenem podglądu — token jest podpisany i krótkotrwały, a log błędów rotowany jak reszta.

Pierwsze uruchomienie na serwerze (S10, szczegóły w runbooku):
1. `docker network create prokom-proxy` (raz).
2. Plik hasła stagingu poza repo (ścieżka w `STAGING_HTPASSWD_FILE`, względna do `docker/`); `openssl` zapyta o hasło:
   ```bash
   printf 'szef:%s\n' "$(openssl passwd -apr1)" > ../secrets/staging.htpasswd
   ```
3. Pierwsze certyfikaty, zanim wystartuje Nginx (bez nich nie ruszy) — certbot z kontenera, na wolumenie `prokom-proxy_letsencrypt`, port 80 wolny:
   ```bash
   docker compose --env-file .env.proxy -f docker/compose.proxy.yml run --rm -p 80:80 --entrypoint certbot certbot certonly --standalone --cert-name prokom-prod -d prokombiznes.pl -d …
   ```
   i tak samo `--cert-name prokom-staging` dla domen stagingu i panelu stagingu. Później odnawia kontener `certbot` (`renew --webroot`, co 12 h; przy odnowieniu zapisuje webroot w miejsce `standalone`), a Nginx przeładowuje się co 6 h.
4. `docker compose --env-file .env.proxy -f docker/compose.proxy.yml up -d`, potem stosy aplikacji.
5. Smoke przez Nginx: `PANEL_HOST=<panel> bash scripts/smoke.sh https://127.0.0.1 <domeny…>` (staging: `SMOKE_AUTH=użytkownik:hasło`).

Test lokalny (S9b-1, 17.10): certyfikaty self-signed, porty 18080/18443, `SMOKE_INSECURE=1` — smoke zielony, nagłówki jak wyżej, staging 401 bez hasła, obcy host 444, 413 dla dużego body, 429 na health, ten sam `requestId` w obu logach.

## Kopie zapasowe (S9b-2)
- `scripts/backup.sh <prod|staging> [predeploy]`: `pg_dump -Fc` (sprawdzony `pg_restore --list`) + wolumen mediów + manifest (data, obraz, lista migracji) w jednym pliku, szyfrowanym `age` kluczem publicznym → `../backups/<stos>/<rodzaj>/` i `RCLONE_REMOTE/<stos>/<rodzaj>/` (poza serwerem, inny dostawca — ADR-002; cel: `TODO(S10)`).
- Rodzaje i retencja (usuwanie po wieku, lokalnie i zdalnie): `daily` 14 dni, `monthly` (kopia z 1. dnia miesiąca) 93 dni, `predeploy` 30 dni.
- Co noc z crona (prod i staging); przed każdym wdrożeniem produkcji `backup.sh prod predeploy`.
- `scripts/restore.sh <plik|zdalna ścieżka> <projekt> <baza>`: odszyfrowanie kluczem prywatnym (tylko menedżer haseł), baza od nowa (`pg_restore`), wolumen mediów od nowa, aplikacja z powrotem `healthy`. Na `prokom-prod`/`prokom-staging` pyta o nazwę projektu.
- Raz w miesiącu: próbne odtworzenie na osobnym stosie `prokom-restoretest` (runbook §7).
- Test 17.10 (lokalnie): kopia stosu z obrazu → wysyłka `rclone` → odtworzenie na czystym stosie: liczby rekordów i suma kontrolna mediów zgodne, smoke zielony, logowanie admina działa; zły klucz przerywa przed zmianami; retencja usuwa stare pliki.
- Procedury krok po kroku: `docs/runbook.md`.

## Cofnięcie wdrożenia
Tylko obraz (migracje zgodne wstecz) albo obraz + baza z kopii `predeploy` — `docs/runbook.md` §4 i zasada migracji §5.

## Nowa domena — checklista
1. Domena kupiona u Seohost (abonent: firma).
2. Najpierw wpis w `docs/dns.md` (PR), potem rekord A/AAAA → IP serwera. Przy istniejących domenach z pocztą **nie ruszamy MX/SPF/DKIM/DMARC** bez osobnego planu (ADR-002).
2a. Domena wysyłająca powiadomienia z formularzy: SPF, DKIM, DMARC wg `docs/dns.md`, test w mail-tester.com.
3. Domeny (prod + staging) w rekordzie `Tenants`.
4. Certyfikat Let's Encrypt, blok `server` w Nginx.
5. Search Console: weryfikacja DNS, sitemap.
6. Monitoring dostępności.
