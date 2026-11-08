# Wdrożenia — prokom-gaming

> Serwer: wspólny VPS z `prokom-web` (webh.pl, ADR-019 w `prokom-web`; ADR-G001 §5). Kroki na serwerze: `docs/runbook.md`. Wzór całości: `prokom-web/docs/wdrozenia.md` i `docs/runbook.md` — tu opisujemy to, co u Gaming inne.

## Środowiska
| Środowisko | Gałąź | Adres | Stos / baza | Indeksowanie |
|---|---|---|---|---|
| lokalne | dowolna | `http://localhost:3100` (panel `/admin`) | `prokom-gaming-dev` (54321) | — |
| staging | `develop` | `https://staging.prokomgaming.pl` (hasło Nginx) | `prokom-gaming-staging` / `prokom_gaming_staging` | `noindex` (Nginx + `SITE_ENV=staging`) |
| produkcja | `develop` → po akceptacji | `https://prokomgaming.pl` | `prokom-gaming-prod` / `prokom_gaming_prod` | tak |

Panel jest pod `/admin` tej samej domeny (ADR-G001 §3) — na stagingu za tym samym hasłem Nginx co strona.

## Pipeline
1. **PR** → `ci.yml`: lint, format, typecheck, Vitest, build, e2e, gitleaks.
2. **Scalenie do `develop`** → `image.yml`: obraz `ghcr.io/prokom-eu/prokom-gaming:<SHA>` (z plikami wdrożenia tego commita w `/deploy`) → `deploy-staging.yml`: serwer dostaje **tylko SHA**, bramka (`scripts/server/deploy-gate.sh`) wyjmuje pliki wdrożenia z obrazu i uruchamia `scripts/deploy.sh staging <SHA>`: pobranie → `APP_IMAGE_TAG` w `.env.staging` → `up -d` → `healthy` (migracje przy starcie) → `scripts/smoke.sh` na porcie aplikacji. Błąd → powrót do poprzedniego obrazu (gdy nie weszły nowe migracje), przebieg czerwony.
3. **Produkcja — tylko po akceptacji szefa w Asanie:** `deploy-production.yml` uruchamiany ręcznie (Actions → „Deploy production” albo `gh workflow run deploy-production.yml -f sha=<SHA>` w `/wdrozenie produkcja`). Serwer przyjmuje wyłącznie SHA, które **ostatnie przeszło staging** (zielony smoke — `/srv/prokom/.gaming-staging-ok`, pisze go `deploy.sh`); `deploy.sh prod` robi najpierw kopię `predeploy`, potem to samo co staging. Obraz na produkcję nie jest budowany drugi raz.
4. **`main`** = stan produkcji: po udanym wdrożeniu PR `develop → main` (zapis, co jest na produkcji; obraz z `main` nie powstaje).

Dlaczego ręczny workflow, a nie `deploy.sh` z SSH: wdrożenie przez Claude Code to jedna komenda `gh`, bez klucza do serwera na komputerze; serwer i tak pilnuje, że na produkcję idzie tylko obraz sprawdzony na stagingu (decyzja Krystiana 02.11).

**Każda późniejsza zmiana na stronie:** PR → scalenie do `develop` → staging sam się aktualizuje (ok. 10 min) → sprawdzenie na stagingu → `/wdrozenie produkcja`.

## Obraz i start aplikacji
- `Dockerfile`: pełna instalacja → `pnpm build` (zmienne tylko atrapy) → obraz z `.next/standalone`, użytkownik `node`, `HEALTHCHECK` na `/api/health` co 15 s, pliki wdrożenia w `/deploy`.
- **Migracje** uruchamia aplikacja przy starcie (`prodMigrations`); wdrożenie gotowe, gdy `/api/health` = 200.
- **Zadania w tle** (alarm marży, retencja, SLA, odbiór IMAP, push, sprawdzanie cen, raport tygodniowy): cron Payload startuje z pierwszym `/api/health` (zdrowie Dockera, G16) — nie czeka na wejście do panelu. Przy starcie zadania, które zostały w `processing` po zabitym kontenerze, są zwalniane (`src/jobs/releaseStuck.ts`; tylko na serwerze — `SITE_ENV` staging albo production).
- **Strefa czasu:** kontener w UTC (bez `TZ`). Retencja zapytań idzie o 3:00 UTC (4:00/5:00 w Polsce); raport tygodniowy liczy czas polski sam.
- Logi: JSON na stdout (`lib/logger`, logger Payload). Odczyt: `docker logs prokom-gaming-staging-app-1`.

