# ADR-003: Skrzynka zapytań w październiku 2026 — kolekcja w Payload za stałym kontraktem

- **Status:** przyjęta
- **Data:** 2026-10-12, decyzja 2026-10-13
- **Decyduje:** Krystian

## Kontekst
Docelowo zapytania żyją w PRO-KOM System (Django, styczeń 2027). Pierwsza strona startuje 26.10.2026 i od pierwszego dnia żadne zapytanie nie może zginąć. Fundament i strona Biznes powstają w jednym, bardzo ciasnym oknie, budowane przez jedną osobę.

## Opcje
| Opcja | Zalety | Wady |
|---|---|---|
| A. **Kolekcja `Inquiries` w Payload** za stałym kontraktem | jedna aplikacja, jedno wdrożenie; kilka godzin pracy | w styczniu migracja danych do Django (małe dane: dziesiątki–setki rekordów) |
| B. Zalążek PRO-KOM System w Django | dane od początku w docelowym miejscu | druga aplikacja, baza, wdrożenie i API w najciaśniejszym tygodniu |
| C. Tylko e-mail | zero pracy | brak historii, statusów i liczb — odpada |

## Decyzja
**Opcja A.** Przy jednej osobie liczba ruchomych części w tygodniu wdrożenia jest ważniejsza niż docelowe umiejscowienie danych. Stabilna ma być **granica**, nie miejsce zapisu:

- Wszystkie formularze wysyłają dane do `POST /api/inquiry`; logika w jednej funkcji `submitInquiry()` w `lib/inquiry`.
- Schemat danych (Zod) jest **1:1 z przyszłym modelem `Inquiry` w Django**:
  - `tenant` (strona), `line` (linia), `category` (opcjonalnie), `source` (URL strony, UTM: source/medium/campaign),
  - `company` (opcjonalnie), `nip` (opcjonalnie, walidacja sumy kontrolnej), `name`, `email`, `phone` (co najmniej jedno z dwóch), `message`,
  - `consent`: `{ accepted: true, clauseVersion, acceptedAt }`, `marketingConsent` (osobno, domyślnie false),
  - systemowe: `status` (`new` → `in_progress` → `closed`), `createdAt`.
- Ochrona: honeypot, minimalny czas wypełnienia, limit zgłoszeń na adres IP (licznik w pamięci/bazie, **bez trwałego zapisu pełnego IP**).
- Po zapisie: powiadomienie e-mail (SMTP z `.env`) do adresu z ustawień tenanta + potwierdzenie dla klienta z obiecanym czasem odpowiedzi.
- Panel: kolekcja tylko do odczytu, edytowalne wyłącznie pole `status`; filtr po linii i statusie. Publicznie: tylko tworzenie przez endpoint, brak odczytu.
- Retencja (RODO): zapytania bez dalszej współpracy — usuwane po 24 miesiącach (do potwierdzenia przy polityce prywatności). Szczegóły — sekcja „Retencja” niżej.

## Retencja i prawa osób (uzupełnienie 2026-10-15)
- **Okres:** zapytanie o statusie `closed` jest usuwane trwale po okresie retencji liczonym od ostatniej zmiany statusu. Wartość w env (`INQUIRY_RETENTION_MONTHS`, domyślnie 24), żeby zmiana po decyzji przy polityce prywatności nie wymagała zmiany kodu. Zapytania `new` i `in_progress` nie są usuwane automatycznie.
- **Mechanizm:** zadanie cykliczne raz na dobę (mechanizm zadań Payload, bez nowych usług), z wpisem w logach: ile rekordów usunięto (bez danych osobowych).
- **Usunięcie na żądanie** (prawo do usunięcia danych): akcja w panelu tylko dla roli `admin`; zostaje ślad „kto, kiedy, ID rekordu”, bez treści zapytania.
- **Kopie zapasowe:** usunięte rekordy znikają z kopii wraz z ich rotacją — opisujemy to w polityce prywatności. **Uzupełnienie 17.10.2026 (S9b-2):** retencja kopii po wieku pliku: `daily` 14 dni, `monthly` 93 dni, `predeploy` (przed wdrożeniem produkcji) 30 dni — usunięte zapytanie znika ze wszystkich kopii najpóźniej po ok. 3 miesiącach (`docs/wdrozenia.md`). Kopie są szyfrowane (`age`).
- **Logi:** dane osobowe z zapytań nigdy nie trafiają do logów ani do Sentry.
- **Migracja 2027:** te same zasady przechodzą do PRO-KOM System razem z modelem `Inquiry`.

