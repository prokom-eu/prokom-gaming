# PRO-KOM Gaming — runda wyglądu v2 (po starcie strony, 03.11.2026)

Źródło: audyt działającej strony prokomgaming.pl (03.11.2026) + uwagi Krystiana (zrzuty w `uwagi-krystiana/`). Decyzja: ADR-G013. Plan sesji i prompty: `docs/zadania/gaming-runda-v2.md`. Nawigacja (nagłówek, szyna, wyszukiwarka, pasek przewijania): osobny pakiet `docs/design/prokomgaming/nawigacja/NAWIGACJA.md` (ADR-G012) — ten dokument go nie powtarza.

**Zasady całej rundy**
1. Strona działa na produkcji — każda zmiana to osobny PR, staging → sprawdzenie → produkcja. Nic nie może pogorszyć: cen (`lib/pricing`), klatek z etykietami źródeł, SEO (Lighthouse z G15 bez spadku), dostępności (axe 0), telefonu (bez przewijania w bok 360–414).
2. Wygląd: wysoka jakość, ale w języku marki (noc, kość, złoto, pieczęcie, Cinzel w imionach). Bez nowych krojów i bez nowych kolorów spoza `tokens.css`.
3. Treści piszemy dla rodzica i dla nastolatka jednocześnie: konkretnie, bez straszenia, bez wierzeń i podań (decyzja Krystiana 03.11).
4. Liczby tylko z danych (`seed/`, `fps-results`, `lib/pricing`), nigdy wpisane w komponent.
5. Każda sesja z UI zaczyna się od zrzutów „przed” (1440, 1280, 390) i kończy zrzutami „po” w PR.

---

## 1. Szybkie poprawki (sesja R1)

