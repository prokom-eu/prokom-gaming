# ADR-G011: Ceneo jako główne źródło cen rynkowych

- **Status:** przyjęta (Krystian, 01.11.2026: „chcę, żeby Ceneo było włączone i żeby sprawdzanie było dobrze zrobione”)
- **Data:** 2026-11-01
- **Decyduje:** Krystian
- **Zmienia:** ADR-G007 §2 pkt 2–3 i §5 („bez Ceneo”, uzupełnienie 01.11.2026 (2))

## Kontekst
Pełne sprawdzanie z 01.11.2026 (raport #19) znalazło ceny dla 31 z 94 pozycji. Przyczyny:
- wyszukiwanie szukało tylko pozycji bez żadnej działającej oferty, więc pozostałych sklepów już nie sprawdzało;
- przy kartach graficznych, obudowach i płytach głównych wyszukiwarka często nie zwracała strony produktu w sklepie;
- Komputronik blokuje pobieranie strony przez narzędzie Claude (12 z 12 odczytów nieudanych);
- Ceneo było wyłączone, bo narzędzie Claude dostawało pustą stronę.

Test 01.11.2026 pokazał, że strona produktu Ceneo (`https://www.ceneo.pl/<numer>`) pobrana **zwykłym zapytaniem z serwera** zawiera od razu około 15 ofert, przy każdej sklep, cenę i czas wysyłki. Pusta była tylko w narzędziu web fetch. `robots.txt` Ceneo zabrania automatom wyszukiwarki (`/;szukaj`) i przekierowań, ale nie stron produktów.

## Opcje
| Opcja | Zalety | Wady |
|---|---|---|
| A. Zostać przy linkach do sklepów czytanych przez Claude | bez nowego źródła | niepełne (31/94), Komputronik zablokowany, każdy odczyt kosztuje |
| B. Ceneo czytane przez Claude (web fetch) | jeden mechanizm | narzędzie dostaje pustą stronę |
| **C. Ceneo pobierane przez nasz serwer i parsowane w kodzie; Claude tylko znajduje stronę produktu** | jedna strona = wiele sklepów, odczyt bez kosztu, wynik deterministyczny, Komputronik widoczny przez Ceneo | zależność od układu HTML Ceneo (test na zapisanych stronach); regulamin Ceneo do sprawdzenia |

## Decyzja
**C.**
1. **Znalezienie strony:** dla każdej pozycji z kosztem rynkowym, która nie ma jeszcze strony Ceneo, Claude (Sonnet 5.5, `web_search` tylko w `ceneo.pl`, najwyżej 2 wyszukiwania) podaje do 3 kandydatów. Kod pobiera je i wybiera pierwszą stronę, której tytuł zgadza się z modelem (`titleMatches`). Muszą się zgadzać wszystkie oznaczenia z cyframi i słowa wariantu (Ti, XT, biała, Tray/OEM, BOX…). Strona **włącza się sama** tylko wtedy, gdy tytuł się zgadza, a najtańsza dostępna oferta zaufanego sklepu mieści się w `outlierPct` od obecnego kosztu (ten sam warunek co w ADR-G007). W innym wypadku czeka na Krystiana jako propozycja. Brak wyniku jest zapamiętywany na 14 dni, żeby nie płacić co przebieg za to samo wyszukiwanie.
2. **Odczyt:** serwer pobiera strony Ceneo jedna po drugiej, z przerwą 2 s, i przedstawia się w nagłówku `User-Agent` jako `PRO-KOM-Gaming-PriceCheck/1.0 (+adres strony)`. Czyta tylko to, co Ceneo pokazuje na stronie („wybrane oferty”, zwykle ok. 15). **Nie** korzysta z wewnętrznych adresów, którymi strona dociąga resztę ofert w przeglądarce, i nie obchodzi żadnych zabezpieczeń.
3. **Liczą się tylko zaufane sklepy** z Ustawień (domyślnie x-kom, Morele, Komputronik, Sferis; Krystian może dopisać np. Media Expert). Allegro, Amazon i nieznane sklepy są pomijane. Na stronie RX 9070 XT najtańszy był Amazon, o 600 zł poniżej reszty. Oferta jest „dostępna” przy wysyłce do 3 dni (data wysyłki: do 5 dni kalendarzowych). Koszt rynkowy liczy się jak dotąd (`lowest` / `avg2`) i dalej obowiązuje reguła „faktura nie jest nadpisywana”.
4. **Linki do sklepów zostają jako uzupełnienie.** Claude czyta je jak dotąd, ale **pomija sklep, którego ofertę strona Ceneo już podała** dla tej pozycji. Wyszukiwanie w sklepach działa dla pozycji, które po Ceneo nadal nie mają ceny.
5. Wszystko dalej przechodzi przez „Przyjmij propozycje” → „Do zatwierdzenia” → strażnika marży → publikację ręczną. Nic nie trafia na stronę samo.

## Konsekwencje
- Koszt: pierwszy przebieg ok. 5–8 USD (wyszukiwanie stron Ceneo), kolejne głównie odczyty bez kosztu, więc ok. 1–2 USD (sklepy spoza Ceneo i podsumowanie).
- Czas: około 100 stron Ceneo po 2 s to około 4 minuty. Limit przebiegu (30 min) zostaje.
- Wyszukiwania na przebieg: najwyżej 100, z tego do 70 na Ceneo, żeby pozycje, których nie ma na Ceneo, były szukane w sklepach w tym samym przebiegu. Odczyt zapisanych stron Ceneo trwa najwyżej 10 min. Gdy 5 stron z rzędu nie przychodzi, Ceneo jest pomijane do następnego przebiegu, a sklepy i tak są czytane.
- „Nie znaleziono na Ceneo” zapisuje się tylko wtedy, gdy wyszukiwanie zadziałało i nic nie zwróciło. Błąd API, niedostępna strona albo przeniesiony produkt nie blokują pozycji: jest szukana ponownie w kolejnym przebiegu.
- **Ryzyko — regulamin Ceneo:** robots.txt pozwala na strony produktów, ruch jest znikomy (około 100 stron kilka razy w tygodniu), ale regulamin serwisu może zabraniać automatycznego pobierania danych. `TODO(krystian):` sprawdzić regulamin i potwierdzić z szefem. Jeśli Ceneo zablokuje pobieranie albo trzeba będzie zrezygnować, sprawdzanie wraca do linków sklepowych bez zmian w kodzie: wystarczy wyłączyć linki Ceneo.
- **Ryzyko — zmiana HTML Ceneo:** parser jest testowany na zapisanych stronach (`tests/fixtures/ceneo-*.html`). Gdy Ceneo zmieni układ, raport pokaże „Ceneo: brak ofert zaufanych sklepów” przy wielu pozycjach i parser trzeba będzie poprawić.
- Komputronik bywa poza „wybranymi ofertami” Ceneo. Wtedy jego cena po prostu się nie liczy.
