# ADR-G001: Osobne repo `prokom-gaming`, ten sam stos co `prokom-web`, wspólny serwer

- **Status:** przyjęta (decyzja Krystiana 25.10.2026); domena — decyzja 25.10.2026
- **Data:** 2026-10-25
- **Decyduje:** Krystian (architektura), szef (domena, kolejność prac)

## Kontekst
PRO-KOM Gaming startuje 20.11.2026 (sezon grudniowy). W tym samym czasie `prokom-web` wchodzi na produkcję (prokombiznes.pl) i ma kolejne strony w budowie (Instalacje, Software). Kod powstaje wieczorami, na jednym komputerze, budowany przez jedną osobę z Claude Code. Gaming to w praktyce sklep: ceny liczone z kosztów, konfigurator, zapytania, egzemplarze i konta — inny cykl życia niż strony linii B2B.

## Opcje
| Opcja | Plusy | Minusy |
|---|---|---|
| A. Nowy tenant w `prokom-web` | wspólny fundament (formularze, SEO, panel) | wspólne migracje, `develop`, CI i wdrożenia w trakcie produkcji Biznesu; logika sklepowa, której linie B2B nie mają; awaria Gaming może zatrzymać wdrożenie Biznesu |
| **B. Osobne repo, ten sam stos** | zero kolizji (gałęzie, migracje, CI, wdrożenia osobno), te same komendy i nawyki, łatwy start i wyjście | dublujemy część fundamentu (szkielet, formularz, mail) — ok. 1–2 sesje; dwa repo do pilnowania |
| C. Osobne repo: Next.js + Django | Django to mocna strona Krystiana, zalążek Strefy Klienta | dwie aplikacje do zbudowania i utrzymania w 26 dni; panel produktów od zera |

## Decyzja
**Opcja B.**

1. **Repo** `github.com/prokom-eu/prokom-gaming` (prywatne), lokalnie `D:\PRO-KOM\repos\prokom-gaming`. Gałęzie jak w `prokom-web`: `main` (produkcja), `develop` (staging), PR + squash, Conventional Commits. Zadania z prefiksem **G** (G0–G16).
2. **Stos i wersje jak w `prokom-web` 25.10.2026:** Next.js 16.4.2, Payload 3.91.0 (`@payloadcms/db-postgres`, `@payloadcms/next`, `@payloadcms/richtext-lexical`, `@payloadcms/ui`, `@payloadcms/email-nodemailer`), React 19.2.6, Tailwind 4.3.3, Zod 4.6.7, TypeScript 5.7.3, pnpm 11.28.2, Node 24 (`.nvmrc`), PostgreSQL 17.11, Vitest, Playwright 1.58.2 + `@axe-core/playwright`, ESLint 9 + Prettier 3, husky + lint-staged, gitleaks. Przypięte dokładnie; aktualizacje razem z `prokom-web`.
3. **Bez multi-tenant.** Jedna domena, jeden zestaw treści. Panel Payload pod `/admin` tej samej domeny (Payload domyślnie) — bez osobnej domeny panelu i bez przepisywania hosta w `proxy.ts`. Ochrona panelu: silne hasła, krótka sesja, limit prób logowania (Payload `maxLoginAttempts`), na stagingu całość za hasłem w Nginx.
4. **Lokalnie bez kolizji z `prokom-web`:** strona na porcie **3100**; Compose `prokom-gaming-dev`: PostgreSQL **54321** (prokom-web 54320), Mailpit **1026/8026** (prokom-web 1025/8025). Osobny `.env`, `CLAUDE.md`, `docs/`. Jedna sesja Claude Code naraz.
5. **Serwer:** ten sam VPS (Seohost 4 vCPU / 8 GB, ADR-002 w `prokom-web`). Dwa nowe stosy Compose: `prokom-gaming-prod` i `prokom-gaming-staging`, każdy z własnym PostgreSQL i wolumenem mediów, limity pamięci (app 1 GB / staging 768 MB, Postgres 256 MB). **Nginx i certyfikaty zostają we wspólnym stosie `prokom-proxy` z repo `prokom-web`** (tylko on ma porty 80/443) — Gaming dokłada tam szablon serwera dla `prokomgaming.pl` i `staging.prokomgaming.pl` osobnym, małym PR w `prokom-web` (sesja G16). Aplikacje łączy sieć `prokom-proxy`.
6. **Domena: `prokomgaming.pl`** (decyzja 25.10.2026; zakup w Seohost razem z pozostałymi domenami, na firmę). Staging: `staging.prokomgaming.pl` (hasło, `noindex`).
7. **Wspólnego kodu z `prokom-web` nie wydzielamy** (paczka npm = źródło kolizji i pracy). Kopiujemy wzorce: `lib/env.ts`, logger, `submitInquiry()` (kontrakt ADR-003), CI, Dockerfile, skrypty `start.ps1`/`koniec.ps1`, komendy Claude Code. Znak PRO-KOM — pliki SVG do `public/brand/` (linia „Gaming”, akcent złoty „Grom” `#F2C230`, ADR-G003).
8. **Konto klienta, metryka, zgłoszenia** — na start w Payload (ADR-G005), z kontraktem danych pod przyszłą Strefę Klienta / PRO-KOM System (Django, 2027). Bez drugiej aplikacji w 2026.

## Konsekwencje
- Budowa Gaming nie blokuje wdrożeń `prokom-web` i odwrotnie. Jedyny punkt styku: szablon Nginx w `prokom-web` (G16) i wspólny VPS.
- Pamięć serwera: 4 aplikacje Node + 4 bazy na 8 GB — mieści się przy limitach i swapie; monitoring RAM (80% → powiadomienie). Jeśli zabraknie — staging Gaming włączamy tylko na czas akceptacji.
- `prokom-web/docs/architektura.md` mówi „nie robimy osobnych repozytoriów na każdą stronę” — Gaming to świadomy wyjątek (sklep, inny cykl życia); dopisać jedno zdanie przy G16.
- Dwa repo do aktualizacji zależności — robimy to razem, tym samym PR-em wersji w obu.
