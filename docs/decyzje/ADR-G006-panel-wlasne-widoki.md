# ADR-G006: Panel jako własne widoki Payload `/admin`, wspólny język wyglądu panelu

- **Status:** przyjęta (Krystian, 30.10.2026 — akceptacja wizualizacji panelu)
- **Data:** 2026-10-30
- **Spec:** `docs/strony/prokomgaming-panel.md`

## Kontekst
Krystian sam obsługuje sprzedaż, ceny, ofertę i warsztat. Domyślne listy Payload wystarczają do edycji rekordów, ale nie do codziennej pracy: „co mam teraz zrobić”, odpowiedź klientowi, marża po zmianie kosztów, warsztat. G4 dodał już jeden własny widok (`/admin/ceny`, `admin.components.views.prices`).

## Opcje
| Opcja | Plusy | Minusy |
|---|---|---|
| **A. Własne widoki w Payload `/admin`** | jedna aplikacja, jedno logowanie, dostęp do Local API i `lib/pricing` po stronie serwera, wzór już działa (G4) | trzeba pilnować dostępu w każdym widoku (widoki własne są publiczne z definicji) |
| B. Osobna aplikacja panelu (Next/Django) | pełna swoboda | drugie logowanie, drugi model danych, dwa wdrożenia |
| C. Tylko domyślne listy Payload + pola | najmniej pracy | brak skrzynki, pulpitu, strażnika na żywo, tablicy warsztatu |

## Decyzja
**Opcja A.**
1. Własne widoki rejestrowane w `admin.components.views` (jak `prices` z G4), komponenty przez import map (bez importu w `payload.config.ts` — warstwa kosztów musi zostać poza konfiguracją CLI). Dashboard zastąpiony Pulpitem. Sprawdź w dokumentacji zainstalowanej wersji: widoki główne, `exact` i kolejność widoków z podścieżkami, dashboard, nawigacja (grupy z własnymi widokami i licznikami najpewniej wymagają własnego `admin.components.Nav`), własny CSS panelu, ukrycie paska bocznego na telefonie (spec. §2a).
2. Kod panelu w `src/admin/<obszar>/` (`dashboard`, `inquiries`, `clients`, `orders`, `prices`, `builds`, `options`, `settings`, `stats`), wspólne komponenty w `src/admin/ui/`, tokeny w `src/admin/styles/panel-tokens.css`. Widoki są komponentami serwerowymi; interakcja przez małe komponenty klienckie i akcje serwera (`'use server'`) z kontrolą roli.
3. **Każdy widok i każda akcja sprawdza dostęp po stronie serwera** (`initPageResult.req.user` + rola), test e2e na niezalogowanego i rolę `serwis`.
4. Domyślne listy i formularze kolekcji zostają (grupa „Dane”), jako widok zaawansowany i awaryjny. Własne widoki nie dublują logiki zapisu: zapis przez Local API z hakami kolekcji (haki z G3/G4 nadal pilnują, np. blokada usuwania części z zestawu).
5. Wygląd: tokeny i komponenty z §2 specyfikacji, kroje jak na stronie. Kolory istot tylko z `tokens.css` strony.

## Konsekwencje
- Panel rośnie razem z kolekcjami, bez nowej infrastruktury.
- Ryzyko: widok bez kontroli dostępu ujawnia koszty — dlatego test e2e na każdy nowy widok (kryterium §18.4 spec.).
- Aktualizacja Payload może zmienić API widoków — przy podnoszeniu wersji (razem z `prokom-web`) przejść testy e2e panelu.
