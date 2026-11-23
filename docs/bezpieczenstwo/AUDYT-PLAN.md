# Audyt bezpieczeństwa PRO-KOM — zakres, plan i polecenia dla Claude Code

Wersja 1.2 · 18.11.2026 (wszystkie strony na produkcji na VPS webh.pl, w tym nowa pro-kom.eu i Tech) · przygotowane w czacie projektu „PRO-KOM Cyfryzacja”.
Miejsce w repo: `docs/bezpieczenstwo/AUDYT-PLAN.md` (prokom-web; kopia w prokom-gaming i prokom-system).

## 0. Cel
Szef zapytał 18.11, czy wszystko, co zbudowaliśmy, jest bezpieczne, i zlecił audyt. Wynik ma być trzyczęściowy:
1. **Lista znalezisk** z oceną ryzyka i dowodem (co sprawdzono, jaką komendą, jaki wynik).
2. **Naprawy** — osobne PR-y, od najgroźniejszych.
3. **Raport dla szefa** — prostym językiem, 1–2 strony: co chronimy, co sprawdziliśmy, co naprawiliśmy, co zostaje i dlaczego. Treść powstaje w czacie po sesji AB4, do pliku dopiero po akceptacji Krystiana.

Miara: OWASP ASVS poziom 1 (aplikacje), OWASP Top 10, `manage.py check --deploy` (Django), dobre praktyki utwardzania Ubuntu/Docker/Nginx, RODO art. 32 (bezpieczeństwo przetwarzania).

**Uczciwie:** to jest audyt wewnętrzny — robi go autor systemów z pomocą Claude. Nie zastępuje testu penetracyjnego niezależnej firmy. W raporcie dla szefa nazywamy go „przeglądem bezpieczeństwa”, nie „certyfikatem”.

## 1. Zakres
| # | System | Stos | Gdzie stoi | Jakie dane | Ryzyko |
|---|---|---|---|---|---|
| 1 | **prokomserwis.pl** (PRO-KOM Tech) — strona, panel pracownika, panel admina, konto klienta, śledzenie naprawy | Django + DRF, Next.js, PostgreSQL, Redis/Celery | VPS webh.pl (po migracji z Hetznera) | dane klientów serwisu (imię, telefon, e-mail), historia napraw, zdjęcia, PDF-y protokołów | **najwyższe** |
| 2 | **PRO-KOM Gaming** — strona, konfigurator, konto klienta, zamówienia, panel, „Sprawdź ceny” (Claude API), IMAP | Next.js + Payload, PostgreSQL, Umami | VPS webh.pl | dane klientów, zapytania, korespondencja, klucz API | wysokie |
| 3 | **prokom-web** — prokombiznes.pl, prokominstalacje.pl, prokomsoftware.pl, pro-kom.eu + wspólny panel | Next.js + Payload multi-tenant, PostgreSQL | VPS webh.pl | zapytania z formularzy (dane kontaktowe), konta panelu | średnie |
| 4 | **Serwer** VPS webh.pl `194.28.50.70` — Ubuntu 24.04, Docker, wspólny Nginx, certyfikaty, kopie, staging | — | Łódź | wszystko powyżej | **najwyższe** |
| 5 | **Konta i dostępy** — GitHub, webh.pl, Seohost, cyber_Folks, nazwa.pl, Hetzner, Google, Better Stack, Sentry, Anthropic API, skrzynki `kontakt@` | — | — | klucze do wszystkiego | **najwyższe** |
| 6 | **Stary hosting nazwa.pl** — stare serwisy PHP i bazy (Joomla, Presta, midnight2018, `zaleglosci` z bazą) | PHP | nazwa.pl | m.in. dane osobowe w starych bazach | wysokie (RODO) |
| 7 | **Stary serwer Hetzner** (po migracji Tech) | — | Hetzner | pełna kopia bazy i plików serwisu, stare sekrety | wysokie do czasu usunięcia |
| 8 | **Komputer Krystiana** — repozytoria, klucz SSH, lokalne zrzuty baz | Windows | dom | kopie danych, dostęp do serwera | średnie |

