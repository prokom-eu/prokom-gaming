# Znaleziska audytu bezpieczeństwa — listopad 2026 (prokom-gaming)

Plan, zasady i skala: [AUDYT-PLAN.md](AUDYT-PLAN.md) (§2 zasady twarde, §3 format). Sesje AB1–AB3 tylko do odczytu; naprawy w AB4 osobnymi PR-ami.

**Sekrety nigdy w tym pliku** — tylko nazwy kluczy albo wartości zamaskowane (`sk-…abcd`). Dane osobowe: liczby i nazwy pól, nigdy rekordy.

Skala ryzyka: **Krytyczne** (dziś, ktoś z zewnątrz) — tego samego dnia · **Wysokie** (jeden dodatkowy warunek) — do 7 dni · **Średnie** (osłabia ochronę) — do 30 dni · **Niskie** (porządek) — przy okazji / świadomie odpuszczone. Koszt: S / M / L.

## Gaming

Sesja AB3, 18.11.2026. Kod `develop` (c0e0f3c): Next.js 16.4.2, Payload 3.91.0. Przegląd kodu (subagent + własna weryfikacja), `pnpm audit --prod`, `gitleaks` na całej historii (420 commitów), zapytania z zewnątrz do produkcji (tylko GET). Konfiguracja Nginx Gaming jest w repo prokom-web (`docker/nginx/snippets/gaming.conf`). **Krytycznych brak.**

| ID | System | Obszar | Opis | Dowód (komenda / plik:linia / wynik) | Ryzyko | Naprawa | Koszt | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G-01 | Gaming | konto klienta | Ponowna rejestracja na niezweryfikowany adres nadpisuje hasło, imię i token — hasło ustawia rejestrujący, nie właściciel skrzynki. Napastnik zakłada konto na e-mail klienta, który ma zamówienia, a nie ma konta (dostęp do zamówień jest po e-mailu); klient klika „Potwierdź konto” w prawdziwym mailu PRO-KOM → konto zweryfikowane z hasłem napastnika, który widzi zamówienia, numery seryjne egzemplarzy i zgłoszenia. Imię napastnika trafia do maila do ofiary (phishing treścią). | `src/app/api/konto/rejestracja/route.ts:74-98` (`payload.update … password: input.password`), `src/access/customer.ts:25-29`, `lib/account/emails.ts:44-45` | Wysokie | hasło ustawiane dopiero na stronie linku (weryfikacja + hasło w jednym kroku); rejestracja nie przyjmuje hasła albo je unieważnia | M | naprawione w PR #119 (18.11), do wdrożenia |
| G-02 | Gaming | panel | Kolekcja Payload `payload-locked-documents` z domyślnym dostępem „każdy zalogowany” — także klient: widzi przez REST, które dokumenty edytuje który pracownik, i może tworzyć/usuwać blokady. | `payload/dist/locked-documents/config.js:43-48` (brak nadpisania w repo); anonim → 403 (`curl …/api/payload-locked-documents`) | Średnie | blokada `/api/payload-locked-documents` dla nie-personelu (Nginx/proxy) albo `lockDocuments: false` | S | naprawione w PR #119 (18.11), do wdrożenia |
| G-03 | Gaming | logowanie | Tylko blokada konta 5 prób / 15 min, bez limitu na IP w Nginx (`location /api/`): każdy może blokować konto admina; różnica czasu odpowiedzi zdradza, czy konto istnieje. `forgot-password` panelu bez limitu na IP (klienci mają). | `src/collections/Customers.ts:49-50, 78`, `Users.ts:60-61, 84`; prokom-web `docker/nginx/snippets/gaming.conf:20` | Średnie | `limit_req` na logowanie i reset hasła (`users`, `customers`); hook limitu w `Users` | S | naprawione: limit resetu w PR #119, limit logowania w Nginx — prokom-web PR #755 |
| G-04 | Gaming | CSP | CSP bez `script-src`; panel admina w tym samym origin co strona publiczna — XSS na stronie = przejęcie sesji panelu. | prokom-web `gaming.conf:7`; `curl -sI https://prokomgaming.pl/` | Średnie | `script-src 'self'` + nonce/hash dla skryptu Umami i JSON-LD (najpierw Report-Only) | M | otwarte |
| G-05 | Gaming | sesja | Payload `csrf: []` (ciasteczko z każdego Origin, łagodzi `SameSite=Lax`); ciasteczko `payload-token` bez `Secure`. Naprawa: `csrf: [SITE_URL]` (nie `serverURL` — zmienia adresy mediów na bezwzględne). | `src/payload.config.ts` (brak); `payload/dist/auth/extractJWT.js:18-29` | Niskie | `serverURL: SITE_URL`, `auth.cookies.secure: true` | S | naprawione w PR #119 (18.11), do wdrożenia |
| G-06 | Gaming | zależności | `next` 16.4.2 — 2 umiarkowane (wyciek cache przy `'use cache'` z root params) — w kodzie brak `'use cache'`; `esbuild` (narzędzie). | `pnpm audit --prod` → 3 moderate; `grep "use cache" src` → brak | Niskie | podbić do ≥ 16.4.5 (Dependabot) | S | otwarte |
| G-07 | Gaming | drobne | `savePushSubscription` przepisuje istniejący `endpoint` na bieżącego admina i przyjmuje dowolny URL https (POST z serwera) — tylko admin; brak limitu rozmiaru plików w Payload (20 MB w Nginx); `firstUserIsAdmin` zamknięty tylko w Nginx. | `src/admin/settings/pushActions.ts:28, 62-86`; `Media.ts`; `Users.ts:30-34`, prokom-web `gaming.conf:27-33` | Niskie | odmowa przy innym właścicielu, allowlista hostów push | S | otwarte |

