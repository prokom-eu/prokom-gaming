# ADR-G005: Zapytania, egzemplarze (metryka), zamówienia (warsztat), konto klienta — w Payload, za stałym kontraktem

- **Status:** przyjęta (decyzja Krystiana 25.10.2026, sesja G0 — opcja A)
- **Data:** 2026-10-25
- **Decyduje:** Krystian

## Kontekst
Pełny zakres na 20.11 (decyzja Krystiana 25.10.2026) obejmuje: zapytania, metrykę egzemplarza online, tablicę warsztatu, konto klienta ze zgłoszeniami, „Gotowe od ręki” i bon podarunkowy. Docelowo dane klienta i egzemplarza mają żyć w PRO-KOM System / Strefie Klienta (Django, 2027). Wcześniejsza dokumentacja zakładała konto w Django „jeśli zdąży”. Na 26 wieczorów to druga aplikacja, druga baza, logowanie, API i wdrożenie — największe ryzyko terminu.

## Opcje
| Opcja | Plusy | Minusy |
|---|---|---|
| **A. Payload w tym repo, stały kontrakt danych** | jedna aplikacja i jedno wdrożenie; panel od ręki dla Krystiana i serwisu; logowanie klientów wbudowane w Payload (kolekcja z `auth`) | w 2027 migracja danych do Django (małe dane: dziesiątki–setki rekordów) |
| B. Django (zalążek Strefy Klienta) od razu | dane od początku w docelowym miejscu | druga aplikacja w najciaśniejszym miesiącu; panel i logowanie od zera |
| C. Bez konta i metryki na start | najmniej pracy | wbrew decyzji o pełnym zakresie |

## Decyzja
**Opcja A** — tak jak `prokom-web` zrobił ze skrzynką zapytań (ADR-003 tam): stabilna ma być **granica i schemat**, nie miejsce zapisu. Wszystkie modele poniżej mają pola 1:1 z przyszłymi modelami Django; w 2027 jednorazowy skrypt przenosi rekordy, a strona przełącza się na API.

**Dwie kolekcje z logowaniem (G0):** `users` (panel: role `admin`, `serwis`; `admin.user` w konfiguracji Payload) i `customers` (klienci strony). Klient nigdy nie loguje się do panelu, a konto panelu nie jest kontem klienta — osobne sesje, osobne reguły dostępu, osobne limity prób logowania. Dzięki temu błąd w regułach dostępu klienta nie otwiera panelu, a migracja klientów do Django w 2027 nie dotyka kont zespołu.

