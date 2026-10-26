# STAN — prokom-gaming

Ostatnia aktualizacja: 26.10.2026 (sesja G5, PR 1 — dane klatek).

## W toku
- **G5 = dwa PR-y** (jak G4): **PR 1 `feat/g5-dane-klatek`** (ten) — dane i logika; PR 2 `feat/g5-lista-klatek` — komponenty `FpsList`, `SourceLabel`, `HowWeMeasure` w `/podglad-ui`.
- Gałąź: `feat/g5-dane-klatek` (z `develop` po scaleniu #14), podpisane commity, **niewypchnięta**.
- Decyzje Krystiana (26.10): „Jak liczymy?” = przycisk → `BottomSheet` (teksty paneli „Skąd są liczby” i „Co znaczą kolory” z planszy Gra 1:1 + źródła pokazanych liczb z linkami); dopisek ustawień przy grze tylko dla 2 wyjątków z ADR (`games.settingNote`, wpisane do ADR-G004 §5); podgląd komponentów w `/podglad-ui` na danych z bazy (Wampir, 12 gier z planszy).
- Zrobione w PR 1:
  - Kolekcje `games` i `fps-results` w grupie panelu „Gry i klatki”; czytać może każdy, pisać panel. `cpu`/`gpu` tylko panel (nazwy części poziomu). Hak: jeden wynik `m`/`r`/`e` na zestaw × grę × rozdzielczość, `p` może się powtarzać; link wymagany przy `m`/`r`, data przy `p`. Gry i zestawu z wynikami nie da się usunąć (400 z liczbą wyników zamiast 500 z `NOT NULL`).
  - Migracja `games_fps` (up → down → up czyste; `down` ręcznie poprawiony jak w `offer`).
  - Seed: 33 gry (upsert po `slug`) + 1 584 wyniki w jednej transakcji, tylko nowe i zmienione (`planFpsResults`), `p` nietykane; pierwszy przebieg ok. 4 s, drugi „0 created, 0 updated, 1584 unchanged”.
  - `lib/fps.ts` (czyste, także przeglądarka): `pickResult` (p > m > r > e, najnowszy `p`), `buildFpsTable`, `fpsFor(table, …)`, `sourceOf` (etykieta + kolor `pk/ind/est`), `barPercent`/`fpsText` (reguła paska z planszy Zestaw, „60 FPS, limit gry”). `lib/fps.server.ts → loadFpsTable()` — jako gość, z jawnym `select`.
  - Testy: priorytet wszystkich par rodzajów + mutacje (zamiana kolejności, „najstarszy `p`”), seed = `fps.json`, idempotencja, haki kolekcji, `loadFpsTable` bez `cpu`/`gpu`; e2e: publiczne `/api/games`, `/api/fps-results` (także `depth=3`) bez kluczy `cpu`/`gpu`/kosztów i bez `internalModel`, filtr/sortowanie po `cpu`/`gpu` → 400; panel: blokada usuwania, drugi wynik testowy → 400, `p` bez daty → 400.
- `/przeglad` (recenzent): „gotowe do PR”, dwie drobne poprawki → za zgodą Krystiana: `sourceUrl` tylko `http(s)` (trafi do `<a href>` w „Jak liczymy?”), `loadFpsTable` bez zapytania z pustym `in` (nieznane slugi → pusta tabela), slug gry tylko `a-z0-9-`, komentarz o wyścigu w haku, `requireId` w seedzie. `sourceLabel` z nazwami kart partnerów z recenzji → PR 2 (dopisek „platforma testowa” w arkuszu źródeł).
- Sprawdzone lokalnie: `lint`, `typecheck`, `format:check`, `test` (234), pełne `test:e2e` na `pnpm dev` (60 zielonych, 32 pominięte — projekt 414 dla testów API).
- Niedokończone: push, CI (tam `next start` i `build`).
- Następny krok: push → `/pr` (tytuł `feat(g5): gry i wyniki FPS — dane, seed i lib/fps`) → CI → squash → PR 2 `feat/g5-lista-klatek` (plan: `FpsList` server + `FpsListClient` z `Segmented`, `SourceLabel`, `HowWeMeasure`, style `.ft/.fr/.fbr/.src` z planszy, sekcja w `/podglad-ui`, e2e w `shell`, zrzuty 1440/414 obok `stany/tel-06` i `screens/Zestaw-1440/02.jpg`).

## Uwagi na później (G5)
- **G14 — `fps-results.unit`:** relacja do egzemplarza dla rekordów `p` (ADR-G004 §5) dopiero razem z `units`; dziś `TODO(G14)` w `FpsResults.ts`.
- **G9 — plansza Zestaw-1440 pokazuje modele części** w „Co jest w środku” (RTX 5070 Ti, Ryzen 7 9800X3D) — wbrew zasadzie „tylko klasa (`publicLabel`)”. Budując kartę zestawu, brać `publicLabel`, nie tekst z planszy.
- **Seed:** dla 10 gier z samym szacunkiem `games.setting` = „szacunek”, a rekordy wyników mają „wysokie (szacunek)”. Gra zostaje 1:1 z `games.json`, wynik bierze ustawienia z rekordu — przy następnym eksporcie danych z czatu można ujednolicić.
- **Seed nie usuwa wyników, których nie ma już w `fps-sources.json`** (tworzy i aktualizuje, nie kasuje). Przy wymianie karty albo usunięciu gry stare wpisy zostaną — wtedy usunąć je w panelu albo dodać do seeda kasowanie wyników `m`/`r`/`e` spoza pliku (świadoma decyzja, bo `p` nigdy).
- **PR 2 — `sourceLabel` wymienia karty partnerów z recenzji** (np. „recenzja MSI RTX 5060 Gaming OC”, w adresie `pny-rtx-5080-slim-oc`): zgodne z ADR-G004 i to nie nasze `internalModel`, ale klient może uznać, że w zestawie jest karta MSI. W arkuszu „Jak liczymy?” dopisek, że to platforma testowa.
- **Hak „jeden wynik testowy na trójkę” sprawdza w aplikacji** (count → insert), bez ograniczenia w bazie — przy jednym użytkowniku panelu wystarcza; częściowy indeks unikalny wymagałby ręcznej migracji.
- **Liczby na planszach są przykładowe** (z JS planszy) — przy porównaniu zrzutów sprawdzamy układ, nie wartości.
- Indeks złożony `fps_results` nazywa się `build_game_resolution_idx` (Payload nie dodaje nazwy tabeli) — inna kolekcja z polami `build, game, resolution` dałaby konflikt nazw.

## Uwagi na później (G4)
- **Nowe zadanie w kolejce (np. retencja w G6)** = migracja: Payload trzyma `task_slug` jako enum Postgresa (`enum_payload_jobs_task_slug`) — `migrate:create` doda wartość.
- **Cron zadań startuje z pierwszym żądaniem panelu/API** (`initReq` z `cron: true`), nie przy starcie procesu — dla alarmu bez znaczenia (zmiana kosztu zawsze przychodzi z panelu); dla zadań okresowych (G6) sprawdzić po wdrożeniu albo dodać `jobs:run` w compose.
- **G16 — `ALERT_EMAIL` w compose produkcji i stagingu:** wymagany przy `NODE_ENV=production`, także przy starcie kontenera — bez niego aplikacja nie wystartuje. Dopisać do `docs/wdrozenia.md` i `compose.*.yml`.
- **Powtarzalne alarmy (przegląd PR 2b):** łączymy tylko alarmy czekające w kolejce; kilka edycji kosztu w odstępach > 1 min przy tym samym złamanym poziomie da kilka takich samych maili. Świadomie (alarm ma być głośny); jeśli przeszkadza — pamiętać zbiór poziomów z ostatniego alarmu i nie wysyłać tego samego.
- Zmiana `pricing-settings` (np. podniesienie `minMargin`) nie odpala alarmu — strażnik na ekranie i tak to pokazuje; ewentualnie hak na globalu.
- W lokalnym przebiegu wszystkich e2e czasem pojawia się w logu serwera „destination stream errored” (strona zamknięta w trakcie odświeżenia) — bez wpływu na wyniki.

## Na później (Omnibus, G9+)
- **Pozycja usunięta z oferty zostawia otwarty wpis `price-history`** (jest w partii N, nie ma jej w N+1, `writeBatch` jej nie zamyka). Dziś nieszkodliwe — części z zestawu nie da się usunąć — ale przed liczeniem „najniższej ceny z 30 dni” zamykać wpisy pozycji, których nie ma w nowej partii.

## Zrobione
- 26.10.2026 — **G4 PR 2b (import kosztów i alarm marży)** scalony do `develop` (#14) — G4 zamknięta: import CSV „kod lub EAN; koszt” z podglądem zmian, alarm marży jako zadanie Payload `margin-alarm` (po imporcie od razu, po ręcznej zmianie kosztu z crona), `autoPublish`, `ALERT_EMAIL` wymagany na produkcji.
- 26.10.2026 — **G4 PR 2a (ekran „Ceny”)** scalony do `develop` (#13): kolejka do zatwierdzenia, strażnik przed publikacją z naprawą (zatwierdź poziom / najmniejszy „Wyjątek narzutu” / popraw dane), publikacja partii + `price-history` w transakcji odpornej na wyścig, haki: część z zestawu nie znika i nie daje się wyłączyć, zestaw tylko z aktywnymi opcjami, granice `pricing-settings`. Błąd z CI: komunikat `APIError` znikał w buildzie produkcyjnym (pusty `data` + zminifikowana nazwa klasy) — komunikaty błędów Payload sprawdzać na `next start`.
- 26.10.2026 — **G4 PR 1 (cennik i zgodność)** scalony do `develop` (#12): `lib/pricing/snapshot.ts` (przeglądarka: `ceilTo`/`ceil10`, `priceFromSnapshot`, `surcharge`, `lookupPrice` po własnych kluczach, `snapshotFromRows`), `lib/compat.ts` (9 reguł + ostrzeżenie, komunikaty 1:1), `lib/pricing/catalog.ts` + `cost.ts` (`server-only`, `evaluate`, `reviewAll` ok. 55 ms na 236 544 kombinacji). Testy z fixtures: 90 cen partii 1 = kod, 16 zestawów, 11 scenariuszy, 85 134 zgodnych, min. 11,092%, `priceFrom`, addytywność, mutacje. `vitest.config.mts`: alias `server-only` (plik tylko do odczytu — zmieniony za zgodą Krystiana).
- 26.10.2026 — **G3** scalone do `develop` (PR #10, squash).
- 25.10.2026 — **G3 (model oferty + seed):** kolekcje `media` (dysk, `MEDIA_DIR`), `options`, `power-levels`, `builds` (treści istot 1:1 + `creature.key`; **kolor istoty tylko w `tokens.css`**, test spójności), `published-prices` (partia, indeks unikalny partia+rodzaj+kod), `price-history`; globale `pricing-settings` (tylko panel — narzuty to marże), `site-settings` (publiczny, seed `seed/prokomgaming/site-settings.json`: pola [SZEF] — telefon, e-mail, odpowiedź na zapytanie, test egzemplarza — z wartościami startowymi ze spec. §1, decyzja Krystiana; puste tylko BLIK, kurier, termin montażu, ocena Google, profile); grupy panelu Oferta / Treści / Administracja. Dostęp (`src/access/panel.ts`): `cost`, `internalModel`, `ean`, `components`, `markupClass`, `markupOverride`, `internalRef`, `costAtPublish`, `publishedBy` tylko dla konta z `users` (nie „zalogowany” — klienci z G14 też się logują); zapis oferty tylko panel; ceny i historia bez ręcznej edycji (`create/update/delete: false`, pisze seed i publikacja G4); publicznie tylko aktywne opcje. Payload 3.91 sam odrzuca `where`/`sort` po polu bez prawa odczytu (400). `pnpm seed`: admin → 46 zdjęć → 57 opcji → 16 poziomów → 16 zestawów → `leadBuild` → globale → partia 1 (90 cen z 25.10.2026 + 90 wpisów historii w jednej transakcji, tylko gdy nie ma żadnej partii); upsert po `code`/`slug`. Testy: Vitest (mapowanie bez `_check`/`_verify`/`aio360Raw`/`serviceCostBreakdown`, ceny 16 zestawów z partii = fixtures, `priceFrom`, relacje, zdjęcia), e2e `offer-api` (anonimowe REST bez pól ukrytych i bez żadnego `internalModel` z bazy, także `depth=3`; kontrola pozytywna kontem panelu).
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
- **G4 — ceny partii 1 są z arkusza** (`_check.sell`, fixtures `serviceSell` i `priceFrom`); od G4 PR 1 test `cost.test.ts` pokazuje, że kod daje te same 90 liczb. `level_from` ma w partii 1 pusty `costAtPublish` — publikacja w PR 2 zapisze koszt najtańszej konfiguracji (`review.priceFrom[poziom].cost`). Kod usługi w cenach: `SERVICE`. Klasy narzutu w bazie: `fullhd | qhd | uhd | flagship` (= klucze `levelMarkupByClass`; arkusz: FullHD/2K/4K/flagowiec). Publikacja: wzór transakcji w `src/seed/index.ts` (`initTransaction` / `commitTransaction` / `killTransaction`).
- **G4/G16 — oferta na stagingu i produkcji (przegląd G3):** seed jest zablokowany przy `NODE_ENV=production`, a `published-prices` ma `create: nobody`, więc nowa baza serwera nie ma ani oferty, ani cen, dopóki nie powstanie publikacja z G4. **Rozstrzygamy w G16** (decyzja Krystiana 26.10, `docs/wdrozenia.md`): osobny `seed:offer` bez konta admina, dopuszczony na serwerze za jawną flagą, albo migracja z danymi, albo publikacja z G4 + import CSV kosztów.
- **Usuwanie części użytej w zestawie (przegląd G3) — rozwiązane w G4 PR 2a:** klucze obce `builds.*_id` mają `ON DELETE set null` na kolumnach `NOT NULL`; haki `beforeDelete` w `options` i `power-levels` zwracają 400 z nazwą zestawu, zanim baza zgłosi błąd.
- **Panel (przegląd G3):** `media` i `pricing-settings` są w grupie „Oferta”, choć spec. §22 ich tam nie wymienia — świadomie, tam ich szukać.
- **G7+ — Local API ma domyślnie `overrideAccess: true`** i zwraca koszty: strony czytają ofertę z jawnym `select` (albo `overrideAccess: false`) i nigdy nie przekazują kosztów do komponentów klienckich. Test e2e strony zestawu i konfiguratora (ADR-G002 §8.7) w G9/G10.
- **G14 — `users` ma domyślny dostęp Payload** („zalogowany = może”): po dodaniu `customers` ustawić `access` kolekcji `users` na `panelOnly` (inaczej klient przeczyta listę kont panelu).
- **Migracje — `down` z `DROP TABLE … CASCADE`:** generator Drizzle usuwa klucze obce `payload_locked_documents_rels` po tabelach → „constraint does not exist”. W `offer` przeniesione ręcznie przed tabele (komentarz w pliku); przy każdej nowej kolekcji sprawdzać `migrate:down`. Nazwy indeksów złożonych (`indexes`) nie zawierają nazwy tabeli (`batch_itemType_itemCode_idx`) — taki sam indeks w innej kolekcji, np. `price-history`, da konflikt nazw w migracji.
- **Payload 3.91:** w populowanym poziomie mocy pole bez dostępu `components` wraca jako pusta `[]` (bez danych). Test e2e toleruje tylko tę pustą wartość.
- **Powłoka (decyzja Krystiana):** stopka i menu nadal z `lib/site.ts`; przepięcie na `site-settings`/`builds` w G7 razem z decyzją o renderowaniu (dziś `docker build` nie ma bazy).
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
