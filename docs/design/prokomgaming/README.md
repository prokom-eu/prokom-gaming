# Wzorzec wyglądu PRO-KOM Gaming (wizualizacja v36, 25.10.2026)

Cel wizualny dla kodu. **Nie jest to kod do przeniesienia** — plansze `.dc.html` to prototyp w innej architekturze; odtwarzasz efekt w Next.js/React wg ADR-G003.

## Zawartość
| Folder | Co | Jak używać |
|---|---|---|
| `screens/<Plansza>-1440/NN.jpg` | zrzuty pełnej strony 1440 px, cięte co 1400 px | wzorzec desktopu |
| `screens/<Plansza>-414/NN.jpg` | zrzuty pełnej strony 414 px (telefon), cięte co 1600 px | wzorzec telefonu; dolny pasek kart widać na końcu strony (na urządzeniu jest przyklejony) |
| `screens/Main-hero-<szerokość>/01.jpg` | hero strony głównej przy 1536, 1920, 2560, 3440 i tablet 820 | skalowanie hero (ADR-G003 §5) |
| `stany/tel-01…13-*.jpg` | stany telefonu 390×844 @2x: 01 start, 02 menu, 03 zestawy, 04 filtry, 05 karta zestawu, 06 klatki (etykieta źródła pod paskiem), 07–08 konfigurator (moc, obudowa), 09–10 dobór pod grę, 11 zapytanie, 12 wysłane, 13 porównywarka | zachowanie „jak aplikacja” |
| `stany/konf-1…6.jpg` | konfigurator 1440 — każdy z 6 kroków | wyszarzenia z powodem, dopłaty, podgląd, klatki, cena |
| `stany/tablet-menu.jpg` | tablet 820: menu jako panel z prawej | |
| `boards/*.dc.html` | klikalne plansze (otwórz w Chrome; czcionki z internetu) + `img/` | teksty 1:1, wartości CSS, animacje, zachowanie interakcji |
| `assets/scenes/<id>-hero.webp` | tło sceny istoty 2880×1067 (hero, nagłówki podstron) | konwersja do AVIF/WebP przez `next/image` |
| `assets/scenes/<id>-card.webp` | scena do kart 1680×960, bez komputera | miniatury zestawów (komputer = zdjęcie na wierzchu) |
| `assets/scenes/<id>-fg.webp` | pierwszy plan z przezroczystością, 2880×2000 (= ramka hero 1440×1000 w 2×) | warstwa paralaksy w hero (tylko desktop); wyrównanie: ADR-G003 §3 |
| `assets/sigils/<id>.svg`, `<id>-plain.svg` | pieczęcie 16 istot (z pierścieniem / bez) | komponent `Sigil`, kolor przez `currentColor` |
| `tokens.css` | kolory, kroje, kształty, kolory istot | 1:1 do `src/styles/tokens.css` |

`<id>` istoty: skrzat, licho, bies, wodnik, strzyga, kikimora, zmora, rusalka, baba, bazyliszek, zima, wilkolak, wampir, weles, zmij, perun (adresy stron używają `slug` z `seed/prokomgaming/creatures.json`, np. `baba-jaga`, `pani-zimy`).

## Plansze → strony
Main (1920) · Laptop (1536) · Monitor27 (2560) · Ultrawide34 (3440) · Tablet (820) · Telefon (414) = ta sama strona główna. Każda podstrona ma parę `<Plansza>.dc.html` (1440) i `<Plansza>-telefon.dc.html` (414; dla stron bez własnego generatora to ta sama strona w podglądzie 414). `Telefon-nawigacja.dc.html` — plansza „Telefon jak aplikacja”: zasady i 13 stanów telefonu. `Obudowa.dc.html` — sylwetka obudowy (zastępczy rysunek, gdy brak zdjęcia). Mapa adresów: spec. §2.

## Kontrast (sprawdzone)
Na tle `--smola` / `--mech`: `--mgla` 6,7 / 6,1 · `--kosc2` 11,6 / 10,5 · `--kosc` 16,0 / 14,5 · etykiety źródeł 9,3–11,2 · złoto 12,1. Tekst na złotym przycisku (`--on-grom`) 11,0. Wszystko ≥ 4,5 (AA).

## Uwagi do wzorca
- Ceny, klatki i części na planszach pochodzą z danych 25.10.2026 — w kodzie zawsze z `seed/` i `lib/pricing/`, nie z planszy.
- Zdjęcia komputerów na planszach są **poglądowe** (zdjęcia produktowe z filtrem koloru). Na stronie tylko prawdziwe zdjęcia naszych egzemplarzy.
- Linki między planszami prowadzą do plików `.dc.html` — w kodzie adresy ze spec. §2.
- Miejsca w nawiasach kwadratowych to dane do uzupełnienia (spec. §26).
- Na planszach mogą zostać pojedyncze stare sformułowania; przy sprzeczności wygrywa specyfikacja (np. brak rat, etykiety źródeł z ADR-G004).
