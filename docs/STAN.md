# STAN — prokom-gaming

Ostatnia aktualizacja: 25.10.2026 (pakiet startowy z czatu „PRO-KOM Cyfryzacja”).

## W toku
- Gałąź: — (repo świeżo założone)
- Następny krok: **G0** — `/zadanie G0` (dokumenty, bez kodu; prompt w `docs/zadania/prokomgaming.md` §3.3).

## Zrobione
- 25.10.2026 — pakiet startowy: CLAUDE.md, specyfikacja `docs/strony/prokomgaming.md`, ADR-G001…G005, plan G0–G16, wzorzec wyglądu v36 (`docs/design/prokomgaming/`: plansze, zrzuty 1440 i 414 wszystkich stron, 13 stanów telefonu, sceny i pieczęcie 16 istot), seed (`seed/prokomgaming/`: cennik, 16 poziomów, 57 opcji ze zdjęciami, 16 zestawów, 33 gry, 1 584 wyniki FPS ze źródłami, FAQ, poradniki), oczekiwane wyniki testów cen (`tests/fixtures/pricing-expected.json`).

## Następne kroki
G0 → G1 → G2 → G3 → G4 → G5 → G6 → G7 → G8 → G9 → (kontrola 8.11) → G10 → G11 → G12 → (kontrola 13.11) → G13 → G14 → G15 → G16 (produkcja 20.11).

## Decyzje (skrót)
- Osobne repo, ten sam stos i wersje co `prokom-web` (ADR-G001), porty 3100 / 54321 / 1026 / 8026.
- Pełny zakres na 20.11 z ustaloną kolejnością cięcia (`docs/zadania/prokomgaming.md` §4).
- Domena `prokomgaming.pl`. Bez rat. Płatność przelew albo BLIK po pro formie.
- Ceny liczone jedną funkcją, gwarancja marży 11% (ADR-G002). Klatki z testów z etykietą źródła (ADR-G004).
- Telefon jak aplikacja (ADR-G003 §4).

## Otwarte pytania (do G0 / do szefa)
- [Krystian, G0] ADR-G005: konto, metryka, warsztat w Payload (rekomendacja) czy inaczej.
- [SZEF] kolejność: Gaming przed Software/Instalacjami do 20.11.
- [SZEF] e-mail i telefon Gaming, kto zastępuje Krystiana przy zapytaniach, BLIK, firma kurierska.
- [SZEF] bon (kwoty, ważność), egzemplarze „Gotowe od ręki”.
- [SZEF] zgody: imię i zdjęcie serwisanta, zdjęcia ludzi.
- [prawnik] regulamin, polityka prywatności, GPSR/CE; [księgowa] BDO.
- [serwis] długość testu obciążeniowego, lista „Co w pudełku”.

## Pomysły na później
- Pełna strona `/warsztat`, edycje limitowane, raty (po umowie z bankiem i ADR), import cen z API hurtowni, Strefa Klienta w Django (2027).