Poza zakresem (osobne zlecenie, jeśli szef chce): sieć biurowa i komputery w salonach, Subiekt GT, poczta pracowników `@pro-kom.eu`, kasy i terminale, konta Allegro.

Stan na 18.11: wszystkie strony działają na produkcji na jednym VPS webh.pl (prokom-web z 4 domenami, Gaming, Tech).

## 2. Zasady twarde
1. **Faza audytu jest tylko do odczytu.** Żadnych zmian na serwerze, w DNS, w bazie i w kodzie. Wynik = plik ze znaleziskami.
2. **Naprawy = osobne PR-y** po przejrzeniu listy przez Krystiana. Każdy krok na produkcji dopiero po jego „tak”.
3. **Sekrety nigdy nie trafiają do raportu, PR-a, czatu ani logu sesji.** W dowodach maskujemy (`sk-…abcd`). Wypisujemy nazwy kluczy, nie wartości.
4. **Znalezisko krytyczne** (wyciekły sekret, publicznie dostępne dane osobowe, otwarta baza) → stop, natychmiast informacja dla Krystiana, rotacja/zamknięcie jeszcze tego samego wieczoru, potem dalszy audyt.
5. Testy „z zewnątrz” tylko na własnych domenach i własnym IP, bez obciążania (bez skanów agresywnych, bez prób łamania haseł na produkcji; blokady logowania testujemy na stagingu).
6. Dane osobowe: w dowodach liczby i nazwy pól, nigdy prawdziwe rekordy.
7. Nowe pomysły „przy okazji” → sekcja „Pomysły” w wynikach, nie do kodu.

## 3. Format znaleziska i skala
Plik wyników: `docs/bezpieczenstwo/ZNALEZISKA-2026-11.md`. Jedno znalezisko = jeden wiersz + ewentualny opis.

`ID · system · obszar · opis · dowód (komenda/plik:linia/wynik) · ryzyko · naprawa · koszt (S/M/L) · status`

| Ryzyko | Znaczenie | Termin naprawy |
|---|---|---|
| **Krytyczne** | ktoś z zewnątrz może dziś odczytać dane, przejąć konto lub serwer | tego samego dnia |
| **Wysokie** | realna droga ataku albo utraty danych, wymaga jednego dodatkowego warunku | do 7 dni |
| **Średnie** | osłabia ochronę, samo nie wystarczy do szkody | do 30 dni |
| **Niskie** | dobra praktyka, porządek | przy okazji / świadomie odpuszczone |

Na końcu pliku: tabela „Sprawdzone i w porządku” (to też idzie do raportu szefa) oraz „Nie dało się sprawdzić”.

