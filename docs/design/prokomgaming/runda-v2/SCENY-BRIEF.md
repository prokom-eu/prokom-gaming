# Sceny istot — brief do nowych grafik (R4)

Po co: obecne tła w hero i w karcie zestawu są przeciętne (płaskie, mało głębi, za mało różnią się między istotami). Kodem (R3) poprawimy światło, warstwy i ruch, ale **prawdziwy skok jakości wymaga nowych obrazów**. Ten plik to instrukcja dla Krystiana do ich wygenerowania i dla Claude Code do obróbki.

## 1. Czym generować i prawa
- Narzędzie z **płatnym planem, który daje prawo do użytku komercyjnego** (np. Midjourney, generator obrazów w ChatGPT, Adobe Firefly). Przed użyciem sprawdź aktualny regulamin wybranego narzędzia (prawa komercyjne zmieniają się między planami).
- Bez nazw artystów, studiów, gier i filmów w opisach („w stylu …”) — ryzyko naruszenia i nierówny efekt.
- Bez postaci, twarzy, potworów i napisów na obrazie. Sceny to **miejsca** (las, staw, zamek), nie istoty — stronę czytają dzieci (decyzja 03.11).

## 2. Pliki, rozmiary, kompozycja
Na każdą istotę dwa obrazy (+ opcjonalnie trzeci):

| Plik | Rozmiar źródła | Do czego |
|---|---|---|
| `<id>-hero` | **3840×1422** (proporcja 2,7:1; obróbka zrobi 2880 i mniejsze) | hero strony głównej i nagłówek karty zestawu |
| `<id>-card` | **2240×1280** (7:4) | miniatury w „Wszystkie zestawy”, na głównej, „Inne istoty” |
| `<id>-fg` (opcjonalnie) | 3840×2666, przezroczyste tło (PNG) | pierwszy plan do paralaksy — tylko jeśli narzędzie daje czyste wycięcie |

