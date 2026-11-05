# PRO-KOM Gaming — nawigacja, boczna szyna, wyszukiwarka i pasek przewijania

Wersja 1.0 · 03.11.2026 · decyzja: `docs/decyzje/ADR-G012-nawigacja-szyna-wyszukiwarka.md` · zadania: `docs/zadania/gaming-nawigacja.md`
Wzorzec wyglądu: `docs/design/prokomgaming/nawigacja/GamingNawigacja.dc.html` = plansza „10 · Gaming” na płótnie https://claude.ai/artifact/7HKNezL1nNmgeZPJum8rQG (podgląd w Chrome; plik w repo do porównania i odczytu wartości).
Wzór działania: szyna i wyszukiwarka linii PRO-KOM w `prokom-web` (`docs/design/wspolne/WSPOLNE-ELEMENTY.md` §5.1, plansza `Szyna.dc.html`). Gaming ma osobne repo, więc **kopiujemy zasady, nie kod**: komponenty powstają tutaj, w stylu marki Gaming.

---

## 0. Zasada nadrzędna

**Wszystko, co jest dziś w nawigacji, zostaje.** Te same pozycje, ta sama kolejność, te same adresy (`lib/nav.ts`: `headerLinks`, `routes`) i te same zachowania:
- licznik porównania,
- chowanie nagłówka telefonu,
- menu z hamburgera,
- dolny pasek telefonu,
- wariant jasny nagłówka na „Dla rodziców” (`data-nav-light`),
- nagłówek nad sceną (`data-scene-top`).

Zmienia się wygląd. Dochodzą trzy nowe elementy: **boczna szyna** (≥ 1400 px), **wyszukiwarka** (Ctrl K) i **pasek przewijania w kolorach marki**.

Nie zmieniamy:
- treści stron ani sekcji (sekcja „Teraz w warsztacie” zostaje na stronie głównej, tylko nie ma jej w szynie),
- danych w Payload (jedyny wyjątek to pole flagi „Ostatnio oglądane”, §4.5),
- stopki,
- panelu `/admin`.

## 1. Tokeny (z `src/styles/tokens.css`, bez nowych kolorów)

| Rola | Token | Wartość |
|---|---|---|
| tło strony, tor paska | `--noc` | `#07100e` |
| panele (szyna, paleta) | `--panel-from` → `--panel-to` | `#0c1512` → `#070c0a` |
| tekst główny | `--kosc` | `#ece4d0` (15,2:1 na `--noc`) |
| tekst drugorzędny | `--kosc2` / `--mgla` | `#cdc3ab` / `#9a9583` (6,4:1) |
| linie | `--line` | `#ece4d021` |
| akcent | `--grom` / `--grom2` | `#f2c230` (11,5:1) / `#ffe08a` |
| tekst na złocie | `--on-grom` | `#1a1305` (11,0:1) |
| liczby rzymskie w szynie | nowa zmienna `--rail-num` | `#8a8574` (5,2:1) |
| fonty | `--font-text` Manrope · `--font-name` Cinzel · `--font-head` Cormorant Garamond · `--font-logo` Archivo | |

Nowe zmienne (do `tokens.css`, sekcja „nawigacja”):

```css
--rail-w: 64px;
--rail-w-open: 258px;
--rail-num: #8a8574;
--nav-glass: rgba(7, 16, 14, 0.8);
--nav-h: 76px;
--nav-h-scrolled: 66px;
--gold-grad: linear-gradient(180deg, #ffd75a, #f2c230 55%, #d9a91a);
```

Kontrast sprawdzony (WCAG 2.1): wszystkie pary tekstu ≥ 4,5:1.

## 2. Nagłówek — desktop (≥ 1200 px)

Plansza §1. Wysokość 76 px, padding poziomy 28 px. Układ (flex, `gap: 18px`): znak · odstęp · **kapsuła z linkami** · odstęp · „Odpowiadamy w godzinę” · Porównanie · Konto · „Dobierz komputer”.

### 2.1 Elementy

