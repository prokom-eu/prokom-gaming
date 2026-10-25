# ADR-G003: Wygląd, ruch i telefon jak aplikacja

- **Status:** przyjęta (wizualizacja v36 zaakceptowana do budowy 25.10.2026; telefon jak aplikacja — wymóg Krystiana 25.10.2026)
- **Data:** 2026-10-25
- **Wzorzec:** `docs/design/prokomgaming/` (README, `tokens.css`, zrzuty `screens/<Plansza>-1440|414/`, stany telefonu `stany/`, plansze `boards/*.dc.html`, grafiki `assets/`)

## 1. Kierunek
Mroczny słowiański las nocą, każda z 16 istot z własnym krajobrazem, podstawą i kolorem. **Odwaga w jednym miejscu:** hero z ogromnym imieniem istoty. Reszta stron spokojna, czytelna, szybka.

Zasady (nie łamiemy bez nowego ADR):
1. Kolor istoty tylko tam, gdzie jest ta istota. **Złoto (Grom `#F2C230`) tylko dla działań** (przyciski, aktywne stany) i drogi „od Skrzata do Peruna”.
2. Numeracja tylko tam, gdzie jest kolejność (jak kupić, proces, kroki formularza i konfiguratora).
3. Ruch tylko jako odpowiedź na działanie albo jeden moment na stronie (hero, potwierdzenie zapytania). Bez wjeżdżania sekcji przy przewijaniu.
4. Bez szablonowych ozdobników: bez wersalikowych napisów nad nagłówkami, bez kropek „·” w opisach, bez strzałek doklejanych do każdego linku.

## 2. Tokeny i kroje
- **Kolory:** wyłącznie z `src/styles/tokens.css` (wartości: `docs/design/prokomgaming/tokens.css`). Tło `--smola #040706`, powierzchnie `--noc #07100e` / `--mech #0c1613`, tekst `--kosc #ece4d0` / `--kosc2 #cdc3ab`, tekst drugorzędny `--mgla #9a9583` (min. kontrast AA na `--smola`), akcja `--grom #F2C230` / `--grom2 #FFE08A` (złoto „Grom”; w starszych dokumentach „Piorun” — to ten sam kolor), linie `--line rgba(236,228,208,.13)`. Kolory 16 istot w `seed/prokomgaming/creatures.json → color`. Wyjątki świadome: Perun (szczyt drogi „od Skrzata do Peruna”) ma kolor złota; dwie pary istot dzielą kolor (Kikimora i Baba Jaga `#B26BFF`, Rusałka i Pani Zimy `#9FE7FF`) — w porównywarce i na wykresach rozróżniamy je pieczęcią i imieniem przy słupku, nie samym kolorem. Etykiety źródeł klatek: test i przeliczone — niebieski `#6E9BF2`/`#8fb0f5`, szacunek — szary `#A8B0BA`/`#b6bcc4`, zmierzone w PRO-KOM — zielony `#5BC23E`/`#7fd56a`.
- **Kroje** (lokalnie przez `next/font`, bez CDN w przeglądarce): **Cinzel** 500–800 — imiona istot i liczby rytualne (poziomy „Moc VII”); **Cormorant Garamond** 500–700 + kursywa — nagłówki i podania (legenda, motto); **Manrope** 400–800 — interfejs i tekst; **Archivo** (szerokość 118, 800) — tylko znak PRO-KOM. Wszystkie z latin-ext.
- Kształt kart: ścięte narożniki (`clip-path`, klasa `.cut` w planszach) dla kart istot i paneli; przyciski pigułki. Promienie i cienie z tokenów.

## 3. Sceny, pieczęcie i zdjęcia
- **Sceny istot jako obrazy, nie SVG z filtrami** (wydajność): `assets/scenes/<id>-hero.webp` (tło hero i nagłówków podstron, 2880×1067), `<id>-card.webp` (miniatury kart, 1680×960, bez komputera), `<id>-fg.webp` (pierwszy plan z przezroczystością do paralaksy). Wyrównanie warstw: tło (2880×1067, panorama 2,7 : 1) — `object-fit: cover`, kotwica dół-środek, na szerokich ekranach odbite lustrzanie; pierwszy plan (2880×2000 = układ odniesienia hero 1440×1000 w 2×) — `cover`, kotwica dół-środek, na całą ramkę hero; obie warstwy w tym samym kontenerze `100svh`. Na produkcji konwersja do AVIF + WebP w rozmiarach `next/image`. Źródło rysunków: plansze `.dc.html` (generator SVG) — przy zmianie sceny eksportujemy obraz ponownie w czacie.
- **Pieczęcie 16 istot:** `assets/sigils/<id>.svg` (z pierścieniem) i `<id>-plain.svg`; kolor przez `currentColor`. Komponent `Sigil`.
- **Zdjęcia komputerów:** na stronie wyłącznie prawdziwe zdjęcia i filmy naszych egzemplarzy, bez renderów AI. Do czasu sesji zdjęciowej: zdjęcia poglądowe z planszy oznaczone „zdjęcie poglądowe” (jak w planszy) albo sylwetka obudowy w kolorze istoty. Zdjęcia obudów i chłodzeń (46) — materiały producentów, `seed/prokomgaming/media/options/<KOD>.webp`.

