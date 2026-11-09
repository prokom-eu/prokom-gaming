# ADR-G015: Bez paska „Teraz w warsztacie” — nigdy na stronie

- **Status:** przyjęta (Krystian, 08.11.2026)
- **Data:** 2026-11-08
- **Zastępuje:** część ADR-G005 o taśmie warsztatu (`GET /api/warsztat`, „tablica” na głównej) i spec. §4 pkt 2, §143

## Kontekst
Pod hero strony głównej był pasek „Teraz w warsztacie w Rabce”: etapy bieżących zamówień (nazwa zestawu, kolor, etap), a bez zamówień — stałe kroki procesu (Części, Montaż, Test obciążeniowy, Pomiar klatek, Metryka i wysyłka). Dane szły też publicznie przez `GET /api/warsztat`, a w panelu był przełącznik „Pokazuj zamówienia na tablicy warsztatu” i podgląd „Na tablicy na stronie” przy zamówieniu.

## Decyzja
**Pasek usuwamy z całej strony i ma go nigdy nie być** (decyzja Krystiana 08.11.2026):
1. Bez komponentu paska, bez publicznego `GET /api/warsztat` (404), bez żadnej publicznej listy zamówień w innej formie.
2. W panelu bez przełącznika „Pokazuj zamówienia na tablicy warsztatu” (kolumna `mail_settings.workshop_strip` usunięta migracją) i bez podglądu „Na tablicy na stronie” w karcie zamówienia.
3. Zostaje bez zmian: zamówienia, etapy i tablica warsztatu **w panelu** (praca serwisu), oś statusu w koncie klienta i metryka, maile przy zmianie etapu, linijka „W warsztacie teraz: N komputerów” w sekcji „Zanim wyjedzie” (sama liczba, bez listy).
4. Strażnik: test jednostkowy `src/components/home/noWorkshopStrip.test.ts` (żaden plik strony nie zawiera „Teraz w warsztacie”, nie ma komponentu ani endpointu) i e2e (`home`, `workshop-access`).

## Konsekwencje
- Strona główna ma o jedno zapytanie do bazy mniej (tylko licznik zamówień w warsztacie).
- Powrót paska wymagałby nowego ADR — testy celowo go blokują.