### 1.1 Logo w Google (favicon)
**Problem:** w wynikach Google przy prokomgaming.pl jest szara kula zamiast znaku (zrzut `08`). Strona ma tylko ikonę SVG pod adresem z hashem (`/icon-…svg`) i `apple-icon`, a **`/favicon.ico` zwraca 404**.
**Wymagania** (wytyczne Google: https://developers.google.com/search/docs/appearance/favicon-in-search — kwadrat, wielokrotność 48 px, stały adres dostępny dla robota, `<link rel="icon">` na stronie głównej):
- `src/app/favicon.ico` (16, 32, 48 px w jednym pliku) — w katalogu głównym `app/`, nie w grupie `(site)` (sprawdź w dokumentacji Next 16 zasadę dla `favicon.ico`).
- `icon.png` 192×192 i 512×512 (sygnet PRO-KOM Gaming na tle nocy, czytelny w 16 px — prosty znak, bez napisu „GAMING”).
- `<link rel="icon">` na stronie głównej wskazuje plik PNG/ICO, nie tylko SVG.
- JSON-LD `WebSite` na stronie głównej: `name: "PRO-KOM Gaming"`, `alternateName: "PRO-KOM Gaming Rabka-Zdrój"`, `url` — Google używa go do nazwy witryny w wynikach.
- Po wdrożeniu (Krystian): Google Search Console → „Sprawdź URL” strony głównej → „Poproś o zindeksowanie”. Ikona w wynikach zmienia się po ponownym odwiedzeniu przez robota — zwykle kilka dni, czasem dłużej (nie da się przyspieszyć bardziej).

### 1.2 Obrazek podglądu linku (og:image)
**Problem:** obrazek podglądu ma tylko karta zestawu. Główna, gry, „Dla rodziców”, kontakt i reszta — link na Facebooku/Messengerze/WhatsAppie bez zdjęcia.
- `opengraph-image.tsx` (Next `ImageResponse`, 1200×630) dla: strony głównej (scena + znak + „Komputery do gier. Sprawdzone w grach.” + „Rabka-Zdrój”), karty zestawu (scena istoty + imię w Cinzel + moc + cena „od” z `lib/pricing`), strony gry („Komputer do {gra}” + 3 zestawy z klatkami z `fps-results`), stron treści (wspólny szablon z tytułem strony).
- Krój Cinzel i Manrope wczytane do `ImageResponse` z plików w repo (nie z Google Fonts).
- `twitter:card` = `summary_large_image`. Test: każda strona z sitemapy ma `og:image` 200 i 1200×630.

### 1.3 Statystyki (Umami) — nie zbierają się
**Problem:** na żadnej stronie produkcji nie ma skryptu Umami (`/_s/script.js`), `window.umami` nie istnieje. G15 i P8 są zrobione, więc najpewniej brakuje zmiennej z identyfikatorem strony w `.env` produkcji albo skrypt jest wyłączony warunkiem.
- Sprawdź warunek w layoucie `(site)` i zmienne w `compose.prod.yml` / `.env` serwera; dopisz brakującą zmienną (Krystian uzupełnia wartość na serwerze — Claude nie czyta `.env`).
- Test dymny po wdrożeniu: strona główna ma `<script src="/_s/script.js" data-website-id=…>`, wejście widać w panelu Umami.

### 1.4 Regulamin i polityka prywatności
**Problem:** obie strony są publicznie oznaczone „Projekt do weryfikacji przez prawnika… Przed publikacją musi ją sprawdzić prawnik”. Polityka nie opisuje statystyk Umami, konta klienta ani korespondencji z panelu.
**Co robimy w kodzie: nic poza treścią.** Treść jest w globalach panelu (G13). Prawdziwa naprawa = prawnik.
- R1 przygotowuje **zaktualizowany projekt** polityki do sprawdzenia przez prawnika — punkty do dopisania w §1.5 niżej — i wpisuje go w panelu na stagingu.
- Napis „Projekt do weryfikacji…” zdejmuje Krystian w panelu **dopiero po akceptacji prawnika**. Jeśli prawnika nie będzie przez dłuższy czas — decyzja szefa (ryzyko po stronie firmy), nie kodu.

### 1.5 Polityka prywatności — punkty do dopisania (projekt dla prawnika)
- **Statystyki:** Umami na serwerze PRO-KOM, bez plików cookies i bez zapisu na urządzeniu, bez łączenia wizyt z osobą; zbierane: odsłony stron, źródło wejścia, typ urządzenia, zdarzenia (np. otwarcie konfiguratora) — bez danych osobowych; dane nie trafiają do zewnętrznych firm.
- **Konto klienta:** jakie dane (e-mail, imię, hasło w postaci skrótu, zamówienia, egzemplarze, zgłoszenia), cel (obsługa zamówienia i gwarancji), podstawa (umowa), okres (czas gwarancji + okres przedawnienia — do decyzji prawnika/księgowej), usunięcie konta na żądanie.
- **Korespondencja:** odpowiedzi na zapytania wysyłamy z panelu ze skrzynki `kontakt@prokomgaming.pl`; odpowiedzi klienta trafiają do historii zapytania w panelu; okres przechowywania jak zapytań (retencja z G6).
- **Odbiorcy danych:** hosting serwera (firma hostingowa — nazwa z umowy), dostawca poczty, firma kurierska, biuro rachunkowe. Do uzupełnienia nazwami z umów przed publikacją.
- **Ciasteczka:** tylko niezbędne (logowanie do konta, porównywarka w pamięci przeglądarki); baner cookies nie jest potrzebny, dopóki nie ma narzędzi śledzących (do potwierdzenia przez prawnika).

---

## 2. „Z podań” → „Wyróżnik” (sesja R2)
**Decyzja Krystiana 03.11:** usuwamy blok „Z podań” (zrzut `07`) wraz ze źródłem (Wikipedia, National Geographic itd.) ze wszystkich 16 kart. Strona jest czytana przez dzieci, a teksty o upiorach, topielcach i klątwach nie sprzedają komputera.
**Zamiast:** blok **„Wyróżnik”** — jedna rzecz, która odróżnia ten zestaw od sąsiednich, o samym komputerze (części, zastosowanie, wygląd). Bez wierzeń, bez straszenia. Krótki tytuł + 1–2 zdania.
**Też:** jednozdaniowe opisy pod imieniem na kartach w `/zestawy` i na głównej („Domowy duszek z polskich podań…”, „Duch złego losu…”, „Staropolskie imię złego ducha”) zastępujemy tytułem wyróżnika. Imiona istot, pieczęcie, przydomki (np. „Zza Pieca”) i sceny zostają — to marka.

**Model:** w `builds` pola `myth` (wymagane) i `legend`/`legendSource` przestają być używane na stronie; nowa grupa `highlight { title (≤ 40 znaków), body (≤ 240 znaków) }` (wymagana). Migracja przenosi teksty z tabeli niżej. Stare pola zostają w bazie do następnej rundy porządków (bez kasowania danych w tej sesji), ukryte w panelu.

| Zestaw | Tytuł | Treść |
|---|---|---|
| Skrzat | Pierwszy prawdziwy komputer do gier | Najtańszy sposób, żeby Roblox, Minecraft, Fortnite i CS2 chodziły płynnie w FullHD. Duże chłodzenie wieżowe zamiast małego wentylatora i szybki dysk NVMe, na którym gra wczytuje się w kilka sekund. |
| Licho | E-sport bez zadyszki | RTX 5060 z DLSS 4 trzyma CS2 i Valoranta grubo powyżej 144 klatek, więc monitor 144 Hz w końcu ma co pokazać. Dysk 1 TB mieści kilka dużych gier naraz. |
| Bies | Platforma, która urośnie z Tobą | Najtańszy zestaw na nowej platformie AM5 z pamięcią DDR5. Za kilka lat wymienisz sam procesor na mocniejszy, bez nowej płyty i nowej pamięci. |
| Wodnik | Do gier i do nauki | Intel Core i5-14400F ma 10 rdzeni, więc poza grami w FullHD na wysokich spokojnie ogarnia naukę, prezentacje i montaż krótkich filmów. |
| Strzyga | 12 GB pamięci karty i szyba z dwóch stron | Radeon RX 9070 GRE z 12 GB pamięci to zapas na nowe gry w FullHD ultra i 2K. Panoramiczna obudowa pokazuje całe wnętrze. |
| Kikimora | Płynne 2K w fioletowym świetle | RTX 5070 z DLSS 4 i chłodzenie wodne 360 mm: płynne 2K na monitorze 144 Hz, a procesor zostaje chłodny nawet w długich sesjach. |
| Zmora | 16 GB pamięci karty na nowe gry | Radeon RX 9070 z 16 GB i 32 GB RAM to najspokojniejszy wybór pod premiery w 2K, które potrzebują coraz więcej pamięci. Procesor z nowej serii Ryzen 9000. |
| Rusałka | Cały na biało | Moc Kikimory w bieli: biała karta graficzna, płyta, obudowa i chłodzenie wodne. Do tego 32 GB pamięci zamiast 16. |
| Baba Jaga | Procesor stworzony do gier | Ryzen 7 7800X3D ma dodatkową pamięć podręczną 3D V-Cache i w grach należy do najszybszych procesorów. Dobry wybór do szybkich strzelanek na monitorze z wysokim odświeżaniem. |
| Bazyliszek | Szybkie strzelanki w 2K | Ryzen 7 7800X3D z Radeonem RX 9070 XT: CS2 i Call of Duty grubo powyżej 144 klatek w 2K, premiery na wysokich. Chłodzenie wodne 360 mm trzyma temperaturę w ryzach. |
| Pani Zimy | Biel i lodowe światło | Moc Bazyliszka w białej obudowie z lodowym podświetleniem i białym chłodzeniem wodnym. Komputer, który wygląda na biurku równie dobrze, jak gra. |
| Wilkołak | 4K do grania i do pracy | Intel Core Ultra 7 ma wiele rdzeni, więc poza 4K na wysokich szybko renderuje filmy i radzi sobie z ciężką pracą. RTX 5070 Ti z 16 GB pamięci i DLSS 4. |
| Wampir | 4K i wysokie odświeżanie w jednym | Ryzen 7 9800X3D, jeden z najszybszych procesorów do gier, i RTX 5070 Ti z 16 GB pamięci: 2K z wysokim odświeżaniem albo 4K na wysokich, z zapasem na kolejne premiery. |
| Weles | 4K na ultra w najcięższych grach | RTX 5080 z 16 GB pamięci i Ryzen 7 9800X3D. Dysk 2 TB mieści całą bibliotekę, a ekran na pompie chłodzenia pokazuje temperatury. |
| Żmij | Premium w każdym szczególe | Ryzen 7 9850X3D, RTX 5080 z trzema wentylatorami i obudowa premium z ekranem LCD na pompie. Dla tych, którzy chcą 4K ultra i komputera, który robi wrażenie. |
| Perun | Najmocniejszy komputer, jaki składamy | RTX 5090 z 32 GB pamięci, 64 GB RAM i 2 TB na bibliotekę. Gry w 4K na maksimum, a przy okazji montaż wideo, praca z AI i streaming naraz. |

Wygląd bloku: ten sam układ co dziś (ikona-pieczęć istoty po lewej, tekst po prawej), nagłówek „Wyróżnik” zamiast „Z podań”, tytuł w Cinzel, treść w Manrope (nie kursywa), bez linku źródła. Fakty w tabeli pochodzą z kart zestawów na stronie (03.11) — przed seedem porównaj z `seed/prokomgaming/builds*.json`; przy rozbieżności wygrywa seed i poprawiasz tekst.

---

## 3. Hero i sceny (sesje R3, R4)

### 3.1 Imię istoty nie może zachodzić za komputer (R3)
**Problem:** prawie przy każdej istocie złote imię (np. SKRZAT, WELES) chowa się dolną częścią za zdjęciem obudowy (zrzut `01`).
**Wymaganie:** imię w całości nad komputerem — na stronie głównej (hero z rotacją istot) i w nagłówku karty zestawu, na 1920, 1440, 1280, 1100 i 390 px, dla wszystkich 16 istot (najdłuższe: PANI ZIMY, BAZYLISZEK, KIKIMORA, BABA JAGA).
- Układ: imię w górnej strefie, komputer pod nim na postumencie; rozmiar imienia liczony od szerokości kontenera (clamp) z limitem tak, żeby najdłuższe imię mieściło się w jednej linii albo łamało się świadomie (PANI / ZIMY, BABA / JAGA) — decyzja w planie R3 na zrzutach.
- Zdjęcie komputera: liczymy „prawdziwą” krawędź obudowy (bez przezroczystego marginesu PNG/WebP) — skrypt w `scripts/` mierzy dla każdego zdjęcia obudowy bounding box nieprzezroczystych pikseli i zapisuje go w danych (`media` albo plik `boxes.json`); komponent ustawia komputer tak, żeby jego górna krawędź była pod linią bazową imienia z odstępem ≥ 12 px.
- **Test e2e (twardy):** dla 16 istot × 5 szerokości prostokąt liter imienia (Range.getClientRects) i prostokąt obudowy (z bounding boxa) nie mają części wspólnej. Test pada = PR nie przechodzi.

### 3.2 Jakość scen (R3 — kod, R4 — nowe obrazy)
**Problem:** tła istot w hero i w szczegółach zestawu wyglądają przeciętnie: płaskie, mało głębi, podobne do siebie, części mają mało wyraźny plan.
**Dwie warstwy pracy:**
1. **Kod (R3):** z obecnych obrazów wyciągamy maksimum — kompozycja warstw (tło, mgła, pierwszy plan, poświata pod postumentem), gradacja kolorystyczna w kolorze istoty, winieta, delikatny ruch (paralaksa myszą tylko desktop, cząsteczki/świetliki przy `prefers-reduced-motion: no-preference`, max 1 animowana warstwa), ostrzejsze skalowanie (`next/image` z `sizes`, AVIF), brak rozmycia przy 1920+ (źródło 2880 px). Bez zwiększenia LCP (obraz tła `priority`, warstwy dekoracyjne leniwie).
2. **Nowe obrazy (R4):** prawdziwy skok jakości wymaga nowych grafik — kodem nie namalujemy lepszej sceny. Brief i 16 opisów do wygenerowania: `SCENY-BRIEF.md`. Krystian generuje, wybiera najlepsze, wrzuca do `public/scenes/nowe/`; R4 je obrabia (przycięcie do stref, WebP/AVIF, rozmiary), podmienia i robi zrzuty porównawcze. Do tego czasu zostają obecne sceny z poprawkami z R3.

### 3.3 Miniatury w „Wszystkie zestawy” (R5)
**Problem:** komputer na miniaturze nie stoi na środku postumentu i jest za mały względem sceny (zrzut `02`); tło i animacje są dobre.
- Komputer wyśrodkowany na postumencie (środek bounding boxa obudowy = środek postumentu), stała linia podstawy dla wszystkich 16 kart, wysokość komputera ok. 70–75% wysokości sceny (dziś ok. 55–60%), bez ucinania.
- Ten sam mechanizm bounding boxa co w §3.1 (jedno źródło danych).
- To samo w kartach na stronie głównej („Szesnaście istot”) i w „Inne istoty” na karcie zestawu.
- Test: dla 16 kart różnica środka obudowy i środka postumentu ≤ 4 px, obudowa w całości w kadrze.

---

## 4. Strona główna — sekcje (sesja R6)
Każda sekcja: plan w trybie planowania z **2 wariantami zrzutów** do wyboru przez Krystiana, potem budowa wybranego. Teksty niżej są propozycją do akceptacji w planie.

### 4.1 „Kupujesz komputer dla dziecka?” (zrzut `04`)
Dziś: jasny pas z 4 punktami — poprawny, ale płaski i bez dowodów. Cel: rodzic po 5 sekundach wie, że to prawdziwa firma, z którą da się porozmawiać.
- Układ: lewa kolumna — tytuł, 2 zdania, przyciski „Przewodnik dla rodziców” i „Zadzwoń: +48 883 200 151” (telefon z danych firmy); prawa — **4 karty dowodów z ikonami** (nie same kreski): „Prawdziwa firma od 2004 roku” z linkami **„Sprawdź w CEIDG”** i **„Sprawdź na białej liście VAT”** (prawdziwe adresy wyszukiwarek z NIP), „Odpisuje człowiek, nie bot” (zdjęcie/inicjały osoby — tylko za zgodą, do tego czasu sygnet), „Przyjedź i zobacz” (adres + mini-mapa statyczna albo link „Prowadź”), „Gwarancja 24 miesiące z odbiorem od Ciebie”.
- Pasek „Jak to wygląda”: 3 kroki z ikonami — Piszesz, w co gra dziecko → Odpisujemy z ceną i terminem (zwykle w godzinę, 8–22) → Odbierasz w Rabce albo kurierem, z metryką.
- Bez zdjęć osób i realizacji, dopóki nie ma zgód (STAN, pytania [SZEF]).

### 4.2 Porównanie (zrzut `05`)
Problem merytoryczny: domyślny przykład pokazuje **Baba Jaga „+0% klatek”** względem tańszej Kikimory — dla klienta to sygnał „dopłacasz za nic”.
- Domyślny zestaw porównania wybierany z danych tak, żeby każdy krok dawał widoczny skok (np. Licho → Kikimora → Wampir w 2K, Cyberpunk 2077) — reguła w kodzie: kolejne zestawy różnią się o ≥ 15% klatek w wybranej grze i rozdzielczości; nie wpisujemy na sztywno.
- Przy każdej kolumnie: cena i **„+X zł → +Y% klatek”** względem poprzedniej.
- Wygląd „epicki, nowoczesny”: kolumny jako świecące słupy w kolorze istoty rosnące przy wejściu w widok (raz, z `prefers-reduced-motion` statycznie), komputer na postumencie nad słupem, przełącznik gry (3 popularne) i rozdzielczości bez przeładowania strony, etykieta źródła przy każdej liczbie zostaje.

### 4.3 „W cenie każdego komputera”
Cel: wyższy poziom wizualny i konkret. Każda pozycja jako karta z ikoną i jednym zdaniem „co z tego masz”: montaż i porządek kabli, test obciążeniowy 60 min, pomiar klatek w Twoich grach, Windows 11 zainstalowany i zaktualizowany, metryka z numerami seryjnymi, gwarancja 24 miesiące z odbiorem, wysyłka albo odbiór w Rabce. Kolejność i treść — z istniejącego źródła (`promises.ts`/seed), bez nowych obietnic.

### 4.4 „Napisz, w co grasz” (zrzut `06`)
Dziś: duży pusty ciemny obszar z szarym kształtem nad pieczęciami — wygląda na niezaładowany obrazek. Cel: mocne domknięcie strony.
- Usuń pusty kształt (sprawdź, co to jest — najpewniej dąb z G8 bez grafiki).
- Scena: 16 pieczęci w łuku nad nagłówkiem z delikatną poświatą w kolorach istot, tło — nocne niebo z jednym rozbłyskiem (bez ciężkich obrazów), CTA „Dobierz komputer” i „Zadaj pytanie” + pod spodem trzy szybkie wejścia: „Gram w CS2 / Fortnite / Minecraft” prowadzące do `/komputer-do/{gra}`.
- Na telefonie pieczęcie w 2 rzędach albo przewijane, bez pustej przestrzeni.

---

## 5. „Dla rodziców” (sesja R7)
Cel: strona pełna zaufania i ładna — dziś treść jest, ale wygląda jak zwykły tekst.
Struktura (teksty w planie do akceptacji, pisane dla rodzica bez żargonu):
1. **Hero** w jasnym wariancie (zgodnie z nawigacją ADR-G012): „Komputer dla dziecka bez stresu i bez żargonu”, 2 zdania, przyciski „Opisz, w co gra dziecko” (→ zapytanie z typem „pomóżcie dobrać”) i „Zadzwoń”.
2. **4 pytania rodzica** jako karty: „Ile trzeba wydać?” (3 przedziały z najtańszymi pasującymi zestawami z danych: e-sport/Minecraft, nowe gry w FullHD, 2K), „Czy to nie za mocny komputer?”, „Co jeśli coś się zepsuje?”, „Czy mogę zobaczyć przed zakupem?”.
3. **Dowody, że jesteśmy prawdziwi**: dane firmy z linkami CEIDG i biała lista, adres sklepu z mapą, od 2004 roku, gwarancja 24 mies. z odbiorem, metryka egzemplarza (przykład z karty).
4. **Jak wygląda zakup** — 4 kroki na osi (zapytanie → oferta z listą części, ważna 48 h → płatność przelewem/BLIK po pro formie → odbiór albo kurier), bez rat.
5. **Słowniczek dla rodzica**: 6 pojęć (karta graficzna, FullHD/2K, klatki/FPS, RAM, dysk NVMe, chłodzenie) — po 1 zdaniu, jak dla dorosłego, który nie gra.
6. **Pytania** (istniejące FAQ z tej strony, w tym „Czy da się kupić na raty? Na razie nie…”).
7. **Zakończenie**: „Napisz, w co gra dziecko” + telefon.
Wygląd: jasna wersja marki (kość + złoto + noc w akcentach), dużo powietrza, ikony liniowe w stylu pieczęci, żadnych ozdobników „gamingowych”, które straszą rodzica.

## 6. „Kontakt” (sesja R8)
Cel: ładniej, lepiej dopasowane, lepiej napisane. Dziś: kafle bez hierarchii, powtórzenia („Zapytanie o komputer” i „Krótkie pytanie”).
1. **Nagłówek**: „Porozmawiajmy o Twoim komputerze” + „Odpowiadamy codziennie 8–22, zwykle w godzinę.”
2. **3 drogi kontaktu jako równe karty** z jedną akcją każda: **Zapytanie o komputer** (najszybsza droga do oferty z ceną — wyróżniona złotem), **Telefon** (numer, godziny, „Zadzwoń”), **E-mail** (`kontakt@prokomgaming.pl`, „Napisz”).
3. **Sklep w Rabce-Zdroju**: adres, godziny otwarcia sklepu (z danych firmy; jeśli brak — tylko adres, bez wymyślania), mapa (statyczny obraz z linkiem „Prowadź” do map — bez osadzania skryptów mapowych i cookies), „Zobaczysz egzemplarz na żywo i odbierzesz zamówienie”.
4. **Krótkie pytanie** (formularz bez zmian w logice) — tytuł „Pytanie, które nie jest wyceną?”.
5. **Masz już komputer od nas?** — konto, zgłoszenie, telefon serwisu.
6. **Dane firmy**: PRO-KOM Tadeusz Wójciak, NIP, adres (z danych firmy, nie literały).
Wygląd: spójny z kartą zestawu (ciemne karty, złote akcenty), na telefonie karty jedna pod drugą, telefon i e-mail jako duże cele dotyku.

## 7. Nawigacja — pakiet GN
Bez zmian względem `NAWIGACJA.md` i ADR-G012. W tej rundzie: GN-1 wcześnie (nagłówek i pasek przewijania są widoczne na każdej stronie), GN-2 i GN-3 po sekcjach strony głównej (szyna potrzebuje stałych `id` sekcji — R6 je zmienia).

## 8. Kryteria odbioru całej rundy
- Zrzuty „przed / po” w każdym PR (1440, 1280, 390; hero 1920).
- e2e: imię ≠ komputer (16 × 5), miniatury wyśrodkowane (16), `og:image` na każdej stronie z sitemapy, favicon `/favicon.ico` 200, `WebSite` w JSON-LD, brak bloku „Z podań” i linków do źródeł podań, Umami na produkcji (test dymny).
- Lighthouse mobile 5 stron z G15: bez spadku żadnej kategorii; LCP strony głównej i karty ≤ 2,5 s (lab).
- axe 0 błędów, telefon 360–414 bez przewijania w bok, `prefers-reduced-motion` wyłącza ruch.
- Sprawdzone na prawdziwym telefonie (Android + iPhone) przed scaleniem R3, R6, R7, R8.