| Element | Wygląd | Uwagi |
|---|---|---|
| **Znak** | bez zmian (`<Logo />`, Archivo 118/800) | |
| **Kapsuła** | `display:flex; gap:2px; padding:5px; border-radius:999px; background:rgba(12,22,19,.62); border:1px solid rgba(236,228,208,.11); box-shadow:inset 0 1px 0 rgba(236,228,208,.05)` | ten sam `<nav aria-label="Główne"><ul>` co dziś, tylko nowe klasy |
| **Link** | Manrope 600 14 px, `height:36px; padding:0 14px; border-radius:999px; color:var(--kosc2)` | hover: `color:var(--kosc); background:rgba(236,228,208,.06)` (200 ms) |
| **Link aktywny** (`aria-current="page"`) | `color:var(--grom2); background:linear-gradient(180deg,rgba(242,194,48,.16),rgba(242,194,48,.07)); box-shadow:inset 0 0 0 1px rgba(242,194,48,.38)` + romb 5×5 px pod spodem (`::after`, obrót 45°, `--grom`, poświata `0 0 10px rgba(242,194,48,.8)`) | `isCurrent()` bez zmian |
| **„Odpowiadamy w godzinę”** | dwie linijki: „Odpowiadamy w godzinę” (Manrope 600 12,5 px, `--kosc2`) + „codziennie 8–22” (500, `--mgla`); złoty zegar 20 px po lewej | link do `routes.inquiry` jak dziś. Godziny: ta sama wartość co w mailach (`responseTime` z ustawień, jeśli jest w `site-settings`; inaczej stała w `lib/promises.ts` — bez nowego literału w komponencie) |
| **Porównanie, Konto** | okrągłe 42×42 px, `border:1px solid rgba(236,228,208,.16); background:rgba(12,22,19,.5)`; hover: obwódka `rgba(242,194,48,.6)`, ikona `--grom2` | licznik: złota pigułka 18 px, `--on-grom`, Manrope 800 11 px, obwódka `0 0 0 2px var(--noc)`; `aria-label` bez zmian |
| **„Dobierz komputer”** | pigułka 44 px, `background:var(--gold-grad)`, Manrope 800 14,5 px, strzałka 17 px, cień `0 8px 24px -10px rgba(242,194,48,.7)` + `inset 0 1px 0 rgba(255,255,255,.45)`; odblask (`::before`, przesuwa się w 600 ms na hover) | `ButtonLink` — nowy wariant `variant="gold-cta"` albo klasa w nagłówku; inne przyciski strony bez zmian |

### 2.2 Stany nagłówka

| Stan | Kiedy | Wygląd |
|---|---|---|
| **Nad sceną** | strona z `[data-scene-top]`, przewinięcie < 8 px | przezroczysty, 76 px (jak dziś: `position:absolute` nad sceną) |
| **Przewinięty** | przewinięcie ≥ 80 px | `position:fixed`, 66 px, `background:var(--nav-glass); backdrop-filter:blur(14px)`, u dołu złota nitka `linear-gradient(90deg,transparent,rgba(242,194,48,.55) 50%,transparent)` 1 px; wjeżdża z góry (200 ms) |
| **Chowanie** | przewijanie w dół o ≥ 80 px, gdy menu zamknięte | chowa się (`translateY(-100%)`), wraca przy przewijaniu w górę i przy fokusie (logika `useHideOnScroll` — przenieść z telefonu na wszystkie szerokości) |
| **Strona jasna** (`[data-nav-light]`, „Dla rodziców”) | nad jasną sekcją | kolory jak dziś (`--par-nav`); kapsuła: `background:rgba(255,255,255,.55); border-color:rgba(26,19,5,.12)`; aktywny link: tło `rgba(242,194,48,.22)`, tekst `#5a4d33`; po przewinięciu — wariant ciemny |

> **Decyzja do akceptacji w planie GN-1 [Krystian]:** dziś na komputerze nagłówek nie jest przyklejony. Projekt zakłada przyklejony nagłówek z chowaniem przy przewijaniu w dół, tak jak telefon dziś. Rekomendacja: **tak**. Przy długich stronach (karta zestawu, konfigurator) „Dobierz komputer” i Porównanie zostają wtedy pod ręką. Wariant „nie” to nagłówek jak dziś, tylko w nowym wyglądzie. Stan „Przewinięty” odpada wtedy na desktopie.

