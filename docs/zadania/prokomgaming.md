# prokomgaming.pl — plan budowy (sesje G0–G16)

- **Stan na:** 25.10.2026. Pakiet startowy w repo (pierwszy commit). Decyzje: osobne repo (ADR-G001), pełny zakres na 20.11 (Krystian 25.10), domena `prokomgaming.pl`, bez rat.
- **Termin:** produkcja 20.11.2026, staging do akceptacji szefa najpóźniej 18.11.
- **Źródła prawdy (w tej kolejności):** `docs/strony/prokomgaming.md` → `docs/design/prokomgaming/` (zrzuty, stany, plansze) → ADR-G001…G005 → reszta.

Zasady:
- jedna sesja = jedna gałąź = jeden PR (squash do `develop`); gałąź `feat/g<n>-<opis>`;
- `/zadanie G<n>` w nowej sesji, w trybie planowania; plan akceptuje Krystian;
- na koniec: `/przeglad` (recenzent) → porównanie ze zrzutami 1440 i 414 (sesje z UI) → `/koniec-sesji` → `/pr`;
- **telefon w tej samej sesji co desktop** (ADR-G003 §4) — sesja z UI nie jest skończona bez zrzutów 414;
- produkcja tylko po akceptacji szefa w Asanie, przez `/wdrozenie`.

---

## 1. Kalendarz (wieczory 26.10–19.11 = ok. 25)

| Sesja | Zakres | Wieczory | Kiedy (plan) |
|---|---|---|---|
| G0 | dokumenty i decyzje | 0,5 | 26.10 |
| G1 | szkielet | 1,5 | 26–27.10 |
| G2 | wygląd i powłoka (telefon jak aplikacja) | 2 | 28–29.10 |
| G3 | model oferty + seed | 1 | 30.10 |
| G4 | cennik, zgodność, publikacja cen | 1,5 | 31.10–1.11 |
| G5 | gry i klatki | 1 | 1.11 |
| G6 | zapytania: backend i maile | 1 | 2.11 |
| G7 | strona główna: hero i taśma | 2 | 3–4.11 |
| G8 | strona główna: sekcje | 1,5 | 5.11 |
| G9 | zestawy i karta zestawu | 2 | 6–7.11 |
| **kontrola 1** | **8.11: czy G0–G9 są w `develop`? Jeśli nie — tniemy wg §4** | — | 8.11 |
| G10 | konfigurator | 2 | 8–9.11 |
| G11 | dobór pod grę, strony gier, porównywarka | 2 | 10–11.11 |
| G12 | formularz zapytania i „wysłane” | 1 | 12.11 |
| **kontrola 2** | **13.11: decyzja o cięciu G13–G14 (kolejność §4)** | — | 13.11 |
| G13 | strony treści, gotowe od ręki, bon | 2 | 13–14.11 |
| G14 | metryka, warsztat, konto, zgłoszenia | 2 | 15–16.11 |
| G15 | SEO, wydajność, dostępność, e2e | 1,5 | 16–17.11 |
| G16 | wdrożenie: staging → szef → produkcja | 1 | 18–19.11 |
| | **Razem** | **ok. 25,5** | |

**Panel** (sesje P0–P8) — osobny plan: `docs/zadania/prokomgaming-panel.md` §1. **Decyzja Krystiana 01.11.2026: panel w całości idzie na produkcję razem ze stroną, jednym wdrożeniem (G16)** — kolejność do 19.11: P6 → P7 → P5 → G15 (+ Umami) → P8 → G16. Przy poślizgu przesuwamy produkcję całości (nowa data z szefem), panelu nie tniemy.

**Uczciwie:** pełny zakres to ok. 25,5 wieczoru bez żadnego bufora na poprawki, a w tym oknie jest ok. 25 — i równolegle produkcja prokombiznes.pl w `prokom-web` (kilka wieczorów). Daty w tabeli to plan ciągły bez przerw na Biznes. Bez cięcia zmieści się tylko przy dodatkowych sesjach w weekendy albo gdy Software i Instalacje stoją do 20.11 (decyzja szefa). Kolejność cięcia jest ustalona z góry (§4), żeby decyzja 8.11 i 13.11 zajęła minutę.

---

## 2. Sesje