### Kolekcje systemowe
| Kolekcja | Pola (najważniejsze) | Dostęp |
|---|---|---|
| `inquiries` | `number` (`PKG-RRRR-NNNN`), `type` (build \| config \| advice [„Pomóżcie mi dobrać”] \| custom_list [„Mam własną listę”] \| compare \| contact \| voucher \| ready), `config` (kody: level, case, cooler, ram, ssd + `customCase`/`customCooler` tekst), `build`, `priceAtInquiry`, `games[]`, `monitor`, `refresh`, `extras[]`, `pickup` (courier \| rabka \| zakopane), `invoice` + `nip` (suma kontrolna), `name`, `email` (wymagany — uzupełnienie G6), `phone`, `preferredContact`, `message`, `consent { accepted, clauseVersion, acceptedAt }`, `marketingConsent`, `source` (URL, UTM), `status` (new → in_progress → offer_sent → won \| lost \| closed) | panel: odczyt + `status`; publicznie tylko `POST /api/inquiry` |
| `orders` | `inquiry`, `customer?`, `build?` / `config`, `stage` (offer → paid → parts → assembly → test → metric_ready → shipped → delivered), `stageHistory[] { stage, at }`, `publicLabel` (nazwa zestawu i kolor — jedyne, co widać na tablicy), `unit?`, `trackingNumber?` | panel: serwis i admin; publicznie: tylko `GET /api/warsztat` (nazwa, kolor, etap, bez danych osobowych) |
| `units` (egzemplarze, metryka) | `code` (losowy, ≥ 12 znaków, nieodgadniony), `build`, `serial`, `parts[] { role, manufacturer, model, serial, warrantyUntil }`, `stressTest { minutes, errors }`, `temps { cpuMax, gpuMax }`, `fps[] { game, resolution, fps }` (3 gry → `fps-results` rodzaj `p` **tylko, gdy konfiguracja egzemplarza = przepis zestawu**, ADR-G004 §5), `assembledBy` (imię, za zgodą), `testedAt`, `warrantyUntil`, `customer?`, `published` | publicznie: `/metryka/<code>` bez danych klienta; PDF do pudełka |
| `customers` (konto) | Payload `auth` (e-mail + hasło, weryfikacja e-maila, reset hasła, `maxLoginAttempts`), `name`, `phone?`, `savedConfigs[] { label, config, createdAt }`, `favorites[]` | klient widzi tylko swoje `orders`, `units`, `tickets` (reguły dostępu + test) |
| `tickets` (zgłoszenia) | `unit`, `customer?`, `category` (gra się zacina \| nie włącza się \| głośno lub gorąco \| inne), `description`, `remoteHelpConsent`, `status`, `history[]` | klient: tworzy i czyta swoje; panel: serwis |
| `stock` (Gotowe od ręki) | `unit` albo `build` + `config`, `location` (rabka \| zakopane), `condition` (nowy \| pokazowy \| po zwrocie — z opisem), `price` (z `lib/pricing/` dla `config`, z ewentualnym rabatem wg ADR-G002 §7), `reservedUntil` | publicznie: lista; rezerwacja = zapytanie `type: ready`, 24 h |
| `vouchers` (bon) | `code`, `amount` (500 \| 1000 \| 2000 \| 3000 — do decyzji szefa), `design` (istota), `recipient`, `dedication`, `validUntil` (12 mies.), `status` (ordered → paid → issued → used) | zamówienie bonu = zapytanie `type: voucher`; kod i PDF wystawia panel po wpłacie |
| `price-history` | `itemType`, `itemCode`, `sellPrice`, `validFrom`, `validTo` | panel; strona tylko do „najniższej ceny z 30 dni” przy obniżce |

### Przepływy
1. **Zapytanie:** formularz (4 kroki) → `POST /api/inquiry` → `submitInquiry()`: Zod, honeypot, minimalny czas, limit na IP (bez zapisu pełnego IP), ponowne przeliczenie ceny i zgodności po stronie serwera (`lib/pricing/`, `lib/compat.ts`) → zapis → mail do skrzynki Gaming (`Reply-To` klienta, w temacie numer i typ) + potwierdzenie dla klienta (numer, konfiguracja, „odpiszemy zwykle w godzinę, codziennie 8–22”). Odpowiedź 201 `{ ok, number }`.
2. **Zamówienie:** Krystian w panelu zamienia zapytanie w `order` po akceptacji oferty; serwis przesuwa etapy → tablica „Teraz w warsztacie” na głównej i oś statusu w koncie.
3. **Metryka:** serwis wpisuje SN, test, temperatury, klatki → `/metryka/<code>` + PDF + naklejka QR; pomiary zawsze są na metryce egzemplarza, a do `fps-results` jako `p` trafiają tylko z egzemplarzy złożonych dokładnie wg przepisu zestawu (inaczej zostają tylko na metryce).
4. **Konto:** klient zakłada konto (opcjonalnie) albo dostaje zaproszenie mailem przy zamówieniu; widzi komputery, etap, metrykę, gwarancje, zgłoszenia, zapisane konfiguracje.

### RODO i bezpieczeństwo
- Retencja zapytań bez zamówienia: 24 mies. od ostatniej zmiany (`INQUIRY_RETENTION_MONTHS`), zadanie dzienne w kolejce zadań Payload (bez nowej usługi); usunięcie na żądanie (admin, ślad bez treści). Dane klientów z zamówieniami — wg przepisów podatkowych (do potwierdzenia z księgową) i polityki prywatności.
- Metryka i tablica bez danych osobowych; imię serwisanta tylko za zgodą.
- Pomoc zdalna — zgoda przy każdym zgłoszeniu.
- Dane osobowe nigdy w logach. Testy dostępu: klient A nie widzi danych klienta B; publiczne API nie zwraca kosztów, modeli wewnętrznych ani danych osobowych.

