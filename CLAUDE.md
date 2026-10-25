# prokom-gaming — CLAUDE.md

Repozytorium strony **PRO-KOM Gaming** (`prokomgaming.pl`): komputery do gier składane w Rabce-Zdroju — 16 gotowych zestawów („istoty” ze słowiańskich podań), konfigurator z cenami liczonymi z kosztów, klatki w 33 grach z niezależnych testów, zapytanie zamiast koszyka, metryka egzemplarza, konto klienta. Start sprzedaży: **20.11.2026**.

Właściciel kodu: firma PRO-KOM Tadeusz Wójciak — organizacja GitHub `prokom-eu` (repo: `github.com/prokom-eu/prokom-gaming`). Developer: Krystian — **jedna osoba**, równolegle buduje `prokom-web` (strony Biznes, Instalacje, Software). Dlatego prostota, przewidywalność i łatwe utrzymanie są ważniejsze niż „sprytne” rozwiązania. Każda nowa ruchoma część musi mieć uzasadnienie.

## Zanim zaczniesz zadanie
1. Przeczytaj `docs/STAN.md` — co zrobione, co w toku, następny krok.
2. Sesja → jej opis w `docs/zadania/prokomgaming.md` (zakres, „gotowe, gdy”, plansze). **Nie wykraczaj poza zakres sesji.**
3. **Specyfikacja `docs/strony/prokomgaming.md` jest źródłem prawdy dla treści i zakresu.** Wygląd: `docs/design/prokomgaming/` (zrzuty 1440 i 414, stany telefonu, plansze `.dc.html`, tokeny, grafiki). Teksty przenosisz z planszy bez zmian. Braki oznacz `TODO(krystian):`, nie zgaduj.
4. Decyzje: `docs/decyzje/ADR-G*.md`. Nie zmieniaj ich po cichu — jeśli trzeba, zaproponuj nowy ADR.
5. Ceny: **tylko** `lib/pricing/` (ADR-G002). Klatki: **tylko** dane z `fps-results` (ADR-G004) — strona nie liczy klatek.
6. Wersje bibliotek: zanim użyjesz API Payload / Next.js, sprawdź **dokumentację zainstalowanej wersji** — nie pisz z pamięci. Next.js → `node_modules/next/dist/docs/`; Payload → `node_modules/payload/skills/payload/SKILL.md`, a dopóki go nie ma — `https://payloadcms.com/llms-full.txt` + typy `node_modules/payload/dist/**/*.d.ts`. Źródło milczy → „nie wiem”.

## Stos (ADR-G001) — te same wersje co `prokom-web`
- Next.js **16.4.2** (App Router, TypeScript `strict`) + **Payload CMS 3.91.0** w jednej aplikacji, React 19.2.6, wersje **przypięte dokładnie**. Aktualizujemy razem z `prokom-web`, świadomie.
- **Jedna strona, bez multi-tenant** (inaczej niż `prokom-web`). Panel Payload pod `/admin` tej samej domeny.
- PostgreSQL 17 (`@payloadcms/db-postgres`), **migracje wersjonowane w repo**, `push: false` wszędzie. Media na dysku (wolumen Dockera).
- Tailwind CSS 4, komponenty własne w `src/components`, bez ciężkich bibliotek UI. Zod do walidacji.
- pnpm 11 (wersja z `packageManager`), Node z `.nvmrc` (24.x). Wywołuj `pnpm` bezpośrednio, nie `corepack pnpm`.
- Testy: Vitest (logika: ceny, zgodność, FPS, formularze), Playwright + axe (ścieżki krytyczne, 1440 i 414). ESLint + Prettier, gitleaks w CI i w haku przed commitem.
- Docker Compose, obrazy w GHCR (`ghcr.io/prokom-eu/prokom-gaming`), Nginx wspólny z `prokom-web` na VPS (ADR-G001 §5).

## Struktura (docelowa)
```
src/
  app/
    (site)/...               # publiczne strony (mapa: spec. §2)
    (payload)/admin/...      # panel
    api/inquiry/             # przyjmowanie zapytań (kontrakt jak ADR-003 w prokom-web, ADR-G005)
    api/warsztat/            # publiczna taśma warsztatu: nazwa zestawu, kolor, etap (ADR-G005)
    api/health/              # zdrowie aplikacji (wdrożenie czeka na 200)
  collections/  globals/
  components/                # wspólne: SiteHeader, SiteFooter, MobileTabBar, MenuSheet, BottomSheet, Sigil, Scene, FpsList, SourceLabel, PriceTag…
  components/ui/             # bazowe: Container, Section, Heading, Button, Chip, Segmented
  styles/tokens.css          # JEDYNE miejsce z wartościami kolorów (ADR-G003)
  lib/
    pricing/snapshot.ts      # cena z opublikowanego snapshotu — strona, konfigurator, zapytanie (ADR-G002 §3)
    pricing/cost.ts          # TYLKO serwer (server-only): ceny z kosztów, marże, strażnik — panel
    compat.ts                # reguły zgodności i sensu (ADR-G002 §5)
    fps.ts                   # odczyt klatek z priorytetem p > m > r > e (ADR-G004)
    inquiry/                 # schema (Zod), submitInquiry(), numer PKG-RRRR-NNNN, maile
    env.ts  seo.ts  logger.ts
docs/  docker/  .github/workflows/
docs/design/prokomgaming/    # wzorzec wyglądu (cel wizualny), NIE architektura do kopiowania
seed/prokomgaming/           # dane startowe (JSON 1:1, poza Prettierem) + media
tests/fixtures/              # oczekiwane ceny i wyniki zgodności (testy G4)
```