| # | Zadanie | Gotowe, gdy | Spec. / wzór |
|---|---|---|---|
| **G0** | **Dokumenty, bez kodu:** przegląd pakietu, pytania i sprzeczności, przyjęcie ADR-G005 (albo zmiana), `docs/STAN.md` „Następne”. Krystian zakłada repo i gałąź `develop` (PRZEKAZANIE.md). | ADR-G001…G005 „przyjęta”; lista pytań zamknięta albo w STAN „Otwarte pytania”. | całość |
| **G1** | **Szkielet:** Next 16.4.2 + Payload 3.91.0 z oficjalnego szablonu (Postgres), wersje 1:1 z ADR-G001, `PORT=3100`, `docker/compose.dev.yml` (`prokom-gaming-dev`, 54321, Mailpit 1026/8026), `lib/env.ts` (Zod), logger, `push: false` + pierwsza migracja, `/api/health`, Tailwind 4, ESLint/Prettier, Vitest, Playwright + axe, husky + lint-staged + gitleaks, CI (`ci.yml`, `pr-title.yml`, Dependabot) wzorowane na `prokom-web`, `Dockerfile` (standalone), `scripts/start.ps1` i `koniec.ps1`, `.claude/launch.json` (port 3100). | `pnpm dev` na 3100 równolegle z `prokom-web`; panel `/admin` z adminem z seeda; CI zielone; `docker build` działa. | ADR-G001 |
| **G2** | **Wygląd i powłoka:** `tokens.css` z `docs/design/prokomgaming/tokens.css`, fonty `next/font` (Cinzel, Cormorant Garamond, Manrope, Archivo), komponenty `Sigil`, `Scene` (warstwy WebP z `assets/`), `Button`, `Chip`, `Segmented`, `HScroll`, `BottomSheet` (`<dialog>`), `SiteHeader` (desktop + chowanie na telefonie), `MobileTabBar`, `MenuSheet`, `SiteFooter`, baner cookies (za flagą), strona 404. | zgodne ze `stany/tel-01-start.jpg`, `tel-02-menu.jpg`, `tablet-menu.jpg`, planszą `boards/Telefon-nawigacja.dc.html`, zrzutami nagłówka i stopki 1440/414 i 404; klawiatura (pułapka fokusu w arkuszu, Esc), `prefers-reduced-motion`; axe bez błędów. | ADR-G003; spec. §3 |
| **G3** | **Model oferty + seed:** `pricing-settings` (global), `power-levels`, `options` (+ media 46 zdjęć), `builds` (z treściami istoty z `creatures.json`), `published-prices`, `price-history`; grupy panelu; dostęp: publicznie tylko odczyt opublikowanego, **koszty i `internalModel` tylko dla zalogowanych w panelu**; `pnpm seed` idempotentny (po `code`/`slug`), pierwsza publikacja cen w seedzie. | migracje `up → down → up` czyste; w panelu 16 poziomów, 57 opcji, 16 zestawów; test: API publiczne nie zwraca `cost`, `internalModel`, `components`. | ADR-G002 §2; seed `_info` |
| **G4** | **Cennik i zgodność:** `lib/pricing/` (`ceil10`, `eff`, `sell*`, `price`, `cost`, `margin`, `priceFrom`), `lib/compat.ts` (kody błędów i ostrzeżenie), testy z `tests/fixtures/pricing-expected.json` (zestawy, 11 scenariuszy, pełny przegląd 85 134, `priceFrom`, addytywność); ekran „Ceny” w panelu: kolejka do zatwierdzenia, strażnik marży (pełny przegląd przed publikacją), import CSV kosztów, widok zestawów (cena, koszt, marża, zmiana), zapis `price-history`. | wszystkie testy zielone; publikacja z marżą < 11% zablokowana z komunikatem; ceny 16 zestawów = fixtures. | ADR-G002 §3–§5, §8 |
| **G5** | **Gry i klatki:** `games`, `fps-results` (+ seed z `fps.json`/`fps-sources.json`), `lib/fps.ts` (`fpsFor`, priorytet p > m > r > e), komponenty `FpsList` (pasek + liczba + `SourceLabel`), `HowWeMeasure` („Jak liczymy?” ze źródłami i linkami). | 1 584 rekordy; test priorytetu; komponenty zgodne ze `stany/tel-06-zestaw-klatki.jpg` (etykieta pod paskiem) i sekcją „Ile klatek” na planszy Zestaw. | ADR-G004 |
| **G6** | **Zapytania — backend:** `inquiries` (pola ADR-G005), `POST /api/inquiry` + `submitInquiry()` (Zod, honeypot, minimalny czas, limit, ponowne liczenie ceny i zgodności na serwerze, numer `PKG-RRRR-NNNN`), maile (powiadomienie z `Reply-To`, potwierdzenie dla klienta), retencja (zadanie dzienne), panel: odczyt + status. | testy: walidacja, NIP, konfiguracja niezgodna → 400, cena z serwera, numeracja, brak danych osobowych w logach; maile w Mailpit. | ADR-G005; ADR-003 w `prokom-web` jako wzór |
| **G7** | **Strona główna — hero i taśma:** hero (scena + imię Cinzel z materiałem + zdjęcie na podstawie + karta istoty + przełącznik istot z poziomu + 9 medalionów), autoprzełączanie 7 s tylko desktop, paralaksa kursorem, układ pionowy na telefonie, skala w `cqw/cqh` (1440 → 3440), taśma „Teraz w warsztacie” (fallback statyczny). | zgodne z `screens/Main-1440/01–02`, `Main-414/01–02`, plansze Laptop/Monitor27/Ultrawide34/Tablet; LCP ≤ 2,5 s na telefonie; reduced motion. | spec. §4 pkt 1–2; ADR-G003 §5 |
| **G8** | **Strona główna — sekcje 3–13** (Od czego zaczynasz, 16 istot, Jak kupić, W co grasz, Zanim wyjedzie, opinie [ukryte], Dla rodziców, Baba Jaga czy Wampir, W cenie, Zanim zapytasz, Napisz). | cała główna = `Main-1440` i `Main-414`; karuzele na telefonie; Lighthouse mobile ≥ 90. | spec. §4 |
| **G9** | **Zestawy i karta zestawu:** `/zestawy` (filtry w URL, licznik, pusty wynik, arkusz filtrów na telefonie), `/zestawy/[slug]` (sekcje 1–14 spec. §6, plan wnętrza, „Dopasuj” z ceną na żywo, pasek przyklejony, JSON-LD). | zgodne z `Zestawy-*`, `Zestaw-*`, `stany/tel-03–06`; cena = fixtures; e2e: filtr → karta → „Zapytaj” przekazuje zestaw. | spec. §5–§6 |
| **G10** | **Konfigurator:** 6 kroków, wyszarzenia z powodem, zmiana poziomu z zachowaniem wyboru i komunikatem, rozpoznanie gotowca i najbliższy gotowiec, ostrzeżenia, podgląd z kolorem światła, klatki na żywo, stan w URL, „Zapytaj o tę konfigurację”; telefon: kroki-pasek, przyklejona cena. | e2e: Wampir z karty → zmiana RAM → cena = `lib/pricing`; scenariusze z fixtures w UI (komunikaty); zgodne z planszą, `stany/tel-07-konf-moc.jpg`, `tel-08-konf-obudowa.jpg`, `stany/konf-1…6.jpg`. | ADR-G002 §5–§6; spec. §7 |
| **G11** | **Dobór pod grę, strony gier, porównywarka:** `/dobor-pod-gre`, `/komputer-do/[gra]` (33, generowane z danych, blok wymagań ukryty bez danych), `/porownaj` (werdykt, wykres, „+X% za Y zł”, macierz, tylko różnice, link ze stanem). | zgodne z `Gra-*`, `KomputerDo-*`, `Porownywarka-*`, `stany/tel-09…10`, `tel-13-porownywarka.jpg`; 33 strony w buildzie; e2e porównania z linku. | spec. §8–§9 |
| **G12** | **Formularz zapytania i „wysłane”:** 4 kroki, wejścia z zestawu/konfiguracji/porównania, walidacja z komunikatami, podsumowanie na żywo, wysyłka do `/api/inquiry`, `/zapytanie/wyslane` z animacją pieczęci (reduced motion), zerowanie licznika. | e2e: 3 ścieżki (zestaw, konfiguracja, „pomóżcie mi dobrać”) przy 1440 i 414 → rekord + 2 maile + numer; zgodne z `Formularz-*`, `Zapytanie-*`, `stany/tel-11-zapytanie.jpg`, `tel-12-wyslane.jpg`. | spec. §10 |
| **G13** | **Strony treści + gotowe + bon:** `/dla-rodzicow`, `/o-nas`, `/kontakt` (formularz `contact`), `/pytania` (`faq` z seeda), `/poradniki` + wpis (`guides`), `/regulamin`, `/polityka-prywatnosci` (globale rich text, wersja, data), `/gotowe` (`stock`, rezerwacja), `/bon` (podgląd na żywo, zapytanie `voucher`). | zgodne z planszami 1440/414; bon i gotowe ukryte flagą do decyzji szefa; FAQPage bez błędów. | spec. §11–§12, §16–§21 |
| **G14** | **Metryka, warsztat, konto:** `units` (+ PDF metryki, kod losowy), `orders` (etapy, historia) + `GET /api/warsztat` do taśmy, `customers` (Payload auth, weryfikacja, reset), `tickets`, zapisane konfiguracje; `/metryka/[kod]`, `/konto/*`. **Dopisek panelu (P0, 30.10):** role w `users`: `admin`, `serwis` (spec. panelu §15; `serwis` bez zapytań, kosztów i marż), migracja nadaje istniejącym użytkownikom `admin`, nowi domyślnie `serwis`; w `orders` od razu `dueDate`, `checklist[] { key, done, doneAt, doneBy }`, `workshopNote` (spec. panelu §7, §17), etapy `orders.stage` (7 etykiet ze spec. panelu §7), `stageHistory`, numer `Z-RRRR-NNNN`; znormalizowany e-mail (lowercase, trim) z indeksem w `orders`, `units`, `tickets`, `customers` (spec. panelu §6); `inquiries.email` też zapisywany małymi literami (dziś tylko `trim`) + migracja danych `lower()`. | testy dostępu (klient A ≠ klient B, publiczne API bez danych osobowych); zgodne z `Metryka-*`, `Konto-*`. | ADR-G005; spec. §13–§15 |
| **G15** | **SEO i jakość:** meta, JSON-LD (Organization, LocalBusiness — jeden sklep, Rabka, 01.11, Product/Offer, FAQPage, BreadcrumbList, Article), sitemap, robots, `noindex` stron prywatnych, skan placeholderów i słów „rata/raty/Santander”, Lighthouse ≥ 90 (5 stron), axe całej strony, e2e ścieżek krytycznych, budżet JS. **Dopisek panelu (ADR-G009 pkt 1–3):** Umami — kontener w `compose.dev.yml`, skrypt w layoucie `(site)` tylko na produkcji/stagingu, `lib/analytics.ts` z `track()` i zdarzeniami z ADR-G009 pkt 3 (konfigurator, dobór, porównywarka, karta zestawu, formularz zapytania); test, że brak skryptu nie psuje strony. **Od 01.11 G15 idzie po P6, P7 i P5** — Lighthouse, axe i e2e obejmują też ekrany panelu (spec. panelu §18). | kryteria spec. §27. | spec. §23–§27 |
| **G16** | **Wdrożenie:** `image.yml` (GHCR z `develop`), `docker/compose.prod.yml` + `compose.staging.yml` (`prokom-gaming-*`, limity pamięci, sieć `prokom-proxy`), `scripts/backup.sh`, `smoke.sh`; **osobny PR w `prokom-web`**: szablon Nginx dla `prokomgaming.pl` i `staging.prokomgaming.pl`; DNS (`docs/dns.md` najpierw), certyfikaty, staging z hasłem → demo dla szefa → akceptacja w Asanie → produkcja (`/wdrozenie`). **Dopisek panelu:** Umami w `compose.prod.yml`/`compose.staging.yml` (baza `umami`, limit pamięci, ścieżka w Nginx), `backup.sh` obejmuje bazę `umami`; SPF/DKIM/DMARC skrzynki Gaming przed włączeniem odpowiedzi z panelu (ADR-G008); zmienne całego panelu (IMAP, VAPID, `ANTHROPIC_API_KEY`, Umami) i ręczne próby na stagingu — `docs/zadania/prokomgaming-panel.md` §1 „Dopisek do G16”. | staging i produkcja działają, smoke zielony, kopia bazy przed produkcją, plan cofnięcia; szef odhaczył akceptację. | ADR-G001 §5; `docs/wdrozenia.md` w `prokom-web` jako wzór |