## Konsekwencje
- Jedna aplikacja do 20.11; Django dopiero z PRO-KOM System (2027) — migracja zaplanowana.
- Kolejność cięcia, jeśli kontrola 8.11 albo 13.11 pokaże poślizg: **konto klienta → tablica warsztatu (taśma ze stałym tekstem procesu) → bon i „Gotowe od ręki” → poradniki (1 na start) → metryka online (zostaje PDF)**. Zapytania, cennik, konfigurator, zestawy, FPS — bez cięć.
- Skrzynka powiadomień Gaming: `gaming@pro-kom.eu` — do potwierdzenia przez szefa i do dodania przy migracji poczty (Seohost).

## Uzupełnienie 27.10.2026 (G6 — zapytania: backend)
Decyzje Krystiana przy planie G6; kontrakt w `src/lib/inquiry/schema.ts` (Zod) i kolekcji `inquiries`.
- **E-mail zawsze wymagany** (jak plansza Formularz: „Wpisz e-mail, na który wyślemy ofertę.”), telefon opcjonalny, wymagany przy „Odpowiedź: Telefon”. Spec. §10 poprawiona.
- **Typy przyjmowane od G6:** `build`, `config`, `compare`, `advice`, `custom_list`, `contact`. `voucher` i `ready` są w słowniku, ale `POST /api/inquiry` odrzuca je (400 `type`) do G13 — potrzebują kolekcji `vouchers` i `stock`.
- **Komputer w zapytaniu:** `build` (slug) + opcjonalne kody zmian z „Dopasuj” albo pełna konfiguracja (5 kodów). Serwer bierze przepis zestawu, nakłada zmiany, sprawdza zgodność (`lib/compat.ts`) i liczy cenę z najnowszej partii (`priceFromSnapshot`); cena z przeglądarki jest ignorowana. Niezgodna konfiguracja → 400 `{ fields: ['config'], compat: [kody reguł] }`.
- **Nowe pola** (z planszy Formularz, 1:1 do przyszłego modelu Django): `forWhom`, `budget` (tylko `advice`), `customList` (tylko `custom_list`), `otherGames`, `caseColor`, `lighting`; systemowe `priceBatch` (partia cen użyta do `priceAtInquiry`) i `statusChangedAt` (początek okresu retencji). `customCase`/`customCooler` — dopiero, gdy pojawią się na planszy.
- **Numer `PKG-RRRR-NNNN`** z licznika rocznego `inquiry_counters` (tabela poza schematem Payload, migracja `inquiries`), zwiększanego w transakcji zapisu — bez luk w obrębie roku; rok według czasu polskiego. Luki mogą powstać tylko po usunięciu rekordu (retencja, żądanie).
- **Retencja:** usuwane `lost` i `closed` po `INQUIRY_RETENTION_MONTHS` (domyślnie 24) od ostatniej zmiany statusu; `won` zostaje (zamówienie), otwarte nigdy. Zadanie `inquiry-retention` codziennie o 3:00 czasu serwera (w kontenerze UTC, czyli 4:00/5:00 w Polsce, chyba że compose ustawi `TZ` — G16). Każde usunięcie (zadanie albo panel) zostawia wpis w `inquiry-deletions`: id, numer, powód, kto — bez treści.
- **Maile:** powiadomienie do `INQUIRY_NOTIFY_EMAIL` (wymagany na produkcji), `Reply-To` klienta, link do panelu z `SITE_URL` (wymagany na produkcji); potwierdzenie z `Reply-To` skrzynki Gaming, bez wiadomości i danych kontaktowych klienta. Nazwy części tylko z `publicLabel`. Treść potwierdzenia dopracuje G12 („Co będzie dalej”).
- **Ochrona:** honeypot `website`, podpisany token `formToken` (min. 3 s, maks. 24 h — formularz G12 dostaje go z serwera), limit 5 zapytań / 10 min na skrót HMAC adresu z `X-Real-IP` (pamięć procesu). Jeden token działa wielokrotnie przez 24 h — świadomie (jak prokom-web): przed skryptem chroni limit, a jednorazowe tokeny wymagałyby zapisu w bazie. Usuwać zapytania może każde konto panelu, dopóki `users` nie ma ról (G14).

