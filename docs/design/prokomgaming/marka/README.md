# Znak PRO-KOM Gaming

- `prokom-gaming-znak-ciemne.svg` — znak na ciemne tło (przezroczyste tło, kolory z tokenów: `--kosc`, `--grom`, `--kosc2`). Do kafelka „PRO-KOM Gaming” w pasie linii w `prokom-web` (`docs/zadania/gaming-marka-prokom.md`).
- Litery zamienione na ścieżki — plik nie potrzebuje fontów. Układ jak `.logo` w `src/app/(site)/globals.css`: „PRO–KOM” w Archivo 800 / szerokość 118 (podzbiór `src/app/(site)/fonts/archivo-logo.woff2`), „GAMING” w Manrope 800 ze światłem 0,32 em. Oba kroje na licencji OFL — znak jako obraz jej nie podlega.
- Zmiana logo na stronie = nowy plik z tego samego układu (fontTools: obrys glifów przez `SVGPathPen`).
- Ikona strony `src/app/(site)/icon.svg` (zakładka przeglądarki), `apple-icon.png` (180 px, ekran główny iPhone’a) i `public/logo-512.png` (logo w danych strukturalnych `Organization`) — „P–K” z tego samego kroju na tle `--noc`. Szkic z G15 (`TODO(krystian)`: do akceptacji przed G16).