### 2.3 Szerokości

| Szerokość | Nagłówek |
|---|---|
| ≥ 1400 px | pełny (jak wyżej); poniżej 1440 px odstęp 14 px i linki kapsuły z wcięciem 12 px |
| 1200–1399 px | bez „Odpowiadamy w godzinę” (jest w menu i stopce) |
| 761–1199 px | znak · Porównanie · Konto · „Dobierz komputer” · hamburger (menu z `MenuSheet`); dziś hamburger działa do 1000 px, a nowa kapsuła potrzebuje ok. 1200 px |
| ≤ 760 px | telefon (§6) |

> **Zmiana po pomiarze w GN-1 (05.11.2026):** pierwotnie pełny nagłówek od 1280 px. Treść pełnego nagłówka ma ok. 1432 px przy odstępach ze specyfikacji i ok. 1384 px po zagęszczeniu, więc „Odpowiadamy w godzinę” mieści się dopiero od 1400 px. GN-3: lupa w nagłówku (1200–1399 px) doda 42 px — sprawdzić 1200 px.

Dostępność: link „Przejdź do treści” bez zmian, fokus widoczny `outline:2px solid var(--grom); outline-offset:3px` na każdym elemencie, cele dotyku ≥ 44 px (link 36 px wysokości + odstęp kapsuły — sprawdzić w axe; jeśli za mało, `min-height:44px` na `<a>` z ujemnym marginesem).

## 3. Pasek przewijania (cała strona)

Plansza §5. W `globals.css` serwisu (nie w panelu `/admin`):

```css
html::-webkit-scrollbar { width: 12px; }
html::-webkit-scrollbar-track { background: var(--noc); }
html::-webkit-scrollbar-thumb {
  border: 3px solid var(--noc);
  border-radius: 12px;
  background: linear-gradient(var(--grom2), var(--grom) 45%, #b8860b);
}
html::-webkit-scrollbar-thumb:hover { background: var(--grom2); }
/* Firefox. scrollbar-color w Chrome/Edge 121+ wyłącza style ::-webkit-scrollbar,
   dlatego tylko tam, gdzie ich nie ma (ten sam błąd był w Software) */
@supports not selector(::-webkit-scrollbar) {
  html { scrollbar-color: var(--grom) var(--noc); scrollbar-width: auto; }
}
```

Na stronie jasnej („Dla rodziców”) pasek zostaje ciemny, bo dotyczy całego dokumentu. Istniejące ukryte paski poziome (`scrollbar-width:none` w karuzelach) zostają bez zmian. **Zasięg:** tylko grupa tras `(site)`, czyli `globals.css` serwisu. Panel ma własne style Payload.

## 4. Boczna szyna (≥ 1400 px)

Plansza §2 (na żywo) i §3 (stany). Komponent `src/components/rail/SiteRail.tsx` (+ `rail.css`, `useActiveSection.ts`, `railConfig.ts`), wstawiony w layoucie `(site)` obok `<SiteHeader />`. Na wszystkich stronach serwisu poza `/metryka/*` (strona do druku) i stronami konta (`/konto/*`, ich formularze są krótkie).

### 4.1 Wymiary i zachowanie
- **Pozycja:** `position:fixed; left:18px; top:max(92px, var(--nav-h) + 16px)`. Wysokość dopasowana do treści, nie więcej niż `calc(100vh - 120px)`, środek przewija się wewnątrz (cienki złoty pasek). Panel: `border-radius:20px; background:linear-gradient(180deg,var(--panel-from),var(--panel-to)); border:1px solid rgba(236,228,208,.12); box-shadow:0 30px 60px -30px rgba(0,0,0,.9)`, `z-index` nad treścią, pod nagłówkiem (nagłówek 30, szyna 25, `MenuSheet` i dialogi wyżej).
- **Zwinięta:** 64 px, same ikony 20 px w polach 40×40 px.
- **Rozwinięta:** 258 px. Rozwija się na hover i na `:focus-within` po 120 ms, zwija po 250 ms od wyjścia. Animacja szerokości `250ms cubic-bezier(.2,.8,.2,1)`, a etykiety pojawiają się z opóźnieniem 80 ms (`opacity`). Na urządzeniu dotykowym (`(hover: none)`) rozwija się pierwszym dotknięciem, a drugie dotknięcie przechodzi do pozycji. Przy `prefers-reduced-motion` szyna rozwija się bez animacji.
- **Odsunięcie treści:** treść nie przesuwa się. Szyna zwinięta zajmuje 64 + 18 px po lewej, a kontener strony ma 80 px marginesu (`--gutter-desktop`), więc się mieści. Sprawdzić strony, które wychodzą poza kontener (scena hero, karuzele na pełną szerokość). Na nich szyna leży nad sceną i to jest zamierzone.
- **Ruch bez myszy:** szyna jest w `<nav aria-label="Sekcje strony">`, kolejność Tab po nagłówku. Esc zwija szynę. Strzałki góra/dół poruszają się między pozycjami (roving tabindex niepotrzebny, wystarczą zwykłe linki).