## Uzupełnienie 30.10.2026 (G12 — formularz zapytania)
Decyzje Krystiana przy planie G12.
- **Nowe pole `lightColor`** (`piorun | krew | las | czary | lod | ogien`, opcjonalne; puste = światło istoty): kolor światła z „Dopasuj” na karcie zestawu i z konfiguratora (spec. §7) to wybór produktu, więc jest polem, nie tekstem w uwagach. Tylko w typach z komputerem (`build`, `config`, `compare`). Słownik: `LIGHT_COLOR_CHOICES` w `lib/inquiry/types.ts` (z niego bierze też karta zestawu i konfigurator). Migracja `inquiries_light_color`.
- **Porównanie (`/zapytanie?z=a,b,c`) bez zmiany kontraktu:** typ `compare`, `build` = pierwszy zestaw z porównania (klient może zmienić w kroku 1), pozostałe formularz dopisuje do uwag („Z porównania: …”). Relacja do kilku zestawów — dopiero, gdy okaże się potrzebna.
- **Token formularza** wydaje strona `/zapytanie` (renderowana per żądanie), bez osobnego `GET`.
- **Maile po odpowiedzi** (`after()` z `next/server`): rekord i numer są zapisane przed odpowiedzią 201, wysyłka nie wydłuża czekania klienta. Błąd SMTP nadal tylko w logu.

## Uzupełnienie 30.10.2026 (G13 — bon i „Gotowe od ręki”)
- `POST /api/inquiry` przyjmuje `voucher` i `ready` (wszystkie typy ze słownika). Nowe pola `inquiries` (migracja `stock_vouchers`): `voucher { amount, design, recipient, dedication }` (kwota z listy `VOUCHER_AMOUNTS`, wygląd: perun \| wampir \| rusalka \| skrzat) i `stock` (relacja do egzemplarza). Każde pole tylko w swoim typie.
- `ready`: serwer wczytuje egzemplarz, liczy jego cenę (ADR-G002 §7, uzupełnienie 30.10) i **przed zapisem** rezerwuje go na 24 h jednym warunkowym `UPDATE … RETURNING` w SQL (`reserved_until` tylko, gdy egzemplarz jest aktywny i wolny; Postgres blokuje wiersz i sprawdza warunek ponownie) — z dwóch równoczesnych rezerwacji dokładnie jedna dostaje 201, druga 400 `stock` (e2e). `payload.update` z `where` tego nie zapewnia (najpierw czyta, potem zapisuje). Nieudany zapis zapytania zwalnia rezerwację. Zajęty, niewidoczny albo niewyceniany egzemplarz → 400 `stock`.
- `vouchers` (tylko panel): bon wystawiany po wpłacie; kod `XXXX-XXXX` losowany (`crypto`) przy zapisie, statusy ordered → paid → issued → used, relacja do zapytania. PDF bonu — poza G13 (panel).
- Maile: powiadomienie z kwotą, wyglądem, odbiorcą i dedykacją bonu albo z egzemplarzem i terminem rezerwacji; potwierdzenie dla klienta bez odbiorcy i dedykacji (to, co wpisała osoba), z krokami „Co będzie dalej” dla bonu i egzemplarza (`nextSteps()`, teksty robocze — `TODO(krystian)`).
- Strony `/bon` i `/gotowe` za flagami `FEATURE_VOUCHER` / `FEATURE_READY` (zmienne środowiskowe, domyślnie wyłączone). Dlaczego nie pole w panelu: linki w stopce i menu renderuje layout, który nie czyta bazy (strony statyczne i `docker build` bez bazy); zmienna pozwala włączyć strony w CI (e2e) i na stagingu na demo dla szefa bez zmiany kodu. Strony statyczne czytają flagę przy budowie obrazu — w G16 podać ją też jako argument budowy.
- `stock` czyta tylko panel; strona czyta egzemplarze przez Local API (aktywne, pole po polu), więc przy wyłączonej stronie nic o egzemplarzach nie jest publiczne.