## Obsługa zapytań do czasu PRO-KOM System (uzupełnienie 2026-10-16)
- Każda linia ma własną skrzynkę i jest ona adresem powiadomień tenanta (`Tenants.notificationEmail`, ustawiany w panelu, nie w kodzie): `biznes@pro-kom.eu`, `instalacje@pro-kom.eu`, `software@pro-kom.eu`. Hub pro-kom.eu: TODO(krystian): skrzynka do decyzji.
- Zapytania na bieżąco obsługują **Krystian i szef**, obaj mają te skrzynki w Thunderbirdzie. Rekord w `Inquiries` zostaje źródłem prawdy i zabezpieczeniem (mail może nie dojść, rekord zostaje).
- Powiadomienie ma ułatwiać pracę w programie pocztowym: `Reply-To` = e-mail klienta (gdy podany), temat z linią i kategorią, w treści wszystkie pola formularza i link do rekordu w panelu.
- Skrzynki powstają dziś u obecnego dostawcy poczty pro-kom.eu — muszą wejść do listy skrzynek przy migracji poczty do Seohost (ADR-002).

## Typy formularzy i reguły pól (uzupełnienie 2026-10-24, B8)
Kontrakt `POST /api/inquiry` rozszerzony o formularze prokombiznes.pl (ADR-012 §3, spec. §8.4). Pola i reguły są w `lib/inquiry/schema.ts` (Zod) i przechodzą 1:1 do modelu `Inquiry` w PRO-KOM System.
- **Nowe pola:**
  - `type`: `contact` (domyślny, więc formularze innych linii działają bez zmian) / `list` (lista zapytania) / `wizard` (kreator) / `search` („Zapytaj o X”);
  - `items[]`: `{ slug, quantity ≤ 999, note ≤ 500 }`, maks. 50 pozycji, tylko w typie `list`. Serwer dopasowuje slugi do opublikowanych produktów **tego tenanta** i zapisuje `{ product, nameSnapshot }` z bazy. Nieznane slugi pomija. Lista bez żadnej znanej pozycji jest odrzucana;
  - `city` (Miejscowość), `preferredContact` (`phone` / `whatsapp` / `email`; dawne „Obojętnie” usunięte), `deadline`, `topics[]` (fraza „Zapytaj o X”), `wizard` (JSON odpowiedzi, ≤ 8 tys. znaków).
- **Wymagalność:**
  - zawsze `name` i zgoda;
  - `message` — tylko dla `contact`; w `list` i `search` to opcjonalne uwagi (treść niosą pozycje albo fraza, plansza Zapytanie);
  - e-mail — gdy `preferredContact` = `email` (bez adresu biuro nie ma jak odpisać);
  - telefon — na linii Biznes we wszystkich typach poza `wizard` (ZMIANY-v20 §2.9, plansza Zapytanie, decyzja Krystiana 24.10.2026); na pozostałych liniach nadal „e-mail lub telefon”. Linię bierze serwer z tenanta, nigdy z treści żądania.
- **Odpowiedź 201** zwraca `{ ok, number }`: numer zgłoszenia (np. `PKB-2026-0042`) do ekranu sukcesu.
- **Maile:** w temacie numer zgłoszenia i rodzaj formularza (poza kontaktem). W powiadomieniu pozycje (ilość × nazwa — uwaga), odpowiedzi kreatora i nowe pola. Potwierdzenie dla klienta ma numer i nazwy pozycji, ale nie zawiera uwag ani wiadomości (adres może nie należeć do nadawcy).

## Kreator (uzupełnienie 2026-10-24, B10c)
Zmienia dwie reguły z uzupełnienia B8 dla typu `wizard` (spec. §6.8, decyzja Krystiana 24.10.2026):
- **Odpowiedzi, nie wynik:** przeglądarka wysyła w `wizard` tylko odpowiedzi (rodzaj firmy, skala, lokal, potrzeby, „Na kiedy?”). Serwer sprawdza je z regułami kreatora tego tenanta (`BiznesSettings.wizard`), liczy zestaw tą samą funkcją co podgląd (`lib/catalog/wizardKit.ts`) i zapisuje:
  - `items` — opublikowane produkty tenanta z zestawu, z ilością (np. kasa × liczba stanowisk);
  - `wizard` — podsumowanie po polsku („Rodzaj firmy: …”, „Zestaw: …”, „W cenie: …”);
  - `deadline` — „Na kiedy?”.
  Odpowiedzi spoza reguł albo tenant bez reguł → 400 `invalid` z polem `wizard`. `wizard` w innych typach jest odrzucane (jak `items` poza listą).
- **Telefon:** na linii Biznes wymagany we wszystkich typach, także `wizard` (plansza Kreator: Imię \*, Telefon \*).

## Konsekwencje
- Styczeń 2027: `submitInquiry()` zapisuje do API PRO-KOM System; jednorazowy skrypt migruje istniejące rekordy. Formularze bez zmian.
- Zasada „Payload tylko treści” ma świadomy, czasowy wyjątek — kolekcja `Inquiries` zostanie usunięta po migracji.
