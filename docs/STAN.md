# STAN — prokom-gaming

Ostatnia aktualizacja: 25.10.2026 (sesja G2 — wygląd i powłoka).

## W toku
- Gałąź: `feat/g2-powloka` (z `develop` po scaleniu G1, PR #3), podpisane commity, **niewypchnięta**.
- Zrobione w G2: cały zakres (niżej w „Zrobione”); lokalnie zielone `lint`, `typecheck`, `format:check`, `test` (55), `test:e2e` (33: 1440 + 414, w tym tablet 820 i axe z otwartym menu), `build`.
- `/przeglad` (recenzent): „poprawki wymagane” → wszystkie poprawione za zgodą Krystiana: nagłówek na scenie wraca na telefonie (`fixed`, pełne tło po przewinięciu, test widoczności), pierwszy plan sceny na każdej szerokości (ADR-G003 §5), cele dotyku 44 px (ikony nagłówka, `Segmented`, linki stopki i 404), baner: oba przyciski ghost (spec. §3 „tej samej wagi” wygrywa z planszą) i zamyka się przy zablokowanym `localStorage`, link w menu do bieżącej strony zamyka arkusz.
- Niedokończone: CI nieuruchomione (gałąź niewypchnięta); test na prawdziwym Androidzie i iPhonie (DoD) — przed PR.
- Następny krok: Krystian ogląda powłokę na `localhost:3100/nie-ma-takiej-strony` (1440, 820, 414 + telefon) i rozstrzyga szerokość logo (uwaga niżej) → push → `/pr` (tytuł `feat(g2): wygląd i powłoka — tokeny, kroje, nawigacja, telefon jak aplikacja`) → CI → squash do `develop` → **G3** (`/zadanie G3 — model oferty + seed`).

## Zrobione
- 25.10.2026 — **G2 (wygląd i powłoka):** `src/styles/tokens.css` 1:1 ze wzorcem + blok uzupełnień (kolory wpisane wprost w planszach); 4 kroje przez `next/font` (pliki z naszej domeny, `latin-ext`), z góry ładowany tylko Manrope; grafiki 16 istot w `public/scenes`, `public/sigils`, AVIF/WebP w `next.config`; komponenty `Button`/`ButtonLink`, `Chip`, `Segmented` (radiogroup, strzałki), `Container`, `Sigil` (maska CSS, kolor `currentColor`), `Scene` (`hero` = cover, `wide` = panorama 300% jak nagłówki podstron), `HScroll`, `BottomSheet` (`<dialog>` + `showModal()`: fokus, Esc, tło, przeciąganie w dół, panel z prawej od 761 px), `SiteHeader` (przezroczysty na `[data-scene-top]`, chowany na telefonie), `MobileTabBar`, `MenuSheet`, `SiteFooter`, `CookieBanner` (za flagą, wyłączony); 404 przez catch-all `(site)/[...rest]` + `not-found.tsx` (status 404, w powłoce); `global-error` na tokenach; liczniki porównania i zapytania z `localStorage` (`lib/storage.ts`, odporne na błędy); dane powłoki tymczasowo w `lib/site.ts` (`TODO` G3 → `site-settings`, `builds`); `/podglad-ui` — podgląd komponentów tylko w dev (404 na produkcji).
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
- **G16 — pierwszy admin na produkcji (przegląd G1):** dopóki `users` jest pusta, Payload wpuszcza każdego na `/admin/create-first-user` (sprawdzone w `registerFirstUser.js`). Produkcja startuje z pustą bazą (migracje przy starcie, seed zablokowany), a staging chroni hasło w Nginx, produkcji nic. Przed otwarciem ruchu: admin zakładany jednorazowym skryptem w kontenerze albo blokada tej ścieżki w Nginx — rozstrzygnąć w `docs/wdrozenia.md`.
- **G16 — CI testuje `next start`, produkcja `node server.js` ze `standalone` (przegląd G1):** dodać do pipeline'u test dymny zbudowanego obrazu (`/api/health` = 200 z kontenera; lokalnie sprawdzone ręcznie w G1).
- **Dependabot (25.10.2026):** 2 alerty `vitest` 4.0.18 (GHSA-5xrq-8626-4rwp, GHSA-82fw-gwwq-j7x9) — dotyczą Vitest UI / trybu przeglądarkowego / `mockerPlugin`, których nie używamy. Podnieść do ≥ 4.1.11 razem z `prokom-web` (ten sam PR wersji w obu repo).
- **Wydajność (zmierzone w G2, `next start`):** przy preload 4 krojów (10 plików, ~410 KB) LCP 5,0 s i wydajność 82 → preload tylko Manrope: Lighthouse mobile `/` wydajność 94, dostępność 100, dobre praktyki 96, SEO 90; LCP symulowany 3,0 s (cel ADR 2,5 s), zmierzony z dławieniem (150 ms, 1,6 Mb/s, CPU ×4) 0,8 s na `/` i 1,8 s na 404 ze sceną. Lighthouse nie mierzy stron ze statusem 404. Do G7: hero ze sceną zmierzyć od razu; jeśli LCP > 2,5 s — rozważyć preload tylko `latin-ext` Manrope albo krój systemowy na pierwszy paint.
- **G2 — do decyzji Krystiana (na oko):** logo w kodzie ma Archivo szerokość 118 (ADR-G003 §2, CSS planszy), ale na zrzutach jest ok. 20% węższe (wygląda na szerokość 100). Zostawione wg ADR.
- **G2 — świadome odstępstwa od planszy:** pasek prawny stopki `--foot-text #8d8a7c` zamiast `#77746a` (kontrast 4,37 < AA); tekst `Segmented` `--kosc2` zamiast `#cfc6b1`; cele dotyku 44 px (stopka na telefonie wyższa niż na zrzucie, ADR-G003 §4 > plansza); pieczęcie w menu bez cen do G4 (`TODO`); linki Facebook/TikTok ukryte do czasu adresów (`lib/site.ts`).
- **G15:** brak favicony (404 w konsoli, dobre praktyki 96) i `meta description` (brak tekstu w planszy i spec.) — dopisać z SEO.
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