## Lokalnie (bez kolizji z `prokom-web`)
- Strona: **`http://localhost:3100`**, panel: `http://localhost:3100/admin`. `PORT=3100` w `.env` (`pnpm dev` i Playwright biorą go stamtąd).
- `docker compose -f docker/compose.dev.yml up -d` — projekt Compose **`prokom-gaming-dev`**: PostgreSQL na hoście **54321** (prokom-web ma 54320), Mailpit SMTP **1026**, podgląd maili **http://localhost:8026** (prokom-web: 1025/8025). Oba projekty mogą działać naraz.
- Komendy: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm typecheck`, `pnpm format` / `pnpm format:check`, `pnpm test`, `pnpm test:e2e`, `pnpm generate:types`, `pnpm generate:importmap`, `pnpm payload migrate:create <nazwa>`, `pnpm payload migrate`, `pnpm seed` (tylko lokalnie; admin z `SEED_ADMIN_*`; idempotentny), `docker build -t prokom-gaming:local .`.
- System Krystiana: Windows, repo w `D:\PRO-KOM\repos\prokom-gaming` (obok `prokom-web`). Końce linii: LF.

## Sposób pracy — `docs/sposob-pracy.md`
- **Jedna sesja Claude Code naraz** (wieczór = jedno repo). Kolejna sesja nie zna historii poprzedniej — ciągłość niesie `docs/STAN.md`.
- **Na początku sesji:** `git status` i `git fetch`; jeśli gałąź jest za `origin` albo są niezacommitowane zmiany — powiedz, zanim zaczniesz (rozwiązanie: `scripts\start.ps1`). Przeczytaj w `docs/STAN.md` „W toku” → „Następny krok”.
- **Na końcu sesji** (`/koniec-sesji`): `docs/STAN.md` → „W toku”: gałąź, co zrobione, **dokładny następny krok**, niedokończone. Przypomnij o `scripts\koniec.ps1`.
- Dane testowe tylko z `pnpm seed`. Każda migracja w repo. Żadnych ścieżek bezwzględnych w kodzie i dokumentacji.
- Nowa zmienna środowiskowa → `.env.example` z opisem.
- Pomysł spoza zakresu → `docs/STAN.md` → „Pomysły na później”.

## Zasady kodu
- TypeScript strict, bez `any` (wyjątek z komentarzem dla typów z zewnętrznych bibliotek). Server Components domyślnie; `"use client"` tylko przy interakcji (konfigurator, filtry, arkusze, porównywarka, formularze).
- **Ceny:** strona liczy wyłącznie z `published-prices` (`lib/pricing/snapshot.ts`), nigdy z kosztów. `lib/pricing/cost.ts` tylko na serwerze (panel). Koszty, modele wewnętrzne (`internalModel`) i marże **nigdy** nie trafiają do HTML, JSON-a strony ani do API publicznego (test porównuje z listą `internalModel` z bazy).
- **Producentów części poziomu mocy (procesor, karta, płyta, zasilacz) ani RAM i dysku nie pokazujemy** — tylko klasa (`publicLabel`). Wyjątek: obudowy i chłodzenia (pełna nazwa, zdjęcie, cena).
- **Klatki:** każda liczba z etykietą źródła (test niezależny / przeliczone z testów / szacunek / zmierzone w PRO-KOM). Nigdy „gwarantujemy X FPS”.
- **Bez rat** (decyzja 25.10.2026): żadnej oferty rat, kalkulatora ani wzmianki o banku. Wyjątek: pytanie w FAQ „Czy mogę kupić na raty?” z odpowiedzią „Na razie nie…”. Płatność: przelew albo BLIK po fakturze pro forma. Brak płatności na stronie.
- Formularze: walidacja Zod na serwerze, honeypot + minimalny czas + limit zgłoszeń, zgoda RODO z wersją klauzuli, zapis przez `submitInquiry()` (ADR-G005). Żadnych zewnętrznych usług (CAPTCHA, analityka, fonty z CDN) bez ADR.
- Każda strona: metadane, `sitemap.xml`, `robots.txt`, dane strukturalne, obrazy przez `next/image` z `alt`.
- Dostępność: kontrast WCAG AA, semantyczny HTML, widoczny focus, etykiety formularzy, `prefers-reduced-motion` wyłącza animacje scen.
- **Telefon jak aplikacja** (ADR-G003 §4): dolny pasek kart, menu i filtry jako arkusze od dołu, przyklejone paski ceny. Telefon budujesz w tej samej sesji co desktop, nie „później”.
- Teksty po polsku, z planszy 1:1. Dane osobowe nigdy w logach ani komunikatach błędów. Logi: logger z `lib/`, nie `console.log`.
- Nowa zależność = uzasadnienie w opisie PR.

## Definition of Done (`docs/jakosc.md`)
- `lint`, `typecheck`, `test` i e2e zmienionego obszaru zielone lokalnie; pełne e2e i `build` w CI.
- **Zgodność ze zrzutami 1440 i 414** (`docs/design/prokomgaming/screens/`, stany: `stany/`), Lighthouse mobile ≥ 90 (wydajność, dostępność, SEO, dobre praktyki), axe bez błędów, sprawdzone na prawdziwym telefonie (Android + iPhone) przed PR.
- Zgodne ze specyfikacją i zakresem sesji; `docs/STAN.md` zaktualizowany.

## Bezpieczeństwo i produkcja
- Sekrety tylko w `.env*` (nie commitujemy). Wzór: `.env.example`. Aplikacja nie startuje bez wymaganych zmiennych (`lib/env.ts`). Nie czytaj i nie edytuj `.env*` poza `.env.example`.
- **Produkcja tylko po akceptacji szefa w Asanie** i tylko przez pipeline (`docs/wdrozenia.md` — powstaje w G16; wzór: `docs/wzorce-prokom-web/docs/wdrozenia.md`). Nie wdrażaj ręcznie, nie uruchamiaj migracji na serwerze bez zgody Krystiana.
- Przed wdrożeniem produkcji: kopia bazy. Każde wdrożenie da się cofnąć do poprzedniego obrazu.

## Git
- `main` = produkcja, `develop` = staging. Gałęzie: `feat/<opis>`, `fix/<opis>`, `chore/<opis>`, `docs/<opis>`; w nazwie numer sesji, np. `feat/g4-cennik`.
- **Nigdy nie pushuj bezpośrednio na `main` ani `develop`** — tylko PR z zielonym CI, squash.
- Conventional Commits po polsku. Jedno zadanie = jedna gałąź = jeden PR. Tytuł PR: `feat(g4): …`.
- Po każdej akcji na GitHubie zweryfikuj ją (`gh pr view`) i podaj link.
- Testy najpierw dla logiki, gdzie błąd kosztuje pieniądze: cena, marża, zgodność, formularz, ukrywanie kosztów.
- Commity podpisywane kluczem SSH — jeśli podpis się nie uda, **nie wyłączaj go**, powiedz.
- Przed każdym commitem pokaż `git diff --staged --stat` i 1–3 zdania: co i dlaczego.

## Jak ze mną pracujesz (rzemiosło)
- **Krystian ma rozumieć każdą linię, którą commituje.** Przy nieoczywistej decyzji dodaj 1–2 zdania „dlaczego tak” w odpowiedzi.
- **Jedna rzecz naraz. Małe kroki:** plan → test → kod → `lint/typecheck/test` → diff. Zmiana > ~400 linii diffu → zaproponuj podział.
- `/przeglad` (subagent `recenzent`) przed PR z kodem: zawsze przy cenach, zgodności, formularzach, koncie, migracjach albo diffie > ~100 linii.
- Plansze `.dc.html` to **wzorzec wyglądu i zachowania**, nie kod do przeniesienia (inna architektura). Odtwarzasz efekt w Next.js/React.

## Komendy projektu
- `/zadanie <G-numer lub opis>` — kontekst, plan, czekasz na „ok”, potem kod.
- `/przeglad` — niezależny przegląd zmian przed PR.
- `/pr` — tytuł i opis, po akceptacji `gh pr create --base develop`.
- `/wdrozenie staging|produkcja` — checklista przed wdrożeniem.
- `/koniec-sesji` — aktualizacja `docs/STAN.md` i podsumowanie.
- Skrypty Krystiana (nie uruchamiaj ich sam): `scripts\start.ps1`, `scripts\koniec.ps1`.

## Wtyczki Claude Code
- frontend-design: przy każdym UI, ALE wygląd jest zamknięty: kolory, kroje, sceny i ruch wyłącznie wg ADR-G003 i `docs/design/prokomgaming/`. Przy sprzeczności wygrywa wzorzec.
- Superpowers: brainstorming, writing-plans, systematic-debugging, verification-before-completion. NIE: worktree, subagent-driven-development, finishing-a-development-branch — obowiązuje nasz flow (`/zadanie` → plan → PR, `/przeglad`).
- Przy sprzeczności skilla z tym plikiem albo ze specyfikacją wygrywa ten plik i specyfikacja.