## Stosy Compose
`docker/compose.prod.yml` (`prokom-gaming-prod`) i ta sama definicja + `docker/compose.staging.yml` (`prokom-gaming-staging`):

| Usługa | Limit pamięci (prod / staging) | Port na loopbacku (prod / staging) | Uwagi |
|---|---|---|---|
| `app` | 1024 / 768 MB | 3200 / 3201 | sieć `prokom-proxy`; wolumen `media` |
| `postgres` | 512 MB | — | bazy: aplikacji i `umami`, nocny `pg_dump` (ADR-G001 zakładało 256 MB przy serwerze 8 GB — serwer ma 16 GB) |
| `umami` | 384 MB | 3210 / 3211 | Umami 3.4.1 (ADR-G009); publicznie tylko skrypt i zbieranie przez Nginx; panel Umami tunelem SSH; jego awaria nie cofa wdrożenia aplikacji |
| `umami-db` | — | — | jednorazowo tworzy bazę `umami` |

Staging zawsze czyta `.env.staging` (na sztywno w nakładce) — nie może dostać sekretów produkcji.

## Zmienne serwera
`.env.staging` / `.env.prod` w `/srv/prokom/prokom-gaming` (600, wartości z menedżera haseł — nie przez czat ani repo). Wzór i opisy: `.env.example`.

| Zmienna | Staging | Produkcja | Uwagi |
|---|---|---|---|
| `NODE_ENV` | — | — | ustawia compose (`production`) |
| `SITE_ENV` | `staging` | `production` | |
| `SITE_URL` | `https://staging.prokomgaming.pl` | `https://prokomgaming.pl` | wymagany; linki w mailach; `deploy.sh` bierze z niego host smoke testu |
| `DATABASE_URL` | `…@postgres:5432/prokom_gaming_staging` | `…@postgres:5432/prokom_gaming_prod` | hasło = `POSTGRES_PASSWORD` |
| `PAYLOAD_SECRET` | osobny | osobny | ≥ 32 znaki |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | skrzynka Gaming | skrzynka Gaming | konto SMTP skrzynki (P3) |
| `MAIL_FROM_ADDRESS`, `INQUIRY_NOTIFY_EMAIL` | skrzynka Gaming | skrzynka Gaming | ta sama skrzynka (P3); `INQUIRY_NOTIFY_EMAIL` wymagany |
| `ALERT_EMAIL` | Krystian | Krystian | wymagany przy `NODE_ENV=production` |
| `IMAP_HOST`, `IMAP_USER`, `IMAP_PASSWORD` (`IMAP_PORT`, `IMAP_SENT_FOLDER`) | skrzynka Gaming | skrzynka Gaming | odbiór odpowiedzi (P4); staging i produkcja czytają tę samą skrzynkę — **na stagingu włączyć tylko na czas próby** (inaczej obie bazy przypinają te same maile) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | osobna para | osobna para | zmiana pary unieważnia subskrypcje (P4) |
| `ANTHROPIC_API_KEY` | tak | tak | limit w konsoli Anthropic (ADR-G007 §4) |
| `UMAMI_SCRIPT_URL`, `UMAMI_WEBSITE_ID` | `/_s/script.js`, strona „staging” | `/_s/script.js`, strona „produkcja” | **wymagane od R1** — pełny smoke sprawdza skrypt na głównej (bez nich wdrożenie się cofa). Produkcja: najpierw akapit „Statystyki” z `docs/prawne/polityka-projekt-v2.md` w panelu (ADR-G009 pkt 5, decyzja Krystiana 04.11) |
| `UMAMI_URL`, `UMAMI_API_KEY` | `http://umami:3000`, klucz | `http://umami:3000`, klucz | statystyki w panelu (P8) |
| `FEATURE_READY`, `FEATURE_VOUCHER` | `1` (demo dla szefa) | puste do decyzji [SZEF] | czytane przy każdym żądaniu — bez przebudowy obrazu |
| `INQUIRY_RETENTION_MONTHS` | — | domyślnie 24 | |
| `APP_IMAGE_TAG` | SHA | SHA | zmienia `deploy.sh` |
| `POSTGRES_PASSWORD` | osobne | osobne | tylko hex (`openssl rand -hex 24`) — trafia do adresu bazy |
| `APP_PORT`, `UMAMI_PORT` | 3201, 3211 | 3200, 3210 | |
| `UMAMI_APP_SECRET` | osobny | osobny | `openssl rand -hex 32` |