---

## 3. Prompty do Claude Code

### 3.1 Każda sesja (podmień numer i nazwę)
```
/zadanie G<n> — <nazwa z tabeli>
Źródła: docs/strony/prokomgaming.md (§<sekcja>), docs/design/prokomgaming/README.md, ADR-G00<x>. Wzorzec: docs/design/prokomgaming/screens/<Plansza>-1440 i <Plansza>-414 (i stany/<plik>), treści i zachowanie: docs/design/prokomgaming/boards/<Plansza>.dc.html, dane: seed/prokomgaming/.
Zasady: teksty z planszy bez zmian; kolory tylko z tokenów; ceny wyłącznie z lib/pricing/ i published-prices; klatki wyłącznie z fps-results z etykietą źródła; żadnych kosztów, modeli wewnętrznych ani producentów części poziomu w HTML; bez rat; telefon w tej samej sesji (dolny pasek, arkusze, paski przyklejone); nie przenoś architektury .dc.html.
Przed PR: zrzuty Playwright 1440 i 414 porównane z screens/ i stany/ — wypisz różnice i popraw. Lighthouse mobile dla zmienionych stron.
```

### 3.2 Porównanie z wzorcem (na koniec sesji z UI)
```
Zrób zrzuty Playwright pełnej strony <adres> przy 1440 i 414 px i porównaj je z docs/design/prokomgaming/screens/<Plansza>-1440 i -414. Dla telefonu porównaj stany ze stany/tel-*.jpg (dolny pasek, menu, arkusze, paski). Wypisz różnice w kolejności sekcji, tekstach, kolorach, odstępach, wysokościach i brakujących elementach. Popraw to, co odbiega, zanim otworzysz PR.
```

