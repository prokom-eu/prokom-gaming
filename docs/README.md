# Dokumentacja prokom-gaming

| Plik | Co zawiera |
|---|---|
| `STAN.md` | co zrobione, co w toku, następny krok — czytany na początku każdej sesji |
| `strony/prokomgaming.md` | **specyfikacja strony** (źródło prawdy treści i zakresu) |
| `zadania/prokomgaming.md` | plan sesji G0–G16, kalendarz, prompty, plan cięcia |
| `strony/prokomgaming-panel.md` | **specyfikacja panelu `/admin`** (źródło prawdy dla panelu; §2a — panel na telefonie jak aplikacja) |
| `zadania/prokomgaming-panel.md` | plan sesji panelu P0–P8, kolejność względem G13–G16, prompty, dopiski do G14–G16 |
| `decyzje/ADR-G001…G010` | repo i stos · cennik i konfigurator · wygląd i telefon · dane FPS · zapytania, egzemplarze, konto · panel jako własne widoki · sprawdzanie cen (Claude) · poczta zapytań · statystyki (Umami) · panel na telefonie (PWA, push) |
| `design/prokomgaming/` | wzorzec wyglądu v36: README, tokeny, zrzuty 1440/414, stany telefonu, plansze, grafiki |
| `design/prokomgaming/panel/` | wzorzec wyglądu panelu (v8, 30.10.2026): README, zrzuty 1440/414, stany telefonu `stany/tel-*`, plansze |
| `jakosc.md` | Definition of Done |
| `sposob-pracy.md` | jak pracujemy obok `prokom-web` na jednym komputerze |
| `wzorce-prokom-web/` | kopie plików z `prokom-web` (25.10.2026) do wzorowania w G1 i G16 — **nie są konfiguracją tego repo** |

## Wzorce z prokom-web (`wzorce-prokom-web/`)
- CI: `.github/workflows/ci.yml` (lint → format:check → typecheck → test → build → e2e + gitleaks, sprawdzanie „tylko dokumentacja”), `pr-title.yml`, `image.yml` (obraz GHCR z `develop`), `dependabot.yml`.
- `Dockerfile` (Next standalone), `docker/compose.dev.yml`, `compose.prod.yml`, `compose.staging.yml`, `compose.proxy.yml` (wspólny Nginx — zostaje w `prokom-web`).
- `scripts/start.ps1`, `koniec.ps1`, `smoke.sh`, `dev.mjs`; `.env.example`; konfiguracje Next, Playwright, Vitest, TypeScript, ESLint; `package.json` (wersje do przypięcia).
- `docs/`: `wdrozenia.md`, `jakosc.md`, `sposob-pracy.md`, ADR-003 (kontrakt zapytań), ADR-008 (dokumentacja bibliotek dla Claude), ADR-009 (migracje bez `push`).

Przy kopiowaniu zmieniasz: nazwy (`prokom-web` → `prokom-gaming`), porty (ADR-G001 §4), brak multi-tenant i `proxy.ts`, nazwy stosów Compose (`prokom-gaming-prod`, `prokom-gaming-staging`), obraz `ghcr.io/prokom-eu/prokom-gaming`. Folder `wzorce-prokom-web/` można usunąć po G16.
