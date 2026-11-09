# PRO-KOM Gaming — runda v3: wrażenie premium (ruch, dopracowanie, poprawki) — 08.11.2026

Źródło: przegląd działającej strony 08.11.2026 (po rundzie v2 i nawigacji) + uwagi Krystiana (`uwagi-krystiana/`). Decyzja: ADR-G014. Plan i prompty: `docs/zadania/gaming-runda-v3.md`.

## 0. Stan po rundzie v2 (sprawdzone na produkcji 08.11)
Zrobione i działa: `/favicon.ico` 200, `og:image` na stronach, JSON-LD `WebSite`, skrypt Umami na stronach, „Wyróżnik” zamiast „Z podań”, nowy nagłówek, szyna, wyszukiwarka, nowe sekcje głównej, „Dla rodziców”, „Kontakt”, sceny rysowane kodem (decyzja Krystiana 08.11 — bez generatora AI).
Nadal otwarte poza kodem: **regulamin i polityka nadal pokazują publicznie „Projekt do weryfikacji przez prawnika”** — prawnik + Krystian w panelu.

## 1. Poprawki konkretne (PR E1)

### 1.1 Miniatury w „Wszystkie zestawy” — komputer nie jest na środku
Zmierzone 08.11 na `/zestawy` przy 1440 px: **we wszystkich 16 kartach środek zdjęcia obudowy jest przesunięty o ok. +70 px w prawo** względem środka karty (zrzut `01`; wrażenie, że Strzyga jest „dobrze”, bierze się z szerokiej obudowy panoramicznej). R5 (#79) poprawiło układ gdzie indziej, ale nie na liście `/zestawy` (`BuildCardView` / `builds.css`).
- Środek obudowy = środek postumentu = środek karty (± 4 px), wspólna linia podstawy, wysokość obudowy ok. 70–75% sceny, nic nie ucięte.
- **Ostrość:** miniatury dostają plik o szerokości 192 px przy wyświetlaniu ok. 140–190 px — na ekranach 2× (laptopy, telefony) są miękkie. Popraw `sizes`/szerokości, żeby przeglądarka brała co najmniej 2× wyświetlanej szerokości.
- Test e2e (twardy, wszystkie 16 kart, 1440 i 390): |środek obudowy − środek karty| ≤ 4 px; `naturalWidth ≥ 2 × szerokość wyświetlana` przy DPR 2.
- Ten sam test dla kart na głównej („Szesnaście istot”) i „Inne istoty”.

### 1.2 Bies — obudowa ucięta w hero
Plik zdjęcia `EXO.webp` (837×873) jest **ucięty u źródła**: obudowa dotyka wszystkich krawędzi pliku, a dół jest obcięty (zrzut `02`). Układ strony nie jest winny — trzeba nowego zdjęcia.
- Krystian: zdjęcie producenta tej obudowy, cała obudowa, przezroczyste tło (PNG/WebP), min. 1200 px wysokości, bez napisów. Wgrywa w panelu w opcji obudowy (kod `EXO`) i uruchamia skrypt boxów obudów (R3).
- Kod: walidacja przy wgrywaniu zdjęcia obudowy — jeśli nieprzezroczyste piksele dotykają krawędzi pliku albo wysokość < 900 px, panel pokazuje ostrzeżenie „zdjęcie ucięte lub za małe”.
- Przy okazji te same kryteria nie spełniają: `LB500.webp` (Wampir, 444×505 — za małe), `PANO130.webp` (Strzyga, 625×721), `PANO100.webp` (Zmora, 647×648) — do wymiany na większe (lista w panelu z ostrzeżeniem).

### 1.3 „Szukaj zestawu lub gry · Ctrl K” nie mieści się w szynie
Zmierzone: treść przycisku ma 245 px, a po rozwinięciu szyny jest ok. 220 px; znaczek `Ctrl K` kończy się 14 px za krawędzią szyny (zrzut `03`).
- Tekst „Szukaj” + znaczek `Ctrl K` (pełne „Szukaj zestawu lub gry” zostaje jako placeholder w oknie wyszukiwarki i w `aria-label`), albo zmniejszone odstępy — wybierz w planie na zrzucie.
- Test: w rozwiniętej szynie żaden element nie wychodzi poza jej szerokość (`scrollWidth ≤ clientWidth` dla każdego przycisku).

### 1.4 Usuwamy wybór koloru światła
**Decyzja Krystiana 08.11:** wszystkie obudowy, AIO i wentylatory w zestawach mają podświetlenie ARGB — kolor ustawia się dowolnie. Wybór „Istoty / Piorun / Krew / Las / Czary / Lód / Ogień” sugeruje, że kolor jest stały i wybierany przy zakupie — wprowadza w błąd (zrzuty `04`, `05`).
Usuń wybór i wzmianki z:
- konfiguratora (`LightPicker`, `view.lightColor`, podsumowanie „Światło: Istoty, bez dopłaty”, `--lc`/`--glow` — poświata w podglądzie zostaje w kolorze istoty),
- „Dostrój zestaw” na karcie (`TuneBuild`, `tunedNote`),
- formularza zapytania i podsumowania (krok „wygląd”), maili zapytania, panelu (pole `lightColor` w `Inquiries` — ukryte w panelu, zostaje w bazie dla starych zapytań, bez nowych zapisów),
- zapisanych konfiguracji w koncie (`saved.light`),
- linków: stary parametr `?swiatlo=` w adresie jest ignorowany bez błędu (stare linki dalej działają).
Zamiast wyboru — jedno zdanie w konfiguratorze i na karcie (sekcja wyglądu/obudowy): **„Podświetlenie ARGB: kolor i efekty ustawisz sam, przyciskiem na obudowie albo w programie. Chcesz konkretny kolor od razu? Napisz w uwagach, ustawimy go przed wysyłką.”**
Sprawdź też teksty, które mówią o „kolorze światła” jako wyborze (`BuyBlock`: „Kolor światła zmienisz przyciskiem na obudowie, ale…”, `Aftercare`: „jak zmienić kolor światła” — ten zostaje, jest prawdziwy) i opisy wyglądu typu „Obudowa czarna, złoty piorun” w karcie hero — jeśli „złoty piorun” to kolor podświetlenia, zamień na opis obudowy.
Testy: brak „Kolor światła”/„Światło:” w konfiguratorze, karcie, formularzu i mailach; `?swiatlo=lod` nie psuje strony ani ceny; cena bez zmian dla wszystkich 16 zestawów.

## 2. Ruch i wrażenie premium (PR E2, E3)
**Problem (Krystian):** na całej stronie brakuje animacji i „uczucia premium”. Dziś strona jest ładna, ale statyczna: ruch to głównie świetliki w hero i proste przejścia hover.

### 2.1 Zasady ruchu (obowiązują wszystkie elementy)
1. **Jedna orkiestrowana chwila na stronę** (wejście hero), reszta ruchu odpowiada na działanie użytkownika (najechanie, wybór, przewinięcie do sekcji). Bez animacji „wszystkiego naraz” i bez zapętlonych efektów poza jedną warstwą tła.
2. Ruch nie opóźnia czytania ani kliknięcia: treść jest czytelna i klikalna od pierwszej klatki (animujemy `transform`/`opacity`, nie układ). Hero: tekst i przyciski gotowe po ≤ 700 ms.
3. **`prefers-reduced-motion: reduce` = stan końcowy bez ruchu** (żadnych wjazdów, liczników, paralaksy). Test e2e z emulacją.
4. Wspólne tokeny w `tokens.css`: czasy 120 / 240 / 480 / 900 ms; krzywa wejścia `cubic-bezier(.16, 1, .3, 1)` (wysuw), wyjścia `cubic-bezier(.7, 0, .84, 0)`; opóźnienie kolejnych elementów 50 ms, max 6 elementów w kaskadzie.
5. Budżet: JS strony głównej +≤ 35 KB gzip, LCP i CLS bez zmian (Lighthouse 5 stron z G15 bez spadku), INP < 200 ms, płynne 60 kl./s na średnim telefonie z Androidem (sprawdzone na prawdziwym urządzeniu).
6. **Bez przejmowania przewijania** (smooth-scroll typu Lenis) — psuje gładzik, czytniki ekranu i telefony; dla rodzica wygląda na „zawieszoną stronę”. Przewijanie zostaje natywne.

### 2.2 Narzędzia
- CSS najpierw (przejścia, `@keyframes`, `:hover`/`:focus-visible`, scroll-margin), IntersectionObserver dla wejść w widok.
- **GSAP + ScrollTrigger + SplitText** tylko tam, gdzie potrzebna jest oś czasu (wejście hero, zmiana istoty w hero, porównanie) — ładowane dynamicznie po LCP, tylko na stronach, które ich używają. GSAP z wtyczkami jest bezpłatny także do użytku komercyjnego od 2025 r. ([Webflow](https://webflow.com/blog/gsap-becomes-free), [GSAP](https://gsap.com/blog/3-13/)) — sprawdź licencję i wersję w dniu instalacji, przypnij dokładnie.
- Przejścia między stronami: View Transitions (karta na liście → karta zestawu, obudowa „przelatuje” na swoje miejsce) — sprawdź w dokumentacji zainstalowanego Next 16, jak włączyć (React `ViewTransition` / opcja w `next.config`); tam, gdzie przeglądarka nie obsługuje, zwykłe przejście bez błędów.

### 2.3 Co i jak ma się ruszać
**Hero strony głównej i karty zestawu (E2)** — sekwencja wejścia ok. 1,2 s:
1. scena wyłania się z czerni z narastającym światłem horyzontu (0–400 ms),
2. pieczęć istoty zapala się konturem, linie przy przydomku dorysowują się od środka,
3. imię: litery podnoszą się z kaskadą 40 ms (SplitText), potem jeden przebieg złotego połysku po literach,
4. obudowa wjeżdża od dołu na postument (lekki „osiad”), poświata postumentu rozbłyska w kolorze istoty, w wentylatorach delikatny puls światła (nakładka CSS w kolorze istoty, nie zmiana zdjęcia),
5. karta z parametrami i ceną wsuwa się z prawej.
- Stan spoczynku: świetliki (są), „oddech” światła postumentu (8 s), paralaksa myszą na 3 planach sceny (tylko desktop, max 12 px).
- **Zmiana istoty w hero głównej:** płynne przejście koloru sceny (morph palety), obudowa wysuwa się w dół i nowa wjeżdża, imię zanika w górę i nowe wchodzi, pasek postępu wokół aktywnej pieczęci w osi „Od Skrzata do Peruna”. Pauza na najechanie i na fokus.

**Karty istot (`/zestawy`, „Szesnaście istot”, „Inne istoty”) (E2):**
- najechanie: karta unosi się o 6 px, obudowa rośnie do 1,04 i lekko się podnosi, postument rozjaśnia się w kolorze istoty, scena przesuwa się o kilka px (paralaksa), po obramowaniu przebiega jedna linia światła; na dotyku — stan wciśnięcia,
- wejście listy w widok: kaskada kart (max 6 naraz),
- filtrowanie (`Monitor`, `Budżet`, `Rodzaj`): karty, które znikają, zanikają i zwijają się, pozostałe płynnie zajmują miejsca (FLIP), licznik „16 zestawów” przewija cyfry.

**Sekcje strony głównej i podstron (E3):**
- nagłówki sekcji: linie wchodzą od dołu przy wejściu w widok (raz), treść 16 px w górę + zanikanie,
- **liczby klatek:** odliczanie do wartości przy wejściu w widok (raz), etykieta źródła pojawia się po liczbie,
- **porównanie:** słupy rosną od zera w kolorach istot z kaskadą, „+X zł → +Y% klatek” pojawia się po słupie; zmiana gry/rozdzielczości — słupy płynnie zmieniają wysokość, liczby przewijają się,
- „W cenie każdego komputera”: ikony rysują się konturem przy wejściu w widok,
- łuk pieczęci w „Napisz, w co grasz”: pieczęcie zapalają się po kolei od Skrzata do Peruna (raz), najechanie — pieczęć świeci i pokazuje imię,
- „Dla rodziców” i „Kontakt”: spokojniej — tylko zanikanie/wysuw treści i hover kart (to strony zaufania, nie pokazu).

**Konfigurator (E3):**
- przejście między krokami: obecny krok wysuwa się w lewo, nowy wjeżdża z prawej (na telefonie z dołu), pasek kroków z płynnym wskaźnikiem,
- wybór opcji: obramowanie zapala się, delikatna fala światła od miejsca kliknięcia,
- **cena:** cyfry przewijają się do nowej wartości, przy zmianie krótki błysk złota; licznik klatek tak samo,
- podgląd obudowy: przejście krzyżowe przy zmianie obudowy, zmiana poziomu mocy — krótki rozbłysk poświaty w kolorze nowej istoty.

**Mikrointerakcje (E3):**
- przyciski: złoty — połysk przebiegający na najechanie (jest), lekkie „przyciągnięcie” do kursora (max 4 px, tylko desktop), wciśnięcie 0,98,
- licznik porównania i zapytania: „podskok” przy dodaniu, ikona leci do licznika (z karty do nagłówka),
- arkusze na telefonie (menu, filtry, porównanie): wjazd sprężysty, przyciemnienie tła z rozmyciem,
- przejście strona → strona: View Transitions (obudowa z listy na kartę zestawu, nagłówek zostaje na miejscu),
- fokus klawiatury: złota obwódka z krótkim rozbłyskiem.

**Ładowanie (E3, Krystian 08.11):** gdy coś ładuje się dłużej, strona pokazuje ładny stan zamiast pustki albo „wskakiwania”:
- wolne przejście między stronami (`loading.tsx`): pieczęć istoty zapala się konturem i „oddycha” w kolorze istoty (albo złota poza kartą zestawu), pokazana dopiero po ok. 300 ms, żeby szybkie przejścia nie migały,
- sceny i zdjęcia obudów: płynne wyłonienie po wczytaniu (zanikanie + lekkie wyostrzenie), bez wpływu na LCP (pierwsza scena i zdjęcie hero bez tego),
- przyciski formularzy (zapytanie, konto): stan „wysyłam…” z animacją i zablokowanym ponownym kliknięciem,
- reduced-motion: statyczny stan bez pulsowania.

### 2.4 Sceny rysowane kodem — głębia ruchem (E2)
Sceny po R4 są rysowane kodem (decyzja 08.11) i są płaskie — pliki mają ok. 50 KB, to sylwetki na gradientach. Bez zmiany decyzji można dodać im głębi:
- rozdzielenie każdej sceny na 3–4 plany (niebo, dalekie sylwetki, bliskie sylwetki, pierwszy plan) jako osobne warstwy SVG/obrazy → paralaksa myszą i przy przewijaniu,
- animowana mgła (2 warstwy przesuwające się powoli w przeciwnych kierunkach), światło horyzontu „oddychające”, w scenach z wodą — drganie odbicia, z burzą — rzadki błysk (Perun), z żarem — unoszące się iskry (Żmij), ze śniegiem — padający śnieg (Pani Zimy); max jedna animowana warstwa na scenę poza mgłą,
- gradacja i winieta w kolorze istoty, poświata za obudową.
**Uczciwie:** to podniesie wrażenie, ale prawdziwie „filmowa” scena wymaga obrazów malowanych (generator albo ilustrator). Wracamy do tego, jeśli po E2 sceny nadal będą słabym punktem.

## 3. Kryteria odbioru rundy v3
- Zrzuty i krótkie nagrania (GIF/MP4 z Playwright) „przed / po” w każdym PR: hero głównej, karta zestawu, `/zestawy` z filtrowaniem, porównanie, konfigurator.
- e2e: miniatury wyśrodkowane (16 × 2 szerokości), ostrość miniatur, szyna bez przepełnienia, brak wyboru światła, `?swiatlo=` bez błędu, reduced-motion = brak animacji, cena 16 zestawów bez zmian.
- Lighthouse mobile 5 stron z G15 bez spadku; JS głównej +≤ 35 KB gzip; CLS 0; prawdziwy Android (średni) — płynność hero i listy zestawów.