## Sprawdzone i w porządku

| System | Obszar | Co sprawdzono | Dowód |
| --- | --- | --- | --- |
| Gaming | dostęp anonimowy | Anonim dostaje 403 na `users`, `customers`, `inquiries`, `inquiry-messages`, `orders`, `tickets`, `vouchers`, `mail-intake-unmatched`, `price-checks`, `price-sources`, `push-subscriptions`, `reply-templates`; publiczne tylko `builds` (zestawy, bez danych osobowych), `media`, `published-prices`; GraphQL wyłączony | `curl https://prokomgaming.pl/api/<slug>` → 403 / 200; `/api/graphql` → „Route not found” |
| Gaming | konta klientów | Rejestracja: Zod, honeypot, token czasu, 5/10 min na IP, ta sama odpowiedź dla istniejącego e-maila, nigdy `_verified` z żądania; weryfikacja e-maila wymagana (druga blokada w dostępie); reset: 1 h, jednorazowy, czyści sesje, limit na IP; klient nie eskaluje do admina (`isAdmin` tylko kolekcja `users`) | `rejestracja/route.ts:39-71, 102-108`; `access/customer.ts:13-19`; `Customers.ts:62, 70-78`; `access/panel.ts:24-27` + testy |
| Gaming | IDOR | Klient widzi tylko swoje zamówienia, egzemplarze i zgłoszenia; `/api/konto/*` działa na id z sesji; metryka egzemplarza tylko opublikowana, kod 16 znaków z `crypto.randomInt`; brak otwartych przekierowań | `zgloszenie/route.ts:22-30`; `lib/account/account.server.ts:76`; `lib/certificate.server.ts:24-34`; `lib/units.ts:14` |
| Gaming | „Sprawdź ceny” (Claude) | Klucz `ANTHROPIC_API_KEY` tylko po stronie serwera (`server-only`), uruchamia tylko admin i harmonogram, miesięczny budżet USD sprawdzany przed każdym wywołaniem, limity wyszukiwań; strony sklepów pobiera `web_fetch` Anthropic tylko z domen z listy admina, serwer pobiera wyłącznie `https://ceneo.pl/<id>`; **odpowiedź modelu niczego nie publikuje**: propozycja → admin przyjmuje koszty → admin publikuje ceny („Do zatwierdzenia”), duże zmiany do ręcznego sprawdzenia | `lib/env.ts:86`; `lib/price-check/claude.ts:178-186`; `globals/PriceCheckSettings.ts:96-101`; `run.ts:118-136`; `pricing/sources.ts:15-66`; `lib/pricing/publish.ts:107-140` |
| Gaming | poczta | IMAP/SMTP z env, IMAP po TLS; z maili przychodzących zapisywany tylko tekst (bez HTML), w panelu brak `dangerouslySetInnerHTML`; odpowiedzi escapowane, temat bez CR/LF | `imap.server.ts:22`; `parse.ts:102-140`; `replyMail.ts:32-41` |
| Gaming | XSS i media | `dangerouslySetInnerHTML` tylko JSON-LD (escapowany) i stała funkcja Umami; upload tylko admin, bez SVG | `components/JsonLd.tsx:6`; `Media.ts:18-24` |
| Gaming | Umami | Na zewnątrz tylko `/_s/script.js` i `/_s/api/send`; panel Umami na `127.0.0.1:3210` (tunel SSH), obraz przypięty 3.4.1 | prokom-web `gaming.conf:51-63`; `curl /umami/login` → 404; AB1 `ss -tlnH` |
| Gaming | repo i CI | Historia (420 commitów) bez sekretów; akcje przypięte do SHA, minimalne uprawnienia, brak `pull_request_target`; produkcja tylko `workflow_dispatch` z SHA z `develop`, środowisko `production`, przypięty `known_hosts`; klucz wdrożeniowy na serwerze ograniczony do bramki (`restrict,command=`) | `gitleaks git` → 0; `.github/workflows/deploy-production.yml:33-45`; AB1 `authorized_keys` |
| Gaming | wycieki | `/api/health` → `{"status":"ok"}`, bez map źródeł w przeglądarce, `create-first-user` i `first-register` zamknięte w Nginx (`init` → `initialized: true`) | `curl …/api/health`; AB1 |

## Nie dało się sprawdzić

| System | Obszar | Dlaczego | Kto / kiedy dokończy |
| --- | --- | --- | --- |
| Gaming | zatwierdzanie wdrożeń produkcji | czy środowisko `production` w GitHubie wymaga zatwierdzenia — ustawienie repo, nie kod | Krystian (część K, GitHub) |

## Pomysły

Pomysły „przy okazji” (AUDYT-PLAN §2 pkt 7) — nie do kodu w trakcie audytu.
