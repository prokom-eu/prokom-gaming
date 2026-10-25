# Jakość — Definition of Done

Zadanie jest skończone, gdy:

## Kod
- [ ] Lokalnie: `pnpm lint`, `typecheck`, `test` i e2e zmienionego obszaru (`pnpm test:e2e tests/e2e/<plik>`). W CI: pełne e2e, `build`, gitleaks — CI blokuje scalenie. `build` lokalnie tylko przy zmianie konfiguracji Next/Payload, zależności, `proxy.ts`, migracji albo Dockera.
- [ ] Brak `any`, brak `console.log`, brak martwego kodu.
- [ ] Każde zapytanie do Payload filtruje po tenancie; test izolacji tenantów zielony.
- [ ] Zmiana schematu bazy ma migrację w repo.
- [ ] Nowe zmienne środowiskowe dopisane do `.env.example`.

## Testy
- **Vitest** — logika: mapowanie domena → tenant, blokada seeda na produkcji, walidacja formularzy, helpery SEO.
- **Playwright (e2e, krytyczne ścieżki każdej strony):** strona główna się ładuje, telefon klikalny (`tel:`), formularz wysyła się i pokazuje potwierdzenie, przekierowania 301 działają.
- Testy e2e uruchamiane na stagingu przed każdym wdrożeniem produkcji.

## Wygląd i UX
- [ ] Telefon 360 px, tablet, komputer — bez poziomego przewijania.
- [ ] Kolory i fonty tylko z tokenów (`docs/marka.md`); tekst w kolorze linii używa `--accent-text`.
- [ ] Teksty zgodne ze specyfikacją strony; brak „lorem ipsum” na produkcji.

## SEO
- [ ] `title` i `description` unikalne dla każdej podstrony.
- [ ] Jeden `h1`, logiczne `h2/h3`.
- [ ] Dane strukturalne (LocalBusiness / Service / Organization) bez błędów w Rich Results Test.
- [ ] `sitemap.xml`, `robots.txt`; staging ma `noindex`.

## Wydajność i dostępność
- [ ] Lighthouse ≥ 90: Performance, SEO, Accessibility, Best Practices; LCP ≤ 2,5 s, CLS ≤ 0,1 (wersja mobilna). Na stagingu pilnuje tego Lighthouse CI (S10).
- [ ] Obrazy przez `next/image`, właściwe rozmiary, `alt`.
- [ ] Kontrast WCAG AA, widoczny focus, formularze z etykietami i komunikatami błędów.

## Bezpieczeństwo i RODO
- [ ] Walidacja po stronie serwera, honeypot + limit zgłoszeń.
- [ ] Zgoda RODO przy formularzu + link do polityki prywatności.
- [ ] Nagłówki bezpieczeństwa (CSP, HSTS, X-Content-Type-Options) w Nginx/Next.
- [ ] Uprawnienia kolekcji Payload: publiczny tylko odczyt opublikowanych treści.
- [ ] Dane osobowe (e-mail, telefon, treść zapytania) nie trafiają do logów, komunikatów błędów ani Sentry.

## Dokumentacja
- [ ] `docs/STAN.md` zaktualizowany; decyzja architektoniczna → ADR.