## 4. Punkty do sprawdzenia w pierwszej kolejności (znane z dokumentów projektu)
1. **Wersje bez wsparcia w prokomserwis.pl.** Według stanu z października system działa na Django 5.1 i Next.js 14. Django 5.1 nie dostaje poprawek bezpieczeństwa od grudnia 2025 (https://www.djangoproject.com/download/), Next.js 14 od 26.10.2025 (https://nextjs.org/support-policy). Potwierdzić wersje na produkcji (`pip show django`, `package.json`). Jeśli się zgadza: aktualizacja do Django 5.2 LTS i wspieranej linii Next.js = naprawa numer 1 (Wysokie).
2. **Kopie zapasowe i test odtworzenia** dla każdego stosu produkcyjnego (prokom-web, gaming, tech) — w pulpicie budowy z 14.11 oznaczone „❓ niepotwierdzone”. Kopia bez udanego odtworzenia nie jest kopią.
3. **Drugi składnik logowania do panelu** — dokument zaakceptowany przez szefa 12.10 obiecuje „drugi składnik logowania” i blokadę po nieudanych próbach. Sprawdzić stan faktyczny w Payload i w Django.
4. **`/admin/create-first-user`** w Payload na każdym stosie (prod i staging, prokom-web i gaming) — przy pustej tabeli `users` wpuszcza każdego.
5. **Repo `krystian2077/prokom-system`**: publiczne czy prywatne; w repo leżą `.claude/worktrees/`, `.claire/`, `.claude/settings.local.json`; historia gita do przeskanowania pod sekrety.
6. **Pliki klientów serwisu** (`/media/`: zdjęcia napraw, PDF-y protokołów) — czy da się je otworzyć bez logowania, znając lub zgadując adres.
7. **Śledzenie naprawy `/track`** — czy numer naprawy da się odgadnąć (kolejne numery) i jakie dane osobowe wtedy widać.
8. **Docker a zapora** — Docker publikuje porty z pominięciem `ufw`. Sprawdzić, czy żaden kontener (baza, Redis, Umami, aplikacja) nie wystawia portu na `0.0.0.0`.
9. **Stare serwisy na nazwa.pl** — nowa pro-kom.eu działa już na VPS, subdomeny wyłączone w DNS 16.11, więc hosting nazwa.pl nie obsługuje żadnej strony, ale pliki i bazy (stara pro-kom.eu, `zaleglosci` i reszta) nadal tam leżą. Zostaje tylko poczta. Zaszyfrowane archiwum → usunięcie z serwera (plan z 13.10, niewykonany).
10. **Polityki prywatności** trzech–czterech linii w wersji roboczej, bez prawnika; w części wpisany zły hosting (Seohost/Hetzner zamiast webh.pl).
11. **DMARC `p=none`** na domenach linii — po 2–4 tygodniach czystych raportów przejść na `quarantine`.
12. **Jedna osoba** — dostęp awaryjny szefa do menedżera haseł, runbook „co robić, gdy strona nie działa”.

## 5. Część K — konta i dostępy (Krystian, w przeglądarce, bez Claude Code)
Arkusz `docs/bezpieczenstwo/DOSTEPY.md` (bez haseł): usługa · do czego · konto właściciela (firmowe?) · 2FA (tak/nie/brak opcji) · kto jeszcze ma dostęp · kody zapasowe w menedżerze haseł · data odnowienia/płatności.

- [ ] GitHub: organizacja `prokom-eu` — wymuszone 2FA, lista członków i aplikacji z dostępem, tokeny osobiste (usunąć nieużywane, pozostałe z datą ważności i minimalnym zakresem), ochrona gałęzi `develop`/`main`, pakiety GHCR prywatne. `prokom-system` przenieść z konta prywatnego do organizacji (decyzja).
- [ ] webh.pl, Seohost (2 hostingi + domeny), cyber_Folks (domena prokomserwis.pl), nazwa.pl, Hetzner: konto na firmę, 2FA, kto zna hasło, autoodnawianie domen, blokada transferu, daty wygaśnięcia w `docs/dns.md`.
- [ ] Google: Search Console, Profil Firmy, Cloud Console (OAuth prokomserwis), konto Gmail używane jako SMTP aplikacji (hasło aplikacji, 2FA) — kto jest właścicielem.
- [ ] Better Stack, Sentry, Anthropic Console (limit wydatków, klucz tylko na serwerze), Umami (hasło admina zmienione z domyślnego).
- [ ] Panele: lista użytkowników Payload (prokom-web, gaming) i Django (staff, superuser) — usunąć konta testowe i zbędne, role minimalne, każde konto imienne.
- [ ] Skrzynki `kontakt@…`: unikalne hasła, kto ma je w Thunderbirdzie, przekierowania.
- [ ] Menedżer haseł: wszystko w nim, nic w plikach i notatkach; dostęp awaryjny szefa ustawiony i sprawdzony.
- [ ] Byli pracownicy i zewnętrzny informatyk: do czego mają jeszcze dostęp.
- [ ] Komputer domowy: szyfrowanie dysku (BitLocker), blokada ekranu, klucz SSH z hasłem, `repos` poza chmurą, **lokalne zrzuty baz produkcyjnych usunięte** po użyciu.
- [ ] Stary serwer Hetzner: czy jest zatrzymany, co na nim zostało (baza, media, `.env`, certyfikaty), data usunięcia; przed usunięciem ostatni zrzut do zaszyfrowanego archiwum. Sekrety, które tam leżały (SECRET_KEY, hasło bazy, hasło SMTP), traktujemy jako do rotacji.
- [ ] nazwa.pl: lista katalogów i baz na hostingu → archiwum zaszyfrowane (2 miejsca) → usunięcie.
- [ ] RODO (do szefa/prawnika, nie do kodu): umowy powierzenia z webh.pl i Seohost; narzędzia spoza UE (Sentry, Better Stack, Anthropic) — jakie dane tam trafiają; procedura na wypadek wycieku (zgłoszenie do UODO w 72 h, art. 33 RODO); okres przechowywania zapytań i danych napraw.

## 6. Sesje Claude Code (w domu)
Kolejność: **W-AB → AB1 → AB2 → AB3 → AB4**. AB1–AB3 tylko do odczytu, AB4 naprawy. Jedna sesja naraz. Część K (§5) robisz równolegle w pracy.

| Sesja | Repo / folder | Co | Czas |
|---|---|---|---|
| W-AB | prokom-web, prokom-gaming, prokom-system | wgranie tego planu i narzędzi, bez kodu | 20 min |
| AB1 | prokom-web (+ SSH do VPS) | serwer, sieć, Nginx, sekrety, kopie, test odtworzenia | ok. 1 wieczór |
| AB2 | prokom-system | prokomserwis.pl — najwięcej danych osobowych, dlatego pierwszy | ok. 1,5 wieczoru |
| AB3 | prokom-web, potem prokom-gaming | strony linii, hub, Gaming | ok. 1,5 wieczoru |
| AB4 | wszystkie trzy | naprawy, ponowny test, dokumenty stałe | 1–3 wieczory |

Wyniki: każde repo ma własny `docs/bezpieczenstwo/ZNALEZISKA-2026-11.md` (serwer — w prokom-web). Zbiorczy `STAN-BEZPIECZENSTWA.md` powstaje w prokom-web w AB4.

### W-AB — wgranie planu (prokom-web; potem to samo w dwóch pozostałych repo)
```
/zadanie W-AB — wgranie planu audytu bezpieczeństwa, same dokumenty, zero zmian w kodzie.
1. Gałąź docs/bezpieczenstwo od develop. Skopiuj plan z notatek Krystiana (poza repo, do-repo/bezpieczenstwo/AUDYT-BEZPIECZENSTWA.md) do docs/bezpieczenstwo/AUDYT-PLAN.md.
2. Utwórz docs/bezpieczenstwo/ZNALEZISKA-2026-11.md z nagłówkiem, tabelą wg AUDYT-PLAN §3 i pustymi sekcjami („Serwer” tylko w prokom-web, dalej sekcja tego repo, „Sprawdzone i w porządku”, „Nie dało się sprawdzić”, „Pomysły”) oraz docs/bezpieczenstwo/DOSTEPY.md z pustą tabelą wg §5 (bez haseł — dopisz to wielkimi literami na górze pliku).
3. Dopisz do CLAUDE.md 3 linijki: gdzie jest plan audytu, że sesje AB1–AB3 są tylko do odczytu, że sekrety nigdy nie trafiają do plików, PR-ów ani odpowiedzi.
4. Sprawdź, czy na tym komputerze są: gitleaks, trivy (albo docker scout), nmap, pip-audit. Czego brakuje — podaj mi komendę instalacji dla Windows (winget/scoop/pipx), nie instaluj sam.
5. Wpis w docs/STAN.md: „Audyt bezpieczeństwa — W-AB zrobione, następna AB1”. PR do develop, squash.
Powtórz kroki 1–3 i 5 w prokom-gaming i prokom-system (w prokom-system gałąź od master/develop zgodnie z tym, jak pracujemy w tym repo).
```

### AB1 — serwer, sieć, kopie (ok. 1 wieczór)
```
/zadanie AB1 — audyt bezpieczeństwa serwera VPS webh.pl. TYLKO ODCZYT: żadnych zmian na serwerze. Przeczytaj docs/bezpieczenstwo/AUDYT-PLAN.md (zasady §2, format §3, punkty §4) i runbook. Każdą komendę na serwerze podaj mi z oczekiwanym wynikiem, ja ją uruchamiam i wklejam wynik bez sekretów (albo uruchamiasz przez SSH po moim „tak”). Wynik: docs/bezpieczenstwo/ZNALEZISKA-2026-11.md, sekcja „Serwer”.

Sprawdź:
1. SSH: sshd -T (PermitRootLogin, PasswordAuthentication, AllowUsers, PubkeyAuthentication), authorized_keys wszystkich kont, konta z powłoką, sudoers, ostatnie logowania (last, lastb), fail2ban-client status sshd.
2. Zapora i porty: ufw status verbose; ss -tlnp; docker ps z portami — żaden kontener poza Nginx nie może mieć 0.0.0.0:port (Docker omija ufw). Z mojego komputera: nmap -Pn na 194.28.50.70 (top 1000) — oczekiwane tylko 22, 80, 443.
3. System: unattended-upgrades włączone i działają (logi), apt list --upgradable, /var/run/reboot-required, wersja jądra, synchronizacja czasu.
4. Docker: użytkownik w kontenerach (root?), privileged, montowanie docker.sock, limity pamięci, RestartCount, sieci (bazy i Redis poza siecią proxy), wiek obrazów, docker scout/trivy na obrazach produkcyjnych (HIGH/CRITICAL).
5. Nginx (wszystkie hosty prod i staging): TLS 1.2+/1.3, HSTS, nagłówki (CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy), server_tokens off, domyślny serwer 444, limity żądań na formularze i logowanie, client_max_body_size, staging za hasłem + noindex, panel tylko pod hostem panel.*, /admin na domenach stron = 404, brak dostępu do /.env, /.git, map źródeł.
6. Sekrety: uprawnienia i właściciel .env* (600), brak sekretów w plikach compose, w docker history obrazów i w logach; token GHCR tylko do odczytu; lista nazw kluczy z datą ostatniej rotacji (jeśli znana).
7. Certyfikaty: daty ważności wszystkich, certbot renew --dry-run, timer odnowień.
8. KOPIE — najważniejsze: dla każdego stosu prod (prokom-web, gaming, tech) cron, wiek ostatniej kopii, cel poza webh.pl, szyfrowanie, retencja, alarm braku kopii. Potem TEST ODTWORZENIA każdego stosu do pustej, tymczasowej bazy (nie produkcyjnej): liczby rekordów zgodne, czas odtworzenia zapisany. To jedyna czynność z zapisem — do bazy tymczasowej, którą na końcu usuwamy.
9. Logi i dysk: rotacja, limity logów Dockera, zajętość dysku, czy logi nie zawierają danych osobowych i haseł.
10. Monitoring: monitory dostępności i certyfikatów dla każdej domeny, alarm na telefon, Sentry.
11. Z zewnątrz dla każdej domeny produkcyjnej: curl -sI (nagłówki), SSL Labs, Mozilla HTTP Observatory, securityheaders.com; SPF/DKIM/DMARC (dig), CAA. Osobno pro-kom.eu: strefa jest ręcznie ustawiona w nazwa.pl — sprawdź, że A/www wskazują tylko VPS, nie został żaden rekord do starego hostingu ani wyłączonych subdomen (ryzyko przejęcia subdomeny), a MX/SPF/DKIM/DMARC poczty pracowników są nienaruszone.
DoD: każda pozycja ma wynik „OK / znalezisko / nie dało się sprawdzić” z dowodem. Zero zmian na serwerze poza bazą tymczasową testu odtworzenia.
```

### AB2 — prokom-system (Django + Next.js, prokomserwis.pl) (ok. 1,5 wieczoru)
```
/zadanie AB2 — audyt bezpieczeństwa prokom-system (prokomserwis.pl). TYLKO ODCZYT, strefa zakazana backendu obowiązuje — niczego nie zmieniamy. Zasady i format: docs/bezpieczenstwo/AUDYT-PLAN.md. Testy dynamiczne lokalnie na danych fikcyjnych albo na stagingu po anonimizacji. Wynik: sekcja „Tech” w ZNALEZISKA-2026-11.md.

Sprawdź:
1. Wersje i wsparcie: Django, DRF, Celery, Next.js, Python, Node, PostgreSQL, Redis — które linie nie mają już poprawek bezpieczeństwa (AUDYT-PLAN §4 pkt 1). pip-audit, npm/pnpm audit. Oszacuj aktualizację do Django 5.2 LTS i wspieranego Next.js (co się łamie, ile pracy).
2. python manage.py check --deploy z ustawieniami produkcyjnymi; DEBUG, SECRET_KEY, ALLOWED_HOSTS, SECURE_* (HSTS, SSL redirect, ciasteczka secure), CSRF_TRUSTED_ORIGINS, CORS (lista, nie „*”), SESSION/JWT (czas życia, odświeżanie, unieważnianie przy zmianie hasła).
3. Uprawnienia API: domyślne permission_classes; tabela endpoint × metoda × kto; klient widzi wyłącznie swoje naprawy (test IDOR na dwóch kontach klientów i jednym pracowniku); pracownik vs admin.
4. /track: czy numery napraw są przewidywalne, co widać po podaniu numeru (dane osobowe?), limit prób.
5. Logowanie: throttling logowania, resetu hasła, rejestracji i zgłoszenia; walidatory haseł; Google OAuth (redirect URI, state); /admin/ pod standardowym adresem — ograniczenie i 2FA dla personelu; lista kont staff/superuser.
6. Pliki: /media/ — czy zdjęcia napraw i PDF-y protokołów są dostępne bez logowania; nazwy plików losowe czy zgadywalne; walidacja typu i rozmiaru przy uploadzie; skąd generator PDF pobiera zasoby (SSRF).
7. Wstrzyknięcia: surowy SQL, extra()/raw(), mark_safe, szablony maili z danymi klienta.
8. Redis i Celery: hasło, brak portu na zewnątrz, co wysyła maile do klientów.
9. Sekrety i repo: gitleaks na całej historii; czy repo jest publiczne; .claude/worktrees, .claire, .claude/settings.local.json — co zawierają; każdy sekret, który kiedykolwiek był w historii → lista do rotacji.
10. Dane osobowe: gdzie są (tabele, pola), logi i Sentry bez danych klientów, okres przechowywania, eksport/usunięcie na żądanie klienta.
11. Po migracji z Hetznera: czy sekrety produkcyjne na VPS są nowe, czy przeniesione 1:1 ze starego serwera (lista do rotacji); czy stary docker-compose.prod.yml i katalog nginx/ w repo nie zawierają niczego tajnego; plan bezpiecznego usunięcia starego serwera.
DoD: tabela uprawnień API; lista sekretów do rotacji (nazwy, bez wartości); wycena aktualizacji wersji.
```

### AB3 — prokom-web + prokom-gaming (Next.js + Payload) (ok. 1,5 wieczoru)
```
/zadanie AB3 — audyt bezpieczeństwa kodu prokom-web, potem to samo w prokom-gaming. TYLKO ODCZYT kodu, bez zmian. Zasady i format: docs/bezpieczenstwo/AUDYT-PLAN.md. Testy dynamiczne tylko lokalnie albo na stagingu, nie na produkcji. Wynik: sekcje „prokom-web” i „Gaming” w ZNALEZISKA-2026-11.md.

Sprawdź:
1. Zależności: pnpm audit --prod; wersje Next.js, Payload, React, Node względem aktualnych komunikatów bezpieczeństwa (sprawdź w sieci advisories dla naszych dokładnych wersji); Dependabot/Renovate włączony; obraz bazowy.
2. Sekrety: gitleaks na całej historii obu repo; .env* w .gitignore; nic tajnego w NEXT_PUBLIC_*; PAYLOAD_SECRET osobny i długi dla każdego środowiska; sekrety Actions i build args.
3. Payload — kontrola dostępu KAŻDEJ kolekcji i globala (tabela: kolekcja × read/create/update/delete × kto): Inquiries i Users nieczytelne bez logowania przez REST (/api/…) i GraphQL; izolacja tenantów (użytkownik linii A nie widzi danych linii B) — test na dwóch kontach; GraphQL playground wyłączony na produkcji; create-first-user zamknięty; maxLoginAttempts/lockTime; polityka haseł; stan 2FA; ciasteczka (secure, httpOnly, sameSite); CSRF i CORS (listy domen); role.
4. Własne endpointy, route handlers i server actions: pełna lista, przy każdym — kto może wywołać, walidacja wejścia (zod), limit żądań.
5. Formularze: walidacja po stronie serwera, limity długości, antyspam, wstrzyknięcie nagłówków i HTML w mailach, zapis zgody.
6. XSS i treść: każde dangerouslySetInnerHTML, render rich text, JSON-LD, parametry wyszukiwarki; faktyczna wartość CSP (unsafe-inline/unsafe-eval — gdzie i dlaczego); otwarte przekierowania.
7. Media i upload: dozwolone typy (SVG!), limity rozmiaru, kto może wgrywać.
8. Błędy i wycieki: strony błędów bez śladu stosu, brak map źródeł na produkcji, /api/health bez szczegółów, nagłówki bez wersji.
9. CI/CD: uprawnienia GITHUB_TOKEN w workflow, akcje przypięte do wersji, kto może wdrożyć produkcję, pakiety GHCR prywatne.
10. Tylko Gaming: konto klienta (rejestracja, logowanie, reset hasła — ważność i jednorazowość tokenów, brak ujawniania, czy e-mail istnieje); dostęp do cudzych zamówień/metryk po zmianie id (test na dwóch kontach); „Sprawdź ceny”: klucz Anthropic tylko po stronie serwera, limit wydatków, treść pobrana ze sklepów nie może niczego opublikować ani zmienić ceny bez kolejki i strażnika (prompt injection); dane IMAP/SMTP; subskrypcje push; Umami (hasło, brak publicznej rejestracji, wersja).
DoD: tabela dostępu kolekcji w wynikach; każde znalezisko z plikiem i linią.
```

### AB4 — naprawy, ponowny test, dokumenty (1–3 wieczory, zależnie od listy)
```
/zadanie AB4 — naprawy z docs/bezpieczenstwo/ZNALEZISKA-2026-11.md. Kolejność: Krytyczne → Wysokie → Średnie; Niskie tylko tam, gdzie koszt S. Jedna gałąź i PR na system (fix/bezpieczenstwo-<system>), w PR lista ID znalezisk. Zmiany na serwerze, rotacja sekretów i wdrożenia tylko po moim „tak”, z kopią przed. Po każdej naprawie ponów test z dowodu i zmień status na „naprawione (PR #, data)”. Aktualizacja Django/Next.js w prokomserwis — osobny PR z pełnymi testami i wdrożeniem najpierw na staging.
Na koniec:
1. docs/bezpieczenstwo/STAN-BEZPIECZENSTWA.md — stan po audycie: co sprawdzone i OK, co naprawione, co świadomie zostaje (z uzasadnieniem i właścicielem decyzji), co wymaga decyzji szefa lub prawnika.
2. docs/bezpieczenstwo/RYTUAL.md — stałe czynności: co tydzień (alerty, kopie), co miesiąc (aktualizacje zależności i systemu, test odtworzenia jednego stosu, przegląd kont), co kwartał (rotacja kluczy, przegląd dostępów, powtórka skanów z zewnątrz), po odejściu pracownika.
3. docs/bezpieczenstwo/INCYDENT.md — co robić przy włamaniu lub wycieku: kogo zawiadomić, jak odciąć dostęp, zabezpieczyć logi, odtworzyć z kopii; termin 72 h na zgłoszenie do UODO.
4. W RYTUAL.md kalendarz czynności z konkretnymi datami na najbliższe 3 miesiące.
```

## 7. Po audycie
- Raport dla szefa: czat „Szef · raporty”, na podstawie `STAN-BEZPIECZENSTWA.md`. Bez żargonu, bez liczby godzin.
- Aktualizacja `claude/00-STAN-PROJEKTU.md`.
- Powtórka: skrócony przegląd po każdym nowym systemie (Strefa Klienta, PRO-KOM System, sklep) — przed produkcją, nie po.
- Test penetracyjny zewnętrznej firmy: rekomendowany przed startem Strefy Klienta i PRO-KOM System w 2027 (logowanie klientów B2B, oferty, dane wielu firm). Wymaga zapytania ofertowego — decyzja szefa.
