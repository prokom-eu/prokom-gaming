# STAN — prokom-gaming

Ostatnia aktualizacja: 25.10.2026 (sesja G1 — szkielet).

## W toku
- Gałąź: `feat/g1-szkielet` (z `develop`), 7 podpisanych commitów, **niewypchnięta**.
- Zrobione w G1: wszystko z zakresu (niżej w „Zrobione”); lokalnie zielone `lint`, `typecheck`, `format:check`, `test` (37), `test:e2e` (12: 1440 + 414), `build`, `docker build` + `/api/health` = 200 z kontenera.
- Niedokończone: **`.env` lokalny** — Krystian tworzy go z `.env.example` (`PAYLOAD_SECRET`, `SEED_ADMIN_*`); e2e i seed w tej sesji szły na zmiennych podanych w poleceniu, z tymczasowym adminem (usuniętym z bazy). CI jeszcze nie uruchomione (gałąź niewypchnięta).
- Następny krok: `.env` → `pnpm seed` → `/przeglad` → push gałęzi → `/pr` (tytuł `feat(g1): szkielet aplikacji Next.js + Payload, CI i Docker`) → CI zielone → squash do `develop` → **G2** (`/zadanie G2 — wygląd i powłoka`).

## Zrobione
- 25.10.2026 — **G1 (szkielet):** Next 16.4.2 + Payload 3.91.0 (szablon `blank`, Postgres), wersje 1:1 z ADR-G001, pnpm 11.28.2, Node 24.22.0 (`.nvmrc`); `lib/env.ts` (Zod, tylko zmienne czytane dziś), `lib/logger.ts`, `lib/requestId.ts`, polityka haseł (12 znaków); `users` (5 prób, blokada 15 min, sesja 2 h, bez ról); `push: false` + migracja `initial` (up → down → up czyste); `pnpm seed` (admin, idempotentny); `/api/health`; Tailwind 4 (bez kolorów do G2); tymczasowa strona główna (`TODO` G7); `docker/compose.dev.yml` (`prokom-gaming-dev`: 54321, Mailpit 1026/8026 — działa obok `prokom-web-dev`); Vitest; Playwright `desktop-1440` + `mobile-414` z axe; husky + lint-staged + gitleaks; CI (`ci.yml`, `pr-title.yml`), Dependabot; `Dockerfile` (standalone); `scripts/start.ps1`, `koniec.ps1`, `dev.mjs` (domyślnie 3100). `.claude/settings.json` wyłączony z Prettiera (Claude Code sam go przepisuje).
- 25.10.2026 — **G0** scalone do `develop` (PR #1).
- 25.10.2026 — **G0:** przegląd pakietu, decyzje Krystiana wpisane do dokumentów:
  - ADR-G005 **przyjęta** (opcja A: zapytania, egzemplarze, zamówienia i konto w Payload za stałym kontraktem); dwie osobne kolekcje z logowaniem: `users` (panel) i `customers` (klienci).
  - ADR-G002 §8.7 + spec. §27.2 + `jakosc.md` + CLAUDE.md + recenzent: test „żaden `internalModel` w HTML/API” obejmuje części poziomu mocy, RAM i dyski; **obudowy i chłodzenia wyłączone** (pokazujemy je z pełną nazwą; w 39 z 46 `internalModel` = `publicLabel`). `cost`/`costAtPublish` sprawdzane dla wszystkich typów.
  - ADR-G004 §5 + ADR-G005: rekord `p` (zmierzone w PRO-KOM) trafia do `fps-results` tylko z egzemplarza złożonego dokładnie wg przepisu zestawu; pomiar egzemplarza ze zmianami zostaje na jego metryce.
  - Drobne: spec. `onHome` → `onHomeOnly` (jak w seedzie), PRZEKAZANIE „v37” → „v36”, `.claude/settings.local.json` w `.gitignore`, prompty G1 (wersja pnpm) i G3 (seed `site-settings`).
  - Kontrola seeda: ceny 16/16 zestawów i 57/57 opcji przeliczone wzorami ADR-G002 = fixtures i `_check` co do złotówki; 1 584 klatki kompletne, `fps.json` = `fps-sources.json`, każda liczba `m`/`r` z linkiem; relacje i 46 zdjęć na miejscu.
- 25.10.2026 — pakiet startowy (pierwszy commit, podpisany): CLAUDE.md, specyfikacja `docs/strony/prokomgaming.md`, ADR-G001…G005, plan G0–G16, wzorzec wyglądu v36 (`docs/design/prokomgaming/`), seed (`seed/prokomgaming/`), oczekiwane wyniki testów cen (`tests/fixtures/pricing-expected.json`).

## Następne kroki
G1 → G2 → G3 → G4 → G5 → G6 → G7 → G8 → G9 → (kontrola 8.11) → G10 → G11 → G12 → (kontrola 13.11) → G13 → G14 → G15 → G16 (produkcja 20.11).

## Decyzje (skrót)
- Osobne repo, ten sam stos i wersje co `prokom-web` (ADR-G001), porty 3100 / 54321 / 1026 / 8026.
- Pełny zakres na 20.11 z ustaloną kolejnością cięcia (`docs/zadania/prokomgaming.md` §4).
- Domena `prokomgaming.pl`. Bez rat. Płatność przelew albo BLIK po pro formie.
- Ceny liczone jedną funkcją, gwarancja marży 11% (ADR-G002). Klatki z testów z etykietą źródła (ADR-G004).
- Telefon jak aplikacja (ADR-G003 §4).
- Zapytania, metryka, warsztat, konto w Payload za stałym kontraktem; `users` i `customers` osobno (ADR-G005).

## Uwagi do kolejnych sesji (ryzyka z G0)
- **Kalendarz:** ok. 25,5 wieczoru na ok. 25 dostępnych, bez bufora, równolegle produkcja Biznesu w `prokom-web` — kontrole 8.11 i 13.11 traktować serio.
- **pnpm/Node:** globalnie pnpm 12.14 — w repo sam przełącza się na 11.28.2 z `packageManager` (sprawdzone w G1). Node 24.22.0 przez `fnm` (`start.ps1` robi `fnm use`).
- **Payload:** 3.91.0 nie ma jeszcze skilla w paczce (`node_modules/payload/skills/`) — dokumentacja: `llms-full.txt` + typy `.d.ts`. `create-payload-app` generuje szablon z najnowszego Payload (3.92) — wersje zawsze przypinamy ręcznie wg ADR-G001.
- **Wydajność:** sceny 2880 px i 4 kroje przy Lighthouse mobile ≥ 90 — zmierzyć LCP już w G2 (powłoka + jedna scena), nie dopiero w G15.
- **Blokery spoza kodu** (blokują produkcję, nie budowę): pytania [SZEF] niżej, prawnik, zdjęcia egzemplarzy, zakup domeny i DNS przed G16.

## Otwarte pytania (do szefa i innych)
- [SZEF, do 8.11] kolejność: Gaming przed Software/Instalacjami do 20.11.
- [SZEF, do 8.11] e-mail (`gaming@pro-kom.eu`?) i telefon Gaming, kto zastępuje Krystiana przy zapytaniach, sposób BLIK, firma kurierska.
- [SZEF] bon (kwoty, ważność), egzemplarze „Gotowe od ręki” — do tego czasu strony ukryte flagą.
- [SZEF] zgody: imię i zdjęcie serwisanta, zdjęcia ludzi.
- [SZEF] domena `prokomgaming.pl` kupiona? (potrzebna do DNS i certyfikatu w G16).
- [prawnik] regulamin, polityka prywatności, GPSR/CE; [księgowa] BDO, okres przechowywania danych klientów.
- [serwis] długość testu obciążeniowego, lista „Co w pudełku”.
- [serwis, przed publikacją kart] „Miejsce na rozbudowę” (`power-levels.upgrade`, `_verify` we wszystkich 16 poziomach) — potwierdzić z modelem płyty.
- [Krystian, przed publikacją stron gier] wymagania producenta 33 gier (`games.requirements` puste — blok ukryty do uzupełnienia).
- [czat] 6 poradników w szkicu (na start wystarczy 1 gotowy — plan cięcia §4).

## Pomysły na później
- Pełna strona `/warsztat`, edycje limitowane, raty (po umowie z bankiem i ADR), import cen z API hurtowni, Strefa Klienta w Django (2027).