## Uzupełnienie 31.10.2026 (G14 — metryka, warsztat, konto, role)
Decyzje Krystiana przy planie G14 i rozstrzygnięcia z kodu.
- **Role w `users`** (`admin` | `serwis`, spec. panelu §15): wszystko, co do G13 było „tylko panel” (oferta, koszty, zapytania, egzemplarze z `stock`, bony, cennik, ustawienia, konta panelu, zadania), jest tylko dla `admin`; `serwis` czyta i zapisuje `orders`, `units`, `tickets`. Migracja `g14_orders_units_customers` nadała istniejącym kontom `admin`, nowe dostają `serwis`; pierwsze konto w pustej bazie (`/admin/create-first-user`) zawsze `admin`. `users` ma jawny dostęp (domyślny Payload „zalogowany = może” wpuściłby klienta).
- **`customers`:** Payload `auth` z `verify` i `forgotPassword` (maile z linkami do `/konto/weryfikacja` i `/konto/haslo`, teksty robocze), 5 prób / 15 min, sesja 7 dni, polityka haseł jak w panelu. **Tworzenie i edycja przez REST tylko `admin`:** pole `_verified` w Payload 3.91 ma dostęp „zalogowany = może”, więc publiczne `create` pozwoliłoby zalogowanemu klientowi założyć „zweryfikowane” konto na cudzy adres. Rejestracja (`POST /api/konto/rejestracja`: honeypot, podpisany czas, limit 5 / 10 min, ta sama odpowiedź dla istniejącego adresu), dane, zapisane konfiguracje i zgłoszenia idą przez własne trasy `/api/konto/*` z listą pól; logowanie, wylogowanie, `me`, weryfikacja i reset hasła zostają w REST Payload.
- **Klient widzi swoje rekordy po e-mailu i tylko po weryfikacji** (decyzja 31.10): reguła `staffOrOwnRecords` — `orders`, `units`, `tickets` z tym samym znormalizowanym e-mailem (małe litery, `trim`; także `inquiries.email` + migracja danych). Pola wewnętrzne (`email`, `customer`, `inquiry`, `checklist`, `workshopNote`) tylko dla zespołu. Konto strony czyta wszystko jako klient (`overrideAccess: false`).
- **`orders`:** numer `Z-RRRR-NNNN` z licznika `order_counters` (jak zapytania), 8 etapów ADR (`offer` = oferta przyjęta, czeka na wpłatę), `stageHistory` i `stageChangedAt` z haka, pola panelu P5 (`dueDate`, `checklist[]` z kluczami stałej `CK` planszy, `workshopNote`), `name`, `email`, `price`. **`publicLabel` nie jest polem:** taśma bierze nazwę i kolor z relacji `build` (zamówienie bez zestawu nie trafia na taśmę). Oś klienta (8 kroków plansz Konto i Metryka) liczy `timeline()` w `lib/orders.ts`.
- **`units`:** kod `XXXX-XXXX-XXXX-XXXX` (16 znaków z alfabetu bez 0/O/1/I/L, `crypto.randomInt`), numer egzemplarza kolejny w obrębie zestawu, `published` (dopiero wtedy działa `/metryka/<kod>`), części z producentem, modelem, SN i gwarancją, test, temperatury, 3 pomiary klatek (`fpsSetup`). `fps-results.unit` (tylko admin) dla rekordów `p`.
- **Taśma warsztatu:** `GET /api/warsztat` i strona główna (ta sama funkcja `loadWorkshop()`, bez JS w przeglądarce) — opłacone zamówienia w warsztacie i wysłane w ostatnich 3 dniach, maks. 12; tylko nazwa zestawu, kolor i etap. Licznik „W warsztacie teraz” na głównej.
- **PDF metryki** = druk z przeglądarki (`@media print`), bez biblioteki (decyzja 31.10). Wykres temperatur z planszy („wykres przykładowy”) pominięty — przechowujemy maksima, nie przebieg.
- **Strony bez plansz** (logowanie, rejestracja, hasło, weryfikacja, `/metryka` bez kodu, puste stany konta): układ z istniejących komponentów, teksty `TODO(krystian)` (decyzja 31.10). „Faktura” i „Ulubione zestawy” z planszy Konto ukryte (brak faktur w systemie; nic na stronie nie dodaje ulubionych).