### 4.2 Zawartość (od góry)

1. **Szukaj** (§5): ramka `rgba(242,194,48,.42)`, tło złote 12% → 4%, lupa `--grom2`, etykieta „Szukaj zestawu lub gry”, skrót „Ctrl K” (na Macu „⌘K”, wykrywane w przeglądarce).
2. **„STRONA GŁÓWNA”**: podpis Cinzel 10 px, odstęp liter 0,2 em, `--rail-num`, kreska 16 px przed tekstem. Na podstronach w tym miejscu stoi najpierw grupa „NA TEJ STRONIE · {nazwa}” (§4.4).
3. **Sekcje strony głównej I–XI**: ikona + etykieta + liczba rzymska (Cinzel 11 px, `--rail-num`) wyrównana do prawej:

| Nr | Etykieta | Sekcja (komponent) | `id` kotwicy | Ikona (path 24×24, w planszy `ic.*`) |
|---|---|---|---|---|
| I | Start | `Hero` | `start` | `start` |
| II | Od czego zaczynasz | `StartPaths` | `od-czego-zaczynasz` | `sciezki` |
| III | Szesnaście istot | `Bestiary` | `istoty` (istnieje) | `istoty` |
| IV | Jak kupić | `HowToBuy` | `jak-kupic` | `kup` |
| V | W co grasz? | `Games` | `w-co-grasz` | `gry` |
| VI | Metryka komputera | `BeforeShipping` | `metryka` | `metryka` |
| VII | Dla rodziców | `ForParents` | `dla-rodzicow-sekcja` | `rodzice` |
| VIII | Porównaj istoty | `CompareTeaser` | `porownaj-istoty` | `porownaj` |
| IX | W cenie | `Included` | `w-cenie` | `wcenie` |
| X | Zanim zapytasz | `HomeFaq` | `pytania` | `pytania` |
| XI | Napisz, w co grasz | `FinalCta` | `napisz` | `napisz` |

`WorkshopStrip` („Teraz w warsztacie”) **nie jest** w szynie (decyzja Krystiana 03.11) i zostaje na stronie bez zmian. Identyfikatory `id` dopisujemy do istniejących `<section>` w komponentach. Nie mogą się dublować z identyfikatorami w treści: sprawdzić `grep 'id="'`. Każda sekcja dostaje `scroll-margin-top: calc(var(--nav-h-scrolled) + 16px)`.

4. **Kreska**, a pod nią **akcje**:
   - **Porównanie**: ikona słupków, złoty licznik `compareCount` z `useShell()`. W stanie zwiniętym licznik siedzi na ikonie, w rozwiniętym przy prawej krawędzi. Prowadzi do `routes.compare`.
   - **Zapytanie**: ikona koperty, prowadzi do `routes.inquiry`.
   - **Do góry**: pierścień postępu strony (SVG, obwód 62,8, `stroke-dashoffset` z przewinięcia, kolor `--grom` na torze `rgba(236,228,208,.15)`) ze strzałką. W rozwiniętej szynie po prawej procent przewinięcia. Klik przewija na górę (`behavior: smooth`, a przy reduced motion natychmiast). Pozycja widoczna dopiero po przewinięciu ≥ 30% wysokości ekranu.

   Bez telefonu w szynie, tak samo jak w liniach.

