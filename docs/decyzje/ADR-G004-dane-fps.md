# ADR-G004: Dane FPS — prawdziwe testy z etykietą źródła, strona nie liczy klatek

- **Status:** przyjęta (uzupełnienia: G0 25.10.2026 — źródło rekordów `p`, §5; G5 26.10.2026 — `games.settingNote`, §5–§6, etykiety źródeł z nazwą platformy testowej, §6)
- **Data:** 2026-10-25
- **Dane:** `seed/prokomgaming/fps.json` (wartości) i `seed/prokomgaming/fps-sources.json` (źródło każdej liczby); arkusz kontrolny u Krystiana: `dane/PRO-KOM_FPS_zestawow_2026-10-25.xlsx`.

## 1. Zasada
Klatki na stronie pochodzą z **niezależnych testów**: każda liczba `m` i `r` ma źródło i link do testu bazowego; `e` (szacunek) ma opis metody, bez linku. Gdzie testu brak, pokazujemy **szacunek i tak go nazywamy**. Nie gwarantujemy klatek (regulamin, FAQ). Po złożeniu egzemplarza mierzymy 3 gry w serwisie — wynik PRO-KOM zastępuje inne źródła.

## 2. Rodzaje liczby
| Kod | Etykieta na stronie | Kiedy |
|---|---|---|
| `p` | zmierzone w PRO-KOM | pomiar w serwisie na naszym egzemplarzu (najwyższy priorytet) |
| `m` | test niezależny | wynik z testu tej samej karty w tej samej rozdzielczości; procesor zestawu nie ogranicza |
| `r` | przeliczone z testów | z testów tej samej gry (wyjątek: Warzone z testu Black Ops 7), przeliczone: RX 9070 GRE przez karty wspólne, limit procesora, brakująca karta albo rozdzielczość (gdy wynik bazowy jest testem, nie szacunkiem) |
| `e` | szacunek | brak niezależnego testu tej gry z naszymi kartami |

Stan 25.10.2026 (po przeglądzie): 33 gry × 16 zestawów × 3 rozdzielczości = **1 584 liczby**: `m` 833, `r` 187, `e` 564. Call of Duty: Warzone ma wyłącznie `r`/`e` — liczby pochodzą z testu Black Ops 7 (ten sam silnik, inna gra) i tak są opisane. Gry tylko z szacunkiem: Fortnite, Valorant, League of Legends, Minecraft, Roblox, Apex Legends, PUBG, EA Sports FC 27, Rust, GTA V.

