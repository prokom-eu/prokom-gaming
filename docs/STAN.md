# STAN — prokom-gaming

Ostatnia aktualizacja: 25.10.2026 (sesja G0 — dokumenty i decyzje).

## W toku
- Gałąź: `docs/g0-decyzje` (z `develop`), commit lokalny, **niewypchnięta**.
- Repo na GitHubie **jeszcze nie istnieje** — Krystian zakłada je i wypycha `main` i `develop` ręcznie (PRZEKAZANIE §1; `.claude/settings.json` celowo blokuje Claude'owi push tych gałęzi). Potem: ochrona `main`/`develop`, tylko Squash merging, domyślna gałąź `develop`, znaczek „Verified” na pierwszym commicie.
- Następny krok: wypchnąć `docs/g0-decyzje` i otworzyć PR do `develop` (`/pr`), scalić, potem **G1** — `/zadanie G1 — szkielet` (prompt: `docs/zadania/prokomgaming.md` §3.3 G1).

## Zrobione
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
- **G1:** dużo części naraz (CI, Docker, husky, gitleaks, Playwright) — kopiować 1:1 z `docs/wzorce-prokom-web/`. Globalnie pnpm 12.14, repo wymaga 11.28.2 (`packageManager`) — sprawdzić przed pierwszym `pnpm install`.
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
