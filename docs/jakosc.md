# Jakość — Definition of Done (prokom-gaming)

## Kod
- [ ] Lokalnie: `pnpm lint`, `typecheck`, `test` i e2e zmienionego obszaru. W CI: pełne e2e, `build`, gitleaks.
- [ ] Brak `any`, `console.log`, martwego kodu.
- [ ] Zmiana schematu bazy ma migrację w repo (`push: false`).
- [ ] Nowe zmienne środowiskowe w `.env.example`.

## Pieniądze i dane
- [ ] Ceny tylko z `lib/pricing/` i `published-prices`; testy z `tests/fixtures/pricing-expected.json` zielone.
- [ ] Żaden `internalModel`, koszt, `components` ani marża nie trafiają do HTML ani API publicznego (test porównuje z listą `internalModel` z bazy: części poziomu, RAM i dyski — obudowy i chłodzenia wyłączone, ADR-G002 §8.7).
- [ ] Klatki tylko z `fps-results`, każda z etykietą źródła.
- [ ] Brak oferty rat i słowa „Santander”; „raty” jako całe słowo tylko w pytaniu FAQ „Czy mogę kupić na raty?” (test na całe słowa).

## Testy
- **Vitest:** cena, zgodność, priorytet FPS, walidacja zapytań (Zod, NIP), numeracja, dostęp do kolekcji.
- **Playwright + axe (1440 i 414):** strona główna, filtr zestawów → karta → „Zapytaj”, konfigurator (zmiana opcji = cena z `lib/pricing`), porównywarka z linku, zapytanie (3 ścieżki) → numer i maile, dolny pasek i menu na telefonie.

## Wygląd i UX
- [ ] Zgodność ze zrzutami `docs/design/prokomgaming/screens/<Plansza>-1440` i `-414` oraz `stany/`.
- [ ] Telefon jak aplikacja: dolny pasek, arkusze (fokus, Esc, tło), paski przyklejone nad dolnym paskiem, cele dotyku ≥ 44 px, bez poziomego przewijania strony (360–414 px).
- [ ] Sprawdzone na prawdziwym Androidzie i iPhonie.
- [ ] Kolory i kroje tylko z tokenów; teksty z planszy; zero nawiasów kwadratowych na produkcji.

## SEO
- [ ] `title` i `description` unikalne; jeden `h1`; JSON-LD bez błędów; `sitemap.xml`, `robots.txt`; staging i strony prywatne `noindex`.

## Wydajność i dostępność
- [ ] Lighthouse mobile ≥ 90 (Performance, Accessibility, Best Practices, SEO); LCP ≤ 2,5 s, CLS ≤ 0,1.
- [ ] Obrazy przez `next/image` (AVIF/WebP), sceny leniwie; `prefers-reduced-motion`.
- [ ] Kontrast WCAG AA, widoczny focus, etykiety i komunikaty błędów w formularzach.

## Bezpieczeństwo i RODO
- [ ] Walidacja na serwerze, honeypot, minimalny czas, limit zgłoszeń.
- [ ] Zgoda RODO z wersją klauzuli; zgoda marketingowa osobno, domyślnie odznaczona.
- [ ] Klient widzi tylko swoje dane (testy dostępu).
- [ ] Dane osobowe nie trafiają do logów ani komunikatów błędów.
- [ ] Nagłówki bezpieczeństwa (CSP, HSTS, X-Content-Type-Options).

## Dokumentacja
- [ ] `docs/STAN.md` zaktualizowany; decyzja architektoniczna → ADR-G.