### 4.3 Aktywna sekcja
- `useActiveSection(ids)` z IntersectionObserver (`rootMargin: '-40% 0px -55% 0px'`). Aktywna jest ostatnia sekcja, której górna krawędź minęła 40% wysokości ekranu.
- Wygląd aktywnej pozycji:
  - `color:var(--grom2)`,
  - tło `radial-gradient(120% 140% at 0% 50%, rgba(242,194,48,.18), transparent 70%)`,
  - złota kreska 3 px po lewej krawędzi panelu z poświatą `0 0 12px rgba(242,194,48,.9)`,
  - liczba rzymska `--grom`,
  - `aria-current="location"`.
- Hover na pozycji: `color:var(--kosc); background:rgba(236,228,208,.05)`.
- **Na podstronie** pozycje sekcji głównej to linki `/#<id>`. Klik przenosi na stronę główną i przewija do sekcji. Żadna pozycja nie jest wtedy aktywna.

### 4.4 „Na tej stronie” (podstrony)
Konfiguracja w `railConfig.ts`: lista `{ path, title, sections: [{ id, label, icon }] }`. **Etykiety i `id` biorą się z prawdziwych sekcji strony.** Przed wpisaniem sprawdź komponent strony. Jeśli sekcji nie ma, pozycji nie dodajemy.

| Strona | Grupa | Sekcje (sprawdzić w kodzie, poprawić nazwy do nagłówków H2) |
|---|---|---|
| `/zestawy/[slug]` | „NA TEJ STRONIE · {nazwa istoty}” | Przegląd i cena (`BuildHero`) · Dlaczego {istota} · Wnętrze (`Interior`) · Wydajność w grach (lista FPS) · Dostrój zestaw (`TuneBuild`) · Jak kupić (`BuyBlock`/`Journey`) · Inne istoty (`Neighbours`) |
| `/konfigurator` | „NA TEJ STRONIE · KONFIGURATOR” | kroki konfiguratora (jeśli każdy krok to sekcja; jeśli to kreator krok po kroku — **bez** grupy) |
| `/dobor-pod-gre`, `/komputer-do/[gra]` | „NA TEJ STRONIE” | wynik, lista zestawów, jak mierzymy |
| `/dla-rodzicow`, `/o-nas`, `/pytania`, `/poradniki/*` | „NA TEJ STRONIE” | nagłówki H2 strony (min. 3, inaczej bez grupy) |

Na podstronie z grupą sekcje główne zwijają się do jednej pozycji „Sekcje strony głównej” z oznaczeniem „I–XI ▾”. Klik rozwija listę w miejscu.

### 4.5 Ostatnio oglądane (za flagą)
- Do 3 ostatnio oglądanych istot, każda jako chip z nazwą w Cinzel 11 px, obwódka i tekst w kolorze istoty (`--c-<slug>`, 50% / jasny odcień). Prowadzą do karty zestawu.
- Zapis tylko w przeglądarce (`localStorage`, klucz `pkg:recent`, same slugi), z obsługą błędów w `try/catch`.
- **Flaga** `site-settings.navigation.recentlyViewed` (checkbox, domyślnie **wyłączony**). Jeśli w `site-settings` nie ma grupy `navigation`, flagę dodajemy z migracją.
- Do czasu opinii prawnika o `localStorage` w świetle Prawa komunikacji elektronicznej grupa się nie wyświetla. Tak samo działa to w liniach.

## 5. Szukaj (Ctrl K)

Plansza §4. Komponent `src/components/search/SearchDialog.tsx` (+ `searchIndex.ts`, `match.ts`). Otwierają go:
- pozycja „Szukaj” w szynie,
- **lupa w nagłówku** na szerokościach bez szyny, czyli do 1399 px (nowa okrągła ikona przed Porównaniem); od 1400 px lupy w nagłówku nie ma, bo jest pozycja w szynie,
- skrót Ctrl K / ⌘K,
- klawisz „/” poza polami formularzy.

