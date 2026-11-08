# Wzorzec wyglądu panelu PRO-KOM Gaming (wizualizacja v8, 30.10.2026)

Cel wizualny dla widoków `/admin` (ADR-G006). **Nie jest to kod do przeniesienia** — plansze `.dc.html` to prototyp w innej architekturze; odtwarzasz efekt jako własne widoki Payload z komponentami `src/admin/ui/` i tokenami `src/admin/styles/panel-tokens.css` (spec. panelu §2).

Oryginał (płótno Claude Design, zaakceptowane przez Krystiana 30.10.2026): https://claude.ai/artifact/DRGAqqwH5xmSvNWbQpHeCi

## Zawartość
| Folder | Co | Jak używać |
|---|---|---|
| `screens/<Ekran>-1440/NN.jpg` | zrzuty pełnego widoku 1440 px, cięte co 1400 px | wzorzec desktopu |
| `screens/<Ekran>-414/NN.jpg` | ten sam widok przy 414 px, cięty co 1600 px | wzorzec telefonu (Krystian odpowiada klientom z telefonu) |
| `stany/tel-01…10-*.jpg` | telefon 414×896 @2x, pierwszy ekran: 01 pulpit, 02 zapytania, 03 wątek i odpowiedź, 04 menu „Więcej”, 05 zatwierdzanie z akcją pod kciukiem, 06 edytor zestawu z ceną pod kciukiem, 07 warsztat (kolumny przesuwane), 08 centrum cen, 09 klient, 10 statystyki | zachowanie „jak aplikacja” (spec. §2a) |
| `screens/Telefon-414`, `TelefonZapytanie-414`, `TelefonWiecej-414` | pełne strony stanów telefonu (pulpit, wątek, otwarte „Więcej”) | dolne zakładki widać na końcu zrzutu (na urządzeniu są przyklejone) |
| `boards/*.dc.html` | klikalne plansze (otwórz przez lokalny serwer, np. `npx serve boards`; czcionki z internetu; **okno ≤ 760 px = tryb telefonu**, w Chrome: narzędzia deweloperskie → widok urządzenia) + `img/` (zdjęcia obudów i chłodzeń z seedu) + `support.js` | teksty 1:1, wartości CSS, zachowanie (filtry, szablony, strażnik marży na żywo, edytor zestawu) |

## Ekran → plansza → sesja
| Widok | Adres | Plansza | Sesja |
|---|---|---|---|
| Pulpit „Dziś” | `/admin` | `Main`, `Telefon` | P2 |
| Zapytania (skrzynka + wątek) | `/admin/zapytania` | `Zapytania`, `TelefonZapytanie` | P3, P4 |
| Karta klienta | `/admin/klient` | `Klient` | P5 |
| Zamówienia i warsztat | `/admin/zamowienia` | `Zamowienia` | P5 |
| Statystyki strony | `/admin/statystyki` | `Statystyki` | P8 |
| Raport sprawdzenia cen | `/admin/raporty-cen/<id>` | `Raport` | P7 |
| Centrum cen | `/admin/ceny` | `Ceny` | P6 |
| Do zatwierdzenia | `/admin/ceny/zatwierdzanie` | `Publikacja` | P6 |
| Gotowe zestawy | `/admin/zestawy` | `Zestawy` | P6 |
| Edytor zestawu | `/admin/zestawy/<slug>` | `Zestaw` | P6 |
| Opcje konfiguratora | `/admin/opcje` | `Opcje` | P6 |
| Ustawienia | `/admin/ustawienia` | `Ustawienia` (sekcja „Powiadomienia na telefon” bez planszy) | P1 (szkielet), sekcje w P3/P4/P5/P7/P8 |
| Klienci (lista), Raporty cen (lista) | `/admin/klienci`, `/admin/raporty-cen` | bez planszy — `DataTable` jak w Centrum cen | P5, P7 |
| Telefon: powłoka (pasek aplikacji, zakładki, „Więcej”) | wszystkie, ≤ 760 px | każda plansza w wąskim oknie, `TelefonWiecej`, `stany/tel-04` | P1 |
| Telefon: pulpit / wątek | `/admin`, `/admin/zapytania?nr=` | `Telefon`, `TelefonZapytanie` | P2, P3 |

## Co jest prawdziwe, a co przykładowe
- **Prawdziwe (partia 1, 25.10.2026):** ceny zestawów i opcji, koszty, marże, liczba konfiguracji (85 134 z kompletem części), części poziomów mocy, zdjęcia. Strażnik na planszy `Publikacja` i edytor `Zestaw` liczą tak jak `lib/pricing` (sprawdzone: Bazyliszek 11 930 zł; najsłabsza konfiguracja 11,09% → 9,23% → 11,17%).
- **Scenariusz zmiany cen** (RAM DDR5 +8%, DDR4 +4%, SSD −5%, RTX 5070 Ti −4%, RX 9070 XT +2,5%, NZXT H9 niedostępna) — **symulacja** do pokazania raportu i kolejki, nie odczyt ze sklepów.
- **Przykładowe:** zapytania, klienci, zamówienia, wiadomości, liczby ruchu i lejka, daty zdarzeń. W kodzie zawsze z bazy, Umami i `lib/pricing`, nigdy z planszy.
- Teksty interfejsu (etykiety, przyciski, puste stany, treść 4 szablonów odpowiedzi w stałej `TPL` planszy `Zapytania`) przenosisz bez zmian.

## Uwagi do wzorca
- Panel ma własny, ciemny wygląd „roboczy” — złoto i kroje (Manrope, Cinzel tylko w nazwach zestawów) jak na stronie, bez scen i ruchu strony. Kolory istot wyłącznie z `src/styles/tokens.css`.
- W panelu wolno pokazywać producentów i modele części (`internalModel`) — to widok wewnętrzny. Na stronie nadal obowiązuje zasada ze spec. strony (producenci tylko przy obudowach i chłodzeniach).
- Kontrast (sprawdzony, tła `--bg` / `--s1` / `--s2` / `--s3`): `--mu` 6,6 / 6,1 / 5,7 / 5,3 · `--tx2` 10,2–8,2 · `--tx` 15,5–12,5 · złoto 11,7–9,4 · `--ok` 10,5–8,4 · `--bad` 7,7–6,2 · `--warn` 9,6–7,7 · `--info` 9,6–7,7 · tekst na złotym przycisku 11,7. Wszystko ≥ 4,5 (AA). `--mu` tylko do opisów pomocniczych, nie do liczb.
- **Telefon:** na planszach tryb telefonu robi CSS (`@media (max-width:760px)`) i mały skrypt (etykiety kart tabel z nagłówków, tytuł paska po przewinięciu). W kodzie to samo robi `PanelShell` i `DataTable` (spec. §2a) — bez wykrywania urządzenia.
- „Na żywo” w planszach (strażnik, „Co jeśli?”, edytor) liczy w przeglądarce na danych osadzonych w pliku — w kodzie dane przychodzą z serwera tylko do panelu (koszty nigdy nie trafiają na stronę).