**Szablon kompozycji (ten sam dla 16 scen — dzięki temu imię i komputer zawsze pasują):**
```
┌──────────────────────────────────────────────┐
│  strefa NIEBA / imię  — spokojna, ciemna     │  górne 38% — bez jasnych plam i detali
│  (tu stoi złote imię istoty)                 │
│ ─ ─ ─ ─ ─ ─ ─ horyzont ok. 58–62% ─ ─ ─ ─ ─ │
│        ┌──────── środek 40% ────────┐        │  środkowa część — PUSTA polana / płaski
│ detale │  miejsce na postument      │ detale │  teren pod postument i komputer (będzie
│ sceny  │  i komputer (nakładane)    │ sceny  │  nałożony w kodzie)
│        └────────────────────────────┘        │
│  pierwszy plan — ciemny, miękki              │  dolne 12% — ciemne, przechodzi w tło strony
└──────────────────────────────────────────────┘
```
- Główne detale sceny po bokach (lewa i prawa 30%), środek czysty.
- Źródło światła **za środkiem** (poświata na horyzoncie albo księżyc nad środkiem), żeby komputer „stał w świetle”.
- Dół obrazu ciemny (#07100E–#0B1411), bo przechodzi w tło strony.
- Paleta: noc + **kolor istoty z `tokens.css`** (zmienne kolorów istot) jako jedyny mocny kolor sceny; złoto marki tylko w drobnych światłach.
- Styl wspólny: malarska, filmowa scena nocna, wysoka szczegółowość, miękka mgła, głębia (3 plany), bez efektu „plastiku” i bez przesyconych kolorów.

## 3. Wspólny początek opisu (wklej przed opisem sceny)
> Cinematic painterly night landscape, wide panoramic composition 2.7:1, Slavic folklore atmosphere without any characters, empty flat clearing in the center for a product pedestal, calm dark sky in the upper third, horizon at 60 percent height, soft volumetric fog, glowing light source behind the center, rich detail on the left and right sides, dark soft foreground fading to near-black at the bottom, high detail, no text, no people, no creatures, no faces.

Dodaj na końcu opisu dominujący kolor (np. „dominant accent color deep crimson, everything else dark night blue-green”) i dla wersji `card` zmień „2.7:1” na „7:4”.

## 4. Sceny (16)
| Istota | Miejsce (opis do generatora) | Kolor akcentu |
|---|---|---|
| Skrzat | old wooden countryside cottage at night, warm light from a small window, haystacks and a wooden fence on the sides | ciepły bursztyn |
| Licho | dense misty forest, crooked trees, one single green light glowing deep between the trees | zielony |
| Bies | windy meadow at night, swirling leaves and dry grass caught in a whirlwind on the sides | żółtozielony |
| Wodnik | still forest pond at night, water lilies, reeds, moon reflected in black water | niebieski |
| Strzyga | ancient stone ruins on a hill, broken arches, silhouettes of owls on stones | malinowy |
| Kikimora | inside an old abandoned spinning room, wooden spinning wheel, moonlight through cracks | fiolet |
| Zmora | night field full of moths flying toward a low glowing moon, tall grass | kolor istoty z tokens |
| Rusałka | river bank at dawn, white mist over water, birch trees, floating flower wreaths | biały i turkus |
| Baba Jaga | deep old forest, a lonely hut far away on a hill with a faint light, twisted roots | purpura |
| Bazyliszek | narrow medieval old-town street at night, cobblestones, old cellar door, mirrors reflecting light | szmaragd |
| Pani Zimy | snowy clearing in a winter forest, frost on branches, soft aurora in the sky | lodowy błękit i biel |
| Wilkołak | rocky mountain ridge under a full moon, cold wind, scattered pines | srebrny |
| Wampir | gothic castle silhouette far away on a cliff, blood-red moon, bare trees | czerwień |
| Weles | dark Tatra-like mountain valley with a lake, wet black rocks, low clouds | kolor istoty z tokens |
| Żmij | volcanic basalt rocks, glowing embers and sparks in cracks, smoke | pomarańcz i żar |
| Perun | huge lone oak on a hill during a storm, lightning in the sky behind | złoto |

Generuj po 3–4 warianty, wybierz najlepszy według listy w §5. Najpierw zrób 2 istoty (np. Skrzat i Wampir), wrzuć do sesji R4 na próbę, dopiero potem resztę — wtedy ewentualne poprawki stylu robisz raz.

## 5. Kontrola jakości przed oddaniem (Krystian)
- [ ] Środek (ok. 40% szerokości, od horyzontu w dół) jest pusty i płaski — postument i komputer się zmieszczą.
- [ ] Górne 38% spokojne i ciemne — złote imię będzie czytelne.
- [ ] Brak postaci, twarzy, napisów, znaków wodnych, zniekształconych obiektów.
- [ ] Kolor istoty dominuje, ale scena nie jest przesycona.
- [ ] Dół ciemny, bez ostrej krawędzi.
- [ ] 16 scen wygląda jak jedna seria (to samo światło, mgła, szczegółowość).
- [ ] Pliki: `<id>-hero.png|jpg`, `<id>-card.png|jpg`, (`<id>-fg.png`), id jak w `seed/prokomgaming/creatures.json` (np. `baba`, `zima`, `wilkolak`).

## 6. Obróbka w repo (R4 — Claude Code)
- Skrypt `scripts/scenes/import.mjs` (sharp): przycięcie do szablonu, kontrola stref (średnia jasność górnych 38% ≤ próg; środek bez dużych kontrastów — ostrzeżenie w raporcie), eksport WebP + AVIF w szerokościach używanych przez `next/image`, aktualizacja listy plików. Oryginały poza repo (za duże) — w repo tylko wynik.
- Zrzuty porównawcze stara/nowa scena dla każdej istoty (1440, 1920, 390) w PR, test imię ≠ komputer (ZMIANY §3.1) na nowych scenach, LCP bez wzrostu.