## 4. Telefon jak aplikacja (wymóg)
Większość klientów wejdzie z telefonu (rodzice i gracze z reklam na Facebooku i TikToku; telefony to ok. 43% ruchu w Polsce wg [StatCounter](https://gs.statcounter.com/platform-market-share/desktop-mobile-tablet/poland), wrzesień 2026). Telefon ma **własną nawigację**, nie zmniejszoną stronę z komputera. Wzór: plansza `boards/Telefon-nawigacja.dc.html` („Telefon jak aplikacja”) i `stany/tel-01…13` i komplet plansz `-telefon` (414 px).

| Element | Zachowanie |
|---|---|
| **Dolny pasek kart** (≤ 760 px, każda strona) | Zestawy · Pod grę · **Konfigurator** (środek, złote koło) · Zapytanie (licznik pozycji) · Menu. Aktywna karta złota z kreską u góry. Wysokość 66 px + `env(safe-area-inset-bottom)`. `nav` z `aria-current`. |
| **Nagłówek** | Znak, porównanie z licznikiem, konto. Chowa się przy przewijaniu w dół, wraca przy przewijaniu w górę. Bez hamburgera i bez „Dobierz komputer” (są w dolnym pasku). |
| **Menu** (karta „Menu”) | Arkusz od dołu (do 92% wysokości): 16 istot w przewijanym rzędzie (pieczęć, imię, cena), 8 kafelków (Gotowe od ręki, Porównywarka, Poradniki, Dla rodziców, Metryka, Konto, Bon, Pytania), linki (O nas, Kontakt, Regulamin, Prywatność), karta kontaktu „Odpowiadamy codziennie 8–22” z Zadzwoń / Napisz. |
| **Arkusze od dołu** | Menu, filtry zestawów, wybór gry i monitora, szczegóły części, błąd zgodności. Zamykanie: tło, krzyżyk, przesunięcie w dół, Esc. Fokus uwięziony w arkuszu i wraca do przycisku. Implementacja: `<dialog>` + własny komponent `BottomSheet`, bez biblioteki. |
| **Paski przyklejone** | Karta zestawu: pieczęć, istota, cena, „Zapytaj o {istotę}”. Konfigurator: cena i „Dalej: {krok}”. Zawsze **nad** dolnym paskiem. |
| **Przewijanie w poziomie** | Istoty na głównej, ścieżki „Od czego zaczynasz”, polecane pod grę, inne istoty, gry (3 rzędy), kroki konfiguratora. `scroll-snap`, kolejna karta zagląda z prawej, bez widocznych pasków. |
| **Dotyk** | Cele min. 44 px (pola wyboru w formularzu 48 px), ważne akcje w dolnej połowie ekranu, brak hover-only. |
| **Tablet 761–1000 px** | Pełny nagłówek z hamburgerem; to samo menu jako panel z prawej. Bez dolnego paska. |

Odbiór każdej sesji z UI: zrzuty Playwright 1440 i 414 porównane z `screens/`, stany z `stany/`, Lighthouse mobile ≥ 90, axe, test na prawdziwym Androidzie i iPhonie.

## 5. Ruch
- **Hero:** na komputerze zmienia istotę co 7 s; staje, gdy kursor jest nad sceną, po kliknięciu i przy `document.hidden`. **Na telefonie bez autoprzełączania** (tylko po dotknięciu). Paralaksa tylko kursorem na komputerze.
- Wysokość hero `100svh`; skala w jednostkach kontenera (`cqw/cqh`), układ odniesienia 1440×1000; na szerokich ekranach scena się poszerza (zrzuty 1920, 2560, 3440 w `screens/Main-*` planszy).
- **`prefers-reduced-motion`:** bez animacji scen, paralaksy i przejść; arkusze pojawiają się bez przesuwu.
- Na telefonie lżejsze sceny (jedna warstwa tła + pierwszy plan, bez paralaksy), ładowane leniwie poza hero.
- Jedyna „scena” poza hero: potwierdzenie zapytania (pieczęć istoty budzi się — rozbłysk, pierścień, znak potwierdzenia).

## 6. Wydajność (budżet)
LCP ≤ 2,5 s i CLS ≤ 0,1 na telefonie; JS strony głównej ≤ 170 KB gzip poza hero; obrazy w rozmiarze ekranu (AVIF/WebP), `priority` tylko dla tła hero; czcionki z `preload` i `display: swap`; sceny innych istot dociągane dopiero po wyborze.

## Konsekwencje
- Komponenty: `SiteHeader`, `MobileTabBar`, `MenuSheet`, `BottomSheet`, `StickyBar`, `HScroll`, `Sigil`, `Scene`, `CreatureCard`, `FpsList`, `SourceLabel`, `Segmented`, `Chip`, `PriceTag`.
- Każda zmiana wyglądu: najpierw plansza w wizualizacji (czat), potem nowe zrzuty do `docs/design/`, dopiero potem kod.