### 5.1 Dane (bez nowych kolekcji)
Indeks budowany na serwerze (route handler `GET /api/szukaj/indeks`, cache jak inne dane publiczne, `revalidate` przy publikacji):
- **Zestawy**: opublikowane `builds`. Pola: nazwa, slug, moc (np. „Moc VII”), rozdzielczość (FullHD/2K/4K), cena „od” z `lib/pricing` (ta sama co na karcie, z datą cen), kolor istoty. Bez `internalModel` i bez kosztów.
- **Gry**: `games`. Pola: nazwa, slug, aliasy (pole istniejące lub stała mapa w `match.ts`: „cs2” → Counter-Strike 2, „gta” → GTA V, „lol” → League of Legends, „wz” → Warzone). Wynik prowadzi do `/komputer-do/<slug>` (strona gry). Druga akcja (Shift+Enter) otwiera `/dobor-pod-gre?gra=<slug>`.
- **Strony**: stała lista z `lib/nav.ts` (menu, stopka, „Dla rodziców”, „Bon”, „Gotowe od ręki”, gdy flaga funkcji włączona) z krótkim opisem.

Rozmiar indeksu < 30 KB. Pobierany przy pierwszym otwarciu dialogu, nie przy ładowaniu strony.

### 5.2 Dopasowanie
- Bez polskich znaków i bez wielkości liter, prefiks słowa.
- Literówki: odległość Levenshteina ≤ 1 dla słów ≥ 4 znaków.
- Synonimy: „4k” → zestawy 4K, „dla syna / dla dziecka / dla córki” → strona „Dla rodziców”, „tani / najtańszy” → zestawy rosnąco po cenie.
- Ten sam algorytm co wyszukiwarka Biznesu (`prokom-web`, `src/lib/search.ts`). Kopiujemy go z nagłówkiem źródła i datą, bez wspólnej paczki.

### 5.3 Wygląd i zachowanie
- **Dialog:** szerokość 640 px, na środku, 18% od góry. `border-radius:22px; background:linear-gradient(180deg,#101b18,#090f0d); border:1px solid rgba(236,228,208,.14)`, tło strony przyciemnione `rgba(4,7,6,.7)` + `blur(4px)`.
- **Pole:** Manrope 600 18 px, złota lupa, złoty kursor, „Esc” po prawej. Placeholder: „Szukaj istoty, gry albo strony…”.
- **Grupy:** „GRY” · „ZESTAWY” (gdy trafiona gra: „ZESTAWY POD {GRA}”, czyli zestawy, które w tej grze mają ≥ 60 FPS w FullHD według bazy klatek (ta sama logika i te same etykiety źródła co „Dobór pod grę”)) · „STRONY”. Podpisy grup w Cinzel 10,5 px `#7a7668`. Maksymalnie 5 pozycji na grupę.
- **Pozycja:** ikona albo romb w kolorze istoty, nazwa (istoty w Cinzel 700), po prawej szary opis (np. „Moc VII · 4K · od 14 540 zł”, „Dobór pod grę ↵”). Wybrana pozycja ma tło `rgba(242,194,48,.1)` i obwódkę `rgba(242,194,48,.3)`.
- **Klawisze:** ↑↓ wybór, ↵ otwórz, Esc zamknij. Fokus uwięziony w dialogu, a po zamknięciu wraca do przycisku, który go otworzył. `role="dialog"`, `aria-modal`, lista jako `role="listbox"` z `aria-activedescendant`.
- **Pusto:** bez frazy — „Popularne”: 4 zestawy (Skrzat, Bies, Kikimora, Wampir) i 4 gry ze stałej listy w `match.ts` (np. Fortnite, Counter-Strike 2, Minecraft, Cyberpunk 2077; slugi sprawdzić w bazie). Statystyk z Umami nie pobieramy.
- **Brak wyniku:** „Nie mamy tego w bazie — zapytaj, a dobierzemy zestaw” → `/zapytanie?temat=<fraza>`, jeśli formularz przyjmuje temat; w przeciwnym razie bez parametru.
- **Telefon:** arkusz od dołu (`BottomSheet`) na całą wysokość, pole na górze, klawiatura otwiera się od razu.
- **Analityka (Umami, ADR-G009):** dwa nowe zdarzenia w `AnalyticsEvents`: `search_open: undefined` i `search_select: { kind: 'build' | 'game' | 'page' | 'none' }`. Bez wpisanej frazy (prywatność).