## 3. Źródła
- **TechPowerUp** (główne): Ryzen 7 9800X3D, najwyższe ustawienia, natywnie, bez skalowania i generatora klatek. Recenzje PNY RTX 5080 Slim OC (04.2026) i MSI RTX 5060 Gaming OC (07.2025) — ta sama platforma i sceny; Sapphire RX 9070 GRE Pulse (06.2026, inna platforma — tylko przez przeliczenie); testy gier: Battlefield 6, Clair Obscur: Expedition 33, Resident Evil Requiem, 007 First Light, Death Stranding 2.
- **ComputerBase:** ARC Raiders, Gothic 1 Remake (z DLSS 4 / FSR Balanced — jedyny test; przy tej grze pokazujemy ustawienia „ze skalowaniem DLSS/FSR Balanced”), testy procesorów w Cyberpunku i BG3. **Wccftech:** Call of Duty: Black Ops 7. **GameGPU:** The Blood of Dawnwalker. **TechSpot/HUB:** RDR2, CPU w Battlefield 6.
- Relacja procesorów w grach (względem 9800X3D): 9850X3D 1,031 · 7800X3D 0,888 · Core Ultra 7 270K Plus 0,799 · 9600X 0,745 · 7500F 0,67 · i5-14400F 0,59 · 5600 0,56 · 5500 0,44 ([Tom's Hardware CPU hierarchy](https://www.tomshardware.com/reviews/cpu-hierarchy,4312.html), stan 10.2026, + testy procesorów ComputerBase).

## 4. Reguły (w skrypcie danych, nie w kodzie strony)
- Wynik zestawu = wynik jego karty w danej grze i rozdzielczości; jeśli limit procesora jest niższy → limit procesora, rodzaj `r`. Elden Ring maks. 60. Zaokrąglenie do 1 kl./s.
- **Strona nie liczy klatek** — tylko czyta dane. Nowa karta lub procesor w ofercie = ponowne uruchomienie skryptu w czacie i nowy seed.

## 5. Model w Payload
- `games`: `name`, `slug`, `kind` (esport | aaa | capped), `fpsCap`, `setting`, `popularRank`, `seoPage`, `requirements { min, recommended, max, source, checkedAt }` (puste do uzupełnienia ze strony gry).
- `fps-results`: `build`, `game`, `resolution` (fullhd | qhd | uhd), `fps`, `kind` (p | m | r | e), `sourceLabel`, `sourceUrl`, `setting`, `measuredAt` i `unit` (dla `p`). Import z `fps-sources.json`: `source` → `sourceLabel`, `url` → `sourceUrl`, `game` (nazwa) → relacja do `games` po `name`, `build` (slug) → relacja do `builds`; pola `cpu`, `gpu` tylko do podglądu w panelu.
- **`games.settingNote` (G5, decyzja Krystiana 26.10.2026):** opcjonalny dopisek przy grze na stronie, gdy ustawienia odbiegają od standardu (§6). W seedzie tylko dwa przypadki: Gothic 1 Remake „ze skalowaniem DLSS/FSR Balanced”, Call of Duty: Warzone „z testu Black Ops 7”. Pełne ustawienia każdej liczby (`fps-results.setting`) pokazuje „Jak liczymy?”.
- Jeden rekord `m`/`r`/`e` na zestaw × grę × rozdzielczość (hak w kolekcji; seed aktualizuje go w miejscu); rekordów `p` może być kilka. Gry i zestawu z wynikami nie da się usunąć.
- Priorytet wyświetlania: `p` > `m` > `r` > `e` (najnowszy `p` wygrywa). `lib/fps.ts → fpsFor(table, build, game, resolution)` — tabela z `lib/fps.server.ts → loadFpsTable()` (jedno zapytanie na stronę, ta sama tabela działa w przeglądarce w konfiguratorze).
- **Skąd `p` (G0, 25.10.2026):** rekord `p` dla zestawu powstaje tylko z egzemplarza (`units`, ADR-G005), którego konfiguracja jest **identyczna z przepisem zestawu** (poziom, obudowa, chłodzenie, RAM, dysk). Pomiar egzemplarza ze zmianami (np. inny RAM) zostaje wyłącznie na jego metryce. Powód: jeden egzemplarz zmieniony pod klienta nie może przestawić liczb na stronie zestawu dla wszystkich.
- Konfigurator: klatki poziomu = klatki jego zestawu wiodącego (`power-levels.leadBuild`); obudowa, chłodzenie, RAM i dysk nie zmieniają klatek.

## 6. Na stronie
- Przy każdej liczbie etykieta z tabeli 2 (kolory z ADR-G003). Gdy `setting` gry różni się od standardu (najwyższe, natywnie) — pokazujemy go przy grze (np. Gothic 1 Remake: DLSS/FSR Balanced; Warzone: „z testu Black Ops 7”). Panel „Jak liczymy?” (karta zestawu, porównywarka, strony gier): źródła, ustawienia, linki.
- **Etykiety źródeł z nazwą platformy testowej — świadomy wyjątek (G5, decyzja Krystiana 26.10.2026).** `sourceLabel` i `sourceUrl` podają test bazowy tak, jak go opisał portal, razem z kartą i procesorem platformy testowej (np. „recenzja PNY RTX 5080 Slim OC … Ryzen 7 9800X3D”). To wyjątek od zasady „bez producentów części poziomu” (ADR-G002 §8.7, CLAUDE.md): bez nazwy testu źródło nie byłoby sprawdzalne. Warunki: (1) żaden `internalModel` z bazy nie trafia do HTML ani API (test e2e `offer-api` dalej obowiązuje); (2) w „Jak liczymy?” stoi dopisek, że karta i procesor w nazwie testu to sprzęt platformy testowej, nie części zestawu (treść do potwierdzenia — `TODO(krystian)` w `HowWeMeasure.tsx`).
- Telefon: lista gier z paskiem i liczbą, etykieta pod spodem; przełącznik FullHD / 2K / 4K jako segmenty przyklejone do góry listy.
- Teksty bez obietnic, których dane nie potwierdzają (np. Bazyliszek: „CS2 i Call of Duty grubo powyżej 144 klatek w 2K” — z testów).
