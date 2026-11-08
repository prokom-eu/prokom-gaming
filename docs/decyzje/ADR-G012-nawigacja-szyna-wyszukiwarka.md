# ADR-G012 · Nawigacja w nowym wyglądzie, boczna szyna, wyszukiwarka i pasek przewijania

- Status: przyjęta 03.11.2026 (Krystian)
- Spec: `docs/design/prokomgaming/nawigacja/NAWIGACJA.md` · wzorzec: `docs/design/prokomgaming/nawigacja/GamingNawigacja.dc.html`
- Zadania: `docs/zadania/gaming-nawigacja.md` (GN-1, GN-2, GN-3)

## Kontekst
Linie PRO-KOM (Biznes, Instalacje, Software) dostają boczną szynę, wyszukiwarkę i pasek przewijania w kolorach linii (prokom-web, decyzje 02.11). Gaming jest osobną marką z własnym repo i wyglądem (ADR-G001), ale odwiedzający powinien znaleźć te same udogodnienia na każdej stronie PRO-KOM. Dziś nagłówek Gaming ma drobne linki (ok. 12 px), na komputerze nie jest przyklejony, a pasek przewijania jest systemowy i jasnoszary na czarnej stronie. Nie ma też wyszukiwarki, choć klient najczęściej zaczyna od nazwy gry.

## Decyzje
1. **Nawigacja: zmienia się tylko wygląd.** Pozycje, kolejność, adresy i zachowania zostają (spec §0). Linki trafiają do „kapsuły”, aktywna strona dostaje złotą pigułkę z rombem, przyciski są okrągłe, „Dobierz komputer” złoty.
2. **Nagłówek przyklejony na komputerze** z chowaniem przy przewijaniu w dół, tak jak dziś na telefonie. Krystian potwierdza to przy akceptacji planu GN-1. Wariant awaryjny: nagłówek nieprzyklejony.
3. **Boczna szyna od 1400 px na wszystkich stronach** (poza metryką i kontem): 11 sekcji strony głównej z numerami rzymskimi I–XI, bez „Teraz w warsztacie” (decyzja 03.11), „Na tej stronie” na długich podstronach, a na dole Porównanie, Zapytanie i „Do góry”. Te same zasady co w liniach, kod własny.
4. **Wyszukiwarka (Ctrl K) na istniejących danych:** zestawy, gry, strony. Bez nowych kolekcji. Indeks pobierany przy pierwszym otwarciu. Algorytm skopiowany z wyszukiwarki Biznesu (prokom-web), bez wspólnej paczki: osobne repo, inne dane.
5. **Pasek przewijania** ma złoty uchwyt na nocnym torze. `scrollbar-color` stoi tylko w `@supports not selector(::-webkit-scrollbar)`, bo w Chrome 121+ wyłącza style `::-webkit-scrollbar` (ten sam błąd znaleziono w Software).
6. **Ostatnio oglądane istoty** działają za flagą `site-settings.navigation.recentlyViewed`, domyślnie wyłączoną, do opinii prawnika. Tak samo w liniach.
7. **Kolejność:** po starcie 20.11. Wyjątek: GN-1, jeśli zostanie wolny wieczór przed G16 i staging jest zielony. Plan cięcia: GN-3 (wyszukiwarka) może wejść osobno później. Bez niej pozycja „Szukaj” w szynie nie istnieje, a jej miejsce zajmuje „Dobierz komputer”.

## Konsekwencje
- Nowe komponenty: `components/rail/*`, `components/search/*`. Zmienione: `SiteHeader`, `MobileTabBar`, `MenuSheet`, `globals.css`, `tokens.css`, komponenty sekcji strony głównej (tylko `id` i `scroll-margin-top`).
- Nowe zdarzenia Umami: `search_open`, `search_select` (ADR-G009, bez wpisanej frazy).
- Ewentualna migracja: jedno pole flagi w `site-settings` (GN-2), jeśli nie ma grupy `navigation`.
- Lighthouse z G15 nie może spaść. Dialog wyszukiwarki ładujemy leniwie.