## 6. Telefon (≤ 760 px)

Plansza §6. Zachowanie bez zmian: nagłówek chowa się przy przewijaniu, dolny pasek ma te same 5 pozycji (`MobileTabBar`).
- **Nagłówek:** znak w rozmiarze `small`, potem trzy okrągłe przyciski 36 px: **Szukaj (nowy)**, Porównanie (z licznikiem), Konto. Złota nitka u dołu, gdy nagłówek jest pełny, tło `--nav-glass` + rozmycie.
- **Dolny pasek:**
  - tło `rgba(7,16,14,.86)` + `blur(18px)`, kreska u góry `rgba(236,228,208,.1)`;
  - pozycje: ikona 21 px i podpis Manrope 700 10,5 px w kolorze `--mgla`;
  - aktywna pozycja: podpis `--grom2` i złota kreska 2 px u góry na 44% szerokości pozycji, z poświatą;
  - **Konfigurator** jako złota „kula” 46 px, wysunięta 18 px nad pasek: `var(--gold-grad)`, ikona w `--on-grom`, obwódka `0 0 0 4px var(--noc)`, cień `0 10px 24px -8px rgba(242,194,48,.8)`. Podpis „Konfigurator” zostaje pod kulą.
  - Licznik zapytań (jeśli jest) bez zmian.
- **Menu** (`MenuSheet`): treść bez zmian. Wygląd linków zgodny z kapsułą, czyli aktywna pozycja w złotej pigułce. Na górze arkusza dochodzi pole „Szukaj…”, które otwiera dialog.
- **Szyna** poniżej 1400 px nie istnieje (nie renderujemy jej, `display:none` nie wystarczy ze względu na kolejność Tab).

## 7. Czego nie robimy
- Megamenu, podglądów istot w menu, nowych pozycji w nawigacji.
- Telefonu w szynie, statusu „teraz otwarte”.
- Zmian w stopce, panelu, treściach i cenach.
- Ostatnio oglądanych włączonych domyślnie.

## 8. Testy i odbiór
- **Jednostkowe (vitest):** `match.ts` (bez polskich znaków, literówki, aliasy, synonimy, kolejność), `searchIndex` (brak `internalModel` i kosztów, rozmiar < 30 KB), `useActiveSection` (logika wyboru), `railConfig` (każde `id` sekcji głównej istnieje w HTML strony głównej — test renderu albo e2e), pierścień postępu (0/50/100%).
- **e2e (Playwright):**
  - 1440 px: szyna widoczna, hover ją rozwija, klik „Jak kupić” przewija do `#jak-kupic`, aktywna pozycja zmienia się przy przewijaniu;
  - 1399 px: brak szyny, jest lupa w nagłówku;
  - Ctrl K → „fortn” → Enter → `/komputer-do/fortnite`;
  - „xyz” → link „Zapytaj”;
  - karta zestawu: grupa „Na tej stronie”, klik przewija;
  - telefon 390 px: dolny pasek, kula Konfiguratora, lupa otwiera arkusz;
  - „Dla rodziców”: jasny nagłówek nad sekcją, ciemny po przewinięciu;
  - klawiatura: Tab przez nagłówek i szynę, Esc zwija i zamyka.
- **axe:** 0 błędów na: głównej, karcie zestawu, konfiguratorze, doborze, „Dla rodziców”, z otwartą szyną i dialogiem.
- **Lighthouse (G15):** bez spadku na 5 stronach z G15. JS szyny i wyszukiwarki ładowany leniwie (`dynamic(() => import(...), { ssr: false })` dla dialogu; szyna to mały komponent kliencki).
- **Porównanie z planszą 10:** zrzuty 1440 (góra strony i po przewinięciu, szyna zwinięta i rozwinięta), 1280, 1100, 390 jasny/ciemny. Różnice opisać w PR.
- **Przed sesją:** zrzuty dotkniętych stron do `tmp/zrzuty-przed/`. Po sesji każda niezamierzona zmiana poza nawigacją to błąd.