**Staging:** zmienne `UMAMI_*` w `.env.staging` muszą być **przed scaleniem** PR z R1 (wdrożenie stagingu rusza samo).

**Umami na produkcji — kolejność (R1, 04.11.2026):** (1) panel produkcji → Polityka prywatności → wklej akapit „Statystyki” z `docs/prawne/polityka-projekt-v2.md` (napis „Projekt do weryfikacji…” zostaje do akceptacji prawnika); (2) panel Umami (tunel SSH) → strona „produkcja” → jej identyfikator; (3) `.env.prod`: `UMAMI_SCRIPT_URL=/_s/script.js`, `UMAMI_WEBSITE_ID=<id>`; (4) wdrożenie. Sprawdzenie: na głównej `<script src="/_s/script.js" data-website-id=…>`, w Umami widać wejście.

**Nigdy na serwerze:** `UMAMI_FAKE=1`, `PRICE_CHECK_FAKE=1` (aplikacja odmówi startu), `SEED_ADMIN_*`, `PORT`, `MEDIA_DIR` (ustawia compose).

## Nginx (w repo `prokom-web`)
Nginx i certyfikaty są we wspólnym stosie `prokom-proxy` z `prokom-web` (ADR-G001 §5). Gaming dokłada szablony `gaming-staging.conf.template` i `gaming-prod.conf.template` (PR w `prokom-web`, sesja G16). Co robią poza wspólnymi zasadami `prokom-web` (HTTPS, nagłówki, nadpisywanie `X-Real-IP` i `X-Request-Id`, obce hosty 444):
- jedna domena: strona i `/admin`; limit treści 1 MB (akcje serwera Next), `/admin` i `/api/` 20 MB (zdjęcia);
- `/admin/create-first-user` i `POST /api/users/first-register` → zawsze 404 (pierwszy admin tunelem SSH — runbook);
- `/_s/script.js` i `/_s/api/send` → kontener `umami` (reszta Umami niedostępna z internetu);
- limity: `/api/inquiry` i `/api/konto/` jak formularze `prokom-web`, `/api/health` jak w `prokom-web`;
- staging: hasło (basic auth) i `X-Robots-Tag: noindex, nofollow`; produkcja: `www` → 301 bez `www`;
- `/admin/sw.js` (service worker panelu) bez cache po stronie Nginx (Nginx nie cache'uje nic — tak zostaje).

## Kopie zapasowe
`scripts/backup.sh <prod|staging> [predeploy]` — baza aplikacji + baza `umami` + wolumen mediów, szyfrowane `age` (ten sam klucz publiczny co `prokom-web`), lokalnie `../backups/gaming/<stos>/<rodzaj>/`, poza serwerem `RCLONE_REMOTE/gaming-<stos>/<rodzaj>/` (ten sam kosz B2). Retencja jak `prokom-web`: `daily` 14 dni, `monthly` 93, `predeploy` 30. Co noc z crona; przed każdym wdrożeniem produkcji robi ją `deploy.sh`. Odtworzenie: `scripts/restore.sh` (runbook).

## Cofnięcie
Tylko obraz (gdy nowa wersja nie dodała migracji) albo obraz + baza z kopii `predeploy` — `docs/runbook.md` → „Cofnięcie”.

## Pierwsze wdrożenie — co trzeba rozstrzygnąć
- **Dane startowe** (decyzja Krystiana 02.11): oferta, ceny, treści i media ze zrzutu lokalnego seeda na SHA obrazu, bez admina seeda (runbook → „Dane startowe”). Seed na serwerze nie działa (`NODE_ENV=production`).
- **Pierwszy admin:** Nginx blokuje formularz pierwszego konta; admin zakładany tunelem SSH na port aplikacji (runbook).
- **Produkcja: dane** — `TODO(krystian)` przed produkcją: świeży zrzut seeda (jak staging) albo kopia stagingu po poprawkach treści w panelu (wtedy bez zapytań, zamówień i kont testowych).