### 3.3 Szczegóły do sesji (dopisz do 3.1)
- **G0:** „Nie pisz kodu. Przeczytaj CLAUDE.md, docs/README.md, docs/strony/prokomgaming.md, wszystkie ADR-G, docs/zadania/prokomgaming.md, docs/design/prokomgaming/README.md i _info w seed/prokomgaming/*.json. Obejrzyj screens/Main-1440/01.jpg, Main-414/01.jpg, stany/tel-01…13. Napisz: (1) co jest niejasne albo sprzeczne; (2) ryzyka planu G1–G16; (3) czego brakuje w seedzie. Potem wpisz moje rozstrzygnięcia do ADR-G005 (status) i docs/STAN.md. Gałąź docs/g0-decyzje, PR do develop.”
- **G1:** „Zacznij od oficjalnego szablonu Payload z Postgres (sprawdź w dokumentacji zainstalowanej wersji, jak go utworzyć), potem przypnij wersje dokładnie jak w ADR-G001 §2. Konfigurację CI, Dependabot (docs/wzorce-prokom-web/.github/dependabot.yml), husky, gitleaks, Dockerfile, scripts/dev.mjs (PORT z .env), start.ps1 i koniec.ps1 wzoruj na prokom-web; Playwright bierze port z PORT (3100) (opis w docs/README.md tego repo → „Wzorce z prokom-web”), z portami z ADR-G001 §4. Bez multi-tenant i bez proxy.ts. push: false i pierwsza migracja w repo. Globalnie jest pnpm 12 — sprawdź, że w repo `pnpm -v` daje wersję z `packageManager` (11.28.2), zanim powstanie `pnpm-lock.yaml`.”
- **G2:** „Tokeny 1:1 z docs/design/prokomgaming/tokens.css. Arkusze jako <dialog> z własnym komponentem BottomSheet (fokus, Esc, przesunięcie w dół, tło). Dolny pasek tylko ≤ 760 px, tablet z hamburgerem i panelem z prawej. Sceny jako warstwy obrazów z docs/design/prokomgaming/assets (skopiuj do public/scenes i public/sigils), nie SVG z filtrami.”
- **G3:** „Kolekcje i pola wg ADR-G002 §2 (nazwy po angielsku, etykiety po polsku). Pola _check i _verify z seeda NIE są polami kolekcji (_check — do testu seeda; _verify — notatka w panelu). Tylko w panelu: internalModel, cost, internalRef. Nie importujesz: aio360Raw, serviceCostBreakdown (informacyjne). builds.creature = slug istoty — pola istoty z creatures.json kopiujesz do zestawu. Seed tworzy pierwszą partię published-prices (25.10.2026, z level_from). Dostęp: cost, internalModel i components widoczne tylko w panelu; test na API publicznym. Seed idempotentny po code/slug; zdjęcia z seed/prokomgaming/media/options. Global site-settings: utwórz seed/prokomgaming/site-settings.json z tabeli spec. §1 (pola oznaczone [SZEF] puste — na stronie się nie renderują).”
- **G4:** „Najpierw testy z tests/fixtures/pricing-expected.json (czerwone; zasady liczenia w jego _info), potem lib/pricing/snapshot.ts, lib/pricing/cost.ts (server-only) i lib/compat.ts. Alarm marży i retencja jako zadania w kolejce zadań Payload; adres alarmu ALERT_EMAIL. Jedna implementacja ceil10. Pełny przegląd 85 134 konfiguracji ma działać w panelu przed każdą publikacją (zmierz czas). Ekran Ceny jako widok panelu Payload (custom view) — sprawdź w dokumentacji zainstalowanej wersji, jak go dodać.”
- **G5:** „fps-results z fps-sources.json (1 rekord na zestaw × gra × rozdzielczość). fpsFor z priorytetem p > m > r > e i testem. Etykiety i kolory z ADR-G004 §2 i ADR-G003 §2.”
- **G6:** „Kontrakt jak ADR-003 w prokom-web (Zod 1:1 z przyszłym modelem Django), pola z ADR-G005. Serwer zawsze przelicza cenę i zgodność z kodów konfiguracji — nie ufa cenie z przeglądarki. Numer PKG-RRRR-NNNN bez luk w obrębie roku (sekwencja w bazie).”
- **G7:** „Hero wg ADR-G003 §5 i zrzutów screens/Main-1440, Main-414 oraz Main-hero-1536, -1920, -2560, -3440 i -820 (plansze: Laptop, Main, Monitor27, Ultrawide34, Tablet). Imię istoty: Cinzel z materiałem (lód, ogień, krew, złoto, kość — wartości z planszy Main). Sceny innych istot ładowane dopiero po wyborze. Na telefonie bez autoprzełączania.”
- **G9:** „Plan wnętrza: 8 części jako przyciski z aria-pressed, podświetlenie na rysunku. ‚Dopasuj’: RAM, dysk, światło — cena z lib/pricing/, ‚Zapytaj o tę wersję’ przekazuje kody. Pasek przyklejony nad dolnym paskiem na telefonie.”
- **G10:** „Logika wyłącznie z lib/pricing/ i lib/compat.ts (bez if-ów na kody w komponentach). Odtwórz scenariusze z fixtures jako testy e2e UI (komunikaty przy wyszarzonych opcjach). Stan w URL.”
- **G11:** „33 strony /komputer-do/[gra] generowane statycznie z danych; blok wymagań producenta renderuj tylko, gdy games.requirements jest uzupełnione. Porównywarka: stan w URL, link do wysłania.”
- **G14:** „Payload auth dla customers (sprawdź w dokumentacji: verify, forgotPassword, maxLoginAttempts). Reguły dostępu: klient czyta tylko swoje orders/units/tickets — testy. Kod metryki losowy (crypto), ≥ 12 znaków.”
- **G16:** „Najpierw docs/dns.md i compose. Szablon Nginx dla prokomgaming.pl to osobny PR w repo prokom-web (sieć prokom-proxy, kontener prokom-gaming-prod-app-1). Produkcja dopiero po odhaczonym zadaniu SZEF w Asanie.”

---

## 4. Plan cięcia (ustalony z góry)
Jeśli kontrola 8.11 albo 13.11 pokaże poślizg — tniemy w tej kolejności, jakości nie tniemy:
1. **Konto klienta** (G14 część) → po starcie; zapis konfiguracji linkiem.
2. **Tablica warsztatu** → taśma ze stałym tekstem procesu.
3. **Bon i „Gotowe od ręki”** → po starcie (strony ukryte).
4. **Poradniki** → 1 wpis na start.
5. **Metryka online** → PDF do pudełka, strona po starcie.

**Bez cięć:** strona główna, 16 zestawów, karta zestawu, konfigurator, cennik ze strażnikiem marży, klatki z etykietami, dobór pod grę i strony gier, porównywarka, zapytanie z mailami, strony prawne i stałe, telefon jak aplikacja.

---

## 5. Podział pracy: czat ↔ Claude Code
| W czacie (projekt „PRO-KOM Cyfryzacja”) | W Claude Code (repo `prokom-gaming`) |
|---|---|
| decyzje, ceny, skład zestawów, arkusze | wpisanie decyzji do ADR i STAN |
| nowe dane (koszty, FPS, nowe gry) → nowy seed i fixtures | import seeda, testy |
| treści: poradniki, wymagania gier, opisy, regulamin z prawnikiem | wpisanie w panelu albo seed |
| zmiany wyglądu: najpierw plansza, potem nowe zrzuty do `docs/design/` | budowa według zrzutów |
| przegląd zrzutów z PR | poprawki |
| raport dla szefa, zadania „SZEF ·” | staging, `/wdrozenie` po akceptacji |

Nowy pomysł w trakcie sesji = osobne zadanie, nie „przy okazji”.
