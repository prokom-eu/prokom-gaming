# prokomgaming.pl — specyfikacja strony (wersja 1, 25.10.2026)

Źródło prawdy dla treści i zakresu. Wygląd i zachowanie: `docs/design/prokomgaming/` (wizualizacja v36). Decyzje: ADR-G001…G005. Plan sesji: `docs/zadania/prokomgaming.md`.

**Zasada przenoszenia:** teksty bierzesz z planszy (`boards/<Plansza>.dc.html` albo zrzut) **bez zmian**, wartości liczbowe — z danych (`seed/`), nigdy z planszy. Miejsca w nawiasach kwadratowych (`[ocena]`, `[telefon]`, `[imię serwisanta]`) to dane do uzupełnienia w panelu: na produkcji element z pustą wartością **nie renderuje się** (test skanuje HTML: zero nawiasów kwadratowych).

---

## 0. Cel, odbiorcy, termin
- **Cel:** sprzedaż komputerów do gier składanych w Rabce-Zdroju: zapytanie → oferta w godzinę → pro forma → przelew albo BLIK → montaż, test, metryka → kurier albo odbiór w sklepie.
- **Odbiorcy:** gracze 14–30 lat (często z telefonu, z TikToka i Facebooka) i **rodzice** kupujący komputer dziecku (potrzebują zaufania i prostego języka).
- **Start sprzedaży:** 20.11.2026 (sezon grudniowy). Domena: `prokomgaming.pl` (ADR-G001).
- **Pierwszeństwo:** telefon i desktop na równi (ADR-G003 §4).

## 1. Fakty i obietnice (wartości w panelu — global `site-settings`)
| Pole | Wartość startowa | Status |
|---|---|---|
| Firma | PRO-KOM Tadeusz Wójciak, ul. Orkana 16B, 34-700 Rabka-Zdrój, NIP 735-251-14-47 | z planszy |
| Salon | ul. Staszica 8, Zakopane | z planszy |
| Telefon | +48 18 267 65 11 | [SZEF] potwierdzić numer dla Gaming |
| E-mail | `gaming@pro-kom.eu` | [SZEF] skrzynka do założenia |
| Odpowiedź na zapytanie | „zwykle w godzinę, codziennie 8–22” | [SZEF] kto zastępuje Krystiana |
| Oferta | ważna 48 h, imienna lista części, cena brutto, termin | z planszy |
| Realizacja | 5–10 dni roboczych od wpłaty; pole „najbliższy wolny termin montażu” | z planszy |
| Płatność | przelew albo BLIK na podstawie faktury pro forma; bez pobrania; **bez rat** (decyzja 25.10) | BLIK: [SZEF] sposób |
| Dostawa | kurier z ubezpieczeniem w cenie albo odbiór: Rabka-Zdrój / Zakopane | [SZEF] firma kurierska |
| Gwarancja PRO-KOM | 24 mies. na cały komputer, kurier odbiera od klienta na koszt PRO-KOM, najpierw pomoc zdalna (za zgodą), rozbudowa RAM/dysku bez utraty gwarancji | z planszy |
| Zwrot | 14 dni dla wszystkich komputerów (także konfiguracji), koszt odesłania po stronie klienta — **opisany neutralnie, nie jako atut** (art. 7 pkt 10 UPNPR) | z planszy |
| Test egzemplarza | 60 min obciążenia, 3 gry zmierzone, test pamięci, aktualny BIOS i sterowniki | [SZEF/serwis] potwierdzić długość testu |
| Od kiedy | „od 2004 roku” | z planszy |
| Ocena Google | `[ocena]`, `[liczba]` opinii | do uzupełnienia; do tego czasu sekcja opinii ukryta |

## 2. Mapa strony
| Adres | Plansza (1440 / 414) | Sesja |
|---|---|---|
| `/` | Main / Telefon (+ Laptop, Monitor27, Ultrawide34, Tablet) | G7–G8 |
| `/zestawy` | Zestawy / Zestawy-telefon | G9 |
| `/zestawy/[slug]` (16) | Zestaw / Zestaw-telefon (wzór: Wampir) | G9 |
| `/konfigurator` (`?zestaw=`, stan w adresie) | Konfigurator / Konfigurator-telefon | G10 |
| `/dobor-pod-gre` | Gra / Gra-telefon | G11 |
| `/komputer-do/[gra]` (33) | KomputerDo / KomputerDo-telefon (wzór: Cyberpunk 2077) | G11 |
| `/porownaj` (`?z=wampir,baba-jaga&gra=&rozdz=&hz=`) | Porownywarka / Porownywarka-telefon | G11 |
| `/zapytanie` (`?zestaw=`, `?k=<konfiguracja>`) | Formularz / Formularz-telefon | G6 (API), G12 (UI) |
| `/zapytanie/wyslane` | Zapytanie / Zapytanie-telefon | G12 |
| `/gotowe` | Gotowe / Gotowe-telefon | G13 |
| `/bon` | Bon / Bon-telefon | G13 |
| `/metryka` (pole kodu) i `/metryka/[kod]` | Metryka / Metryka-telefon | G14 |
| `/konto` (+ `/konto/logowanie`, `/konto/rejestracja`, `/konto/haslo`) | Konto / Konto-telefon | G14 |
| `/dla-rodzicow` | Rodzice / Rodzice-telefon | G13 |
| `/o-nas` | OFirmie / OFirmie-telefon | G13 |
| `/kontakt` | Kontakt / Kontakt-telefon | G13 |
| `/pytania` | FAQ / FAQ-telefon | G13 |
| `/poradniki`, `/poradniki/[slug]` | Poradniki, Poradnik (+ telefon) | G13 |
| `/regulamin`, `/polityka-prywatnosci` | Regulamin, Prywatnosc (+ telefon) | G13 |
| 404 | 404 / 404-telefon | G2 |
| `/admin` | panel Payload | G3–G15 |
| `/sitemap.xml`, `/robots.txt` | — | G15 |

Adresy w linkach plansz (`*.dc.html`) zamień na adresy z tej tabeli.

**Słownik parametrów w adresach:** rozdzielczość `fullhd | 2k | 4k` (w danych: `fullhd | qhd | uhd`, w UI: FullHD / 2K / 4K), odświeżanie `60 | 144 | 240`, gra = `games.slug`, zestaw = `builds.slug`, konfiguracja `k` = kody `poziom.obudowa.chłodzenie.ram.dysk` (np. `P13.LB500.PL3LX.R32WP.NM1`).

## 3. Nawigacja i elementy wspólne (G2)
- **Nagłówek (desktop):** znak PRO-KOM GAMING · Zestawy · Konfigurator · Dobór pod grę · Porównaj · Dla rodziców · O nas · Kontakt · „Odpowiadamy w godzinę” (≥ 1600 px) · ikona porównania z licznikiem · ikona konta · przycisk „Dobierz komputer” (→ `/konfigurator`). Na scenach (hero, nagłówki podstron) przezroczysty, na pozostałych pełny (`.nav.solid`). Menu nie zawija się (1280–1500 px mniejsze odstępy).
- **Telefon i tablet:** ADR-G003 §4 (dolny pasek kart, menu-arkusz, chowający się nagłówek; tablet — hamburger i panel z prawej). Wzór: `boards/Telefon-nawigacja.dc.html`, `stany/tel-01…13`, `stany/tablet-menu.jpg`.
- **Stopka:** 5 kolumn (znak + opis + „Odpowiadamy codziennie 8–22” · Komputery · Po zakupie · PRO-KOM · Kontakt) + pasek prawny (Facebook, TikTok, Regulamin, Polityka prywatności, Ustawienia cookies). Na telefonie: 2 kolumny, pierwsza i ostatnia na całą szerokość.
- **Licznik porównania** (0–3) i **zapytania** (pozycje) w `localStorage` z obsługą błędów (strona działa bez niego).
- **Baner cookies:** przy pierwszej wizycie, „Odrzuć” i „Akceptuję” tej samej wagi, link do ustawień; pokazujemy tylko, gdy w ustawieniach strony włączone są narzędzia wymagające zgody (§24).
- **404:** scena Licha, „Licho tu było i stronę zabrało”, 2 przyciski i 4 linki.

## 4. Strona główna `/` (G7 hero i taśma, G8 sekcje)
Kolejność sekcji (plansza Main, telefon: Telefon):
1. **Hero** — „Komputery do gier. Sprawdzone w grach.”; scena wybranej istoty (domyślnie Wampir), ogromne imię krojem Cinzel z materiałem istoty, przydomek, zdjęcie komputera na podstawie, karta istoty po prawej (pieczęć, legenda „Z podań” ze źródłem, „Moc istoty”, procesor i karta, klatki w CS2 i Cyberpunku z etykietą źródła, cena, „Poznaj {istotę}”), przełącznik istot z tego samego poziomu, na dole 9 medalionów poziomów („od Skrzata do Peruna”). Autoprzełączanie 7 s tylko na komputerze (ADR-G003 §5). Na telefonie: imię → komputer → nagłówek i przyciski → medaliony (przewijane) → karta.
2. **Taśma „Teraz w warsztacie w Rabce”** — etapy bieżących zamówień (tylko nazwa zestawu i kolor) z `GET /api/warsztat`; bez danych → stały tekst z procesu (G14 podłącza dane).
3. **Od czego zaczynasz?** — 3 drogi: Kupuję dla dziecka (→ `/dla-rodzicow`), Wiem, w co gram (→ `/dobor-pod-gre`), Znam się na częściach (→ `/konfigurator`). Telefon: karuzela.
4. **Szesnaście istot. Każda gra po swojemu.** — 16 kart (scena, zdjęcie, pieczęć, imię, poziom, klatki, cena) w kolejności ceny; skala mocy; „Wszystkie zestawy z filtrami”. Telefon: przewijany rząd.
5. **Jak kupić, skoro nie ma przycisku „Kup”** — 4 kroki z czasem (Wysyłasz zapytanie · Dostajesz ofertę · Płacisz, jak Ci wygodnie [przelew albo BLIK] · Składamy i wysyłamy) + „Wyślij zapytanie”.
6. **W co grasz?** — 33 gry (przyciski; telefon: 3 rzędy przewijane), panel klatek wszystkich 9 poziomów dla wybranej gry i rozdzielczości, legenda źródeł, „Pełne wyniki dla tej gry” (→ `/komputer-do/[gra]`).
7. **Zanim komputer wyjedzie z Rabki** — 5 etapów (Części, Montaż, Test obciążeniowy, Pomiar klatek, Metryka i wysyłka), ludzie (`[imię serwisanta]` za zgodą), wzór metryki na papierze z pieczęcią, „Zobacz przykładową metrykę”.
8. **Co mówią o nas klienci** — ocena i opinie Google (tylko prawdziwe, 1:1, z datą); **ukryta do czasu uzupełnienia**.
9. **Kupujesz komputer dla dziecka?** (jasna sekcja) — Prawdziwa firma od 2004 roku · Przyjedź i zobacz · Odpisuje człowiek, nie bot · Gwarancja z odbiorem od Ciebie; „Przewodnik dla rodziców”.
10. **Baba Jaga czy Wampir?** — zapowiedź porównywarki (3 istoty, słupki klatek), „Otwórz porównywarkę”.
11. **W cenie każdego komputera** — 10 pozycji (Windows 11, montaż, test, pomiar klatek, metryka, Wi-Fi i Bluetooth, sterowniki i BIOS, podstawowe programy, wysyłka, gwarancja 2 lata). Telefon: 2 kolumny.
12. **Zanim zapytasz** — 6 pytań z `faq.json`, grupa „Na stronie głównej” (`onHomeOnly`).
13. **Napisz, w co grasz** — końcowe wezwanie, 16 pieczęci, „Dobierz komputer” i „Zadaj pytanie”.

## 5. Wszystkie zestawy `/zestawy` (G9)
- Nagłówek „Wszystkie zestawy” + lead z planszy. Filtry: **Monitor** (Wszystkie, FullHD, 2K, 4K) · **Budżet** (Każdy, do 9 tys., 9–15 tys., ponad 15 tys.) · **Rodzaj** (Wszystkie, AMD, Intel, Białe) + licznik. Filtry w adresie (`?monitor=2k&budzet=…`).
- Karty: scena, poziom (`tierRoman`), kraina (`tierLabel`), imię, motto, 2–3 części (`components[].publicLabel`), Cyberpunk 2077 w `targetResolution` poziomu z etykietą źródła, cena, „Zobacz”. Kolejność: cena rosnąco.
- Reguły filtrów (jak JS planszy Zestawy): Monitor wg `power-levels.monitorFilters` (FullHD = Moc I–IV, 2K = Moc IV–VII, 4K = Moc VII–IX); Budżet: do 9 tys. = cena < 9 000, 9–15 tys. = 9 000–15 000, ponad 15 tys. = > 15 000; Rodzaj: AMD/Intel **wg procesora**, Białe = obudowa biała (`creatures.shell = white`). W adresie: `?monitor=fullhd|2k|4k&budzet=do9|9-15|od15&rodzaj=amd|intel|biale`.
- Pusty wynik: „Żaden zestaw nie pasuje do tych filtrów” + „Wyczyść filtry”.
- „Nadal nie wiesz, który?” → konfigurator / zapytanie.
- **Telefon:** monitor jako szybkie przyciski przyklejone do góry + „Filtry” (liczba aktywnych) otwierające arkusz z budżetem i rodzajem i przyciskiem „Pokaż N zestawów” (`stany/tel-03`, `tel-04`).

## 6. Karta zestawu `/zestawy/[slug]` (G9)
Sekcje (plansza Zestaw):
1. Hero: scena istoty, imię, przydomek, poziom; legenda „Z podań” ze źródłem; „W grach” (dar); przełącznik poprzedni/następny (16 istot). Galeria: przód, wnętrze, w ciemności, film z testu — prawdziwe zdjęcia naszego egzemplarza (do sesji zdjęciowej: poglądowe z podpisem).
2. **Dlaczego {istota}?** + wygląd (kolor światła; zmiana koloru przyciskiem na obudowie — tekst z planszy).
3. Cena (z `lib/pricing/`), „z montażem, Windows 11 i wysyłką”, data ceny (= data ostatniej publikacji cen, ADR-G002 §2), „Listę części potwierdzimy w ofercie ważnej 48 godzin”; **Zapytaj o {istotę}** · Zmień części (→ konfigurator z przepisem) · Porównaj · Wyślij rodzicowi ze specyfikacją (link + mail/SMS przez `mailto:`/`sms:`); obietnice (gotowy w 5–10 dni roboczych, wysyłka w cenie albo odbiór, metryka, 2 lata gwarancji z odbiorem). Na jaki monitor: FullHD / 2K / 4K z oceną jak w JS planszy Zestaw (z klatek zestawu).
4. **Ile klatek w Twojej grze** — 12+ gier, segmenty FullHD/2K/4K, etykiety źródeł, „Jak liczymy?”.
5. **Co jest w środku {istoty}** — plan wnętrza z 8 ponumerowanymi częściami (klik/dotyk podświetla część, opis, „Minimum, którego pilnujemy”), klasy części; obudowa i chłodzenie z pełną nazwą.
6. **Miejsce na rozbudowę** (`power-levels.upgrade`: wolne gniazda RAM, M.2, gniazdo procesora, moc zasilacza — `TODO(krystian)`: potwierdzić z modelem płyty przed publikacją).
7. **Dopasuj {istotę} pod siebie** — RAM, dysk, kolor światła; cena na żywo z `lib/pricing/`; „Zapytaj o tę wersję” (przekazuje konfigurację) i „Więcej zmian w konfiguratorze”.
8. **Od zapytania do Twojego biurka** — 8 etapów z czasem; **Zanim wyjedzie z Rabki** (60 min, 3 gry, 100% pamięci, BIOS) + przykładowa metryka.
9. **Co znajdziesz w pudełku** (8 pozycji — [serwis] potwierdzić listę).
10. **Gwarancja i opieka** (4 kafle) + **Co, jeśli…** (3 sytuacje).
11. **Opinie o {istocie}** — ukryte do czasu prawdziwych opinii.
12. **Inne istoty w pobliżu** (sąsiednie poziomy; telefon: karuzela).
13. **Pytania o {istotę}** (9 z `build-faq.json`, te same dla wszystkich zestawów) + link do `/pytania`.
14. **Dane producenta zestawu (GPSR):** PRO-KOM Tadeusz Wójciak, adres, e-mail; identyfikator zestawu; link do instrukcji bezpieczeństwa (PDF) — mały blok przy specyfikacji ([prawnik] potwierdzić zakres).
- **Pasek przyklejony:** pieczęć, imię, cena, „Zapytaj o {istotę}” (telefon: nad dolnym paskiem, `stany/tel-05`).
- JSON-LD: `Product` + `Offer` (cena z snapshotu, `priceValidUntil` = data ceny + 7 dni, dostępność „na zamówienie”), `BreadcrumbList`, `FAQPage`.

## 7. Konfigurator `/konfigurator` (G10)
Logika i zachowanie: **ADR-G002 §5–§6** (kroki, wyszarzenia z powodem, zmiana poziomu z zachowaniem wyboru, rozpoznanie gotowca, najbliższy gotowiec, ostrzeżenia, „Inna obudowa / chłodzenie”). Wygląd: plansza Konfigurator (1440) i Konfigurator-telefon, `stany/tel-07`, `tel-08`, `stany/konf-*`.
- Podgląd: zdjęcie wybranej obudowy, kolor światła; nazwa poziomu, najbliższy gotowiec, klatki na żywo (3 gry wybrane w kroku 1), cena.
- Podsumowanie: klasy części + pełne nazwy obudowy i chłodzenia, cena z Windows 11, montażem, testem i wysyłką, czas realizacji, gwarancja; **„Zapytaj o tę konfigurację”** (→ `/zapytanie?k=…`). Marży nigdzie nie pokazujemy.
- Stan w adresie i w `localStorage` (powrót do konfiguracji); „Zapisz na koncie” po zalogowaniu (G14).

## 8. Dobór pod grę `/dobor-pod-gre` i Komputer do gry `/komputer-do/[gra]` (G11)
- `/dobor-pod-gre`: „Komputer do {gry}”, lead, 33 gry jako przyciski (telefon: 3 rzędy przewijane), segmenty FullHD/2K/4K, **3 polecane** (reguła z planszy KomputerDo, dla wybranej gry i rozdzielczości, zestawy w kolejności ceny): **Najtaniej płynnie** = najtańszy z ≥ 60 kl./s; **Złoty środek** = najtańszy z ≥ 1,25 × klatek pierwszego; **Z zapasem** = najtańszy z ≥ 1,25 × klatek środka (brak → najdroższy płynny; nikt nie ma 60 → Perun), tabela 9 stopni mocy (zestaw z `tierLead`; pasek, liczba, „płynnie” ≥ 60 / „poniżej 60”, etykieta źródła), „Wymagania producenta”, „Skąd są liczby”, „Co znaczą kolory”. Telefon: polecane jako karuzela (`stany/tel-09`, `tel-10`).
- `/komputer-do/[gra]` — 33 stron SEO generowanych z danych: H1 „Komputer do {gry}”, lead (szablon + 1–2 zdania o grze), polecane na wybrany monitor, tabela poziomów z „płynnie / poniżej 60”, wymagania producenta (z datą i źródłem — **strona gry bez uzupełnionych wymagań ukrywa ten blok**), „O co pytają gracze” (FAQ gry — szablon z danych: skalowanie, RAM, RT), „Inne gry”. Bez logotypów i okładek gier. Meta i JSON-LD (`FAQPage`, `BreadcrumbList`).

## 9. Porównywarka `/porownaj` (G11)
Plansza Porownywarka (telefon: `stany/tel-13-porownywarka.jpg`; reguły werdyktu, kolorów macierzy i „+X% za Y zł” — dokładnie jak w JS `boards/Porownywarka.dc.html`): do 3 istot (sloty z wyborem dowolnej z 16), gra (33), rozdzielczość, odświeżanie monitora (60/144/240 Hz) → **werdykt** („Baba Jaga wystarczy” / „Za mało mocy na ten monitor” + podpowiedź), wykres klatek z liniami 60 kl./s i odświeżania, „Z {A} na {B}: +X% klatek za dopłatę Y zł”, macierz wszystkich gier (kolor: poniżej 60 / płynnie / wykorzystuje monitor), tabela podzespołów i „w cenie” z trybem „Tylko różnice”, „Wyślij to porównanie” (link ze stanem, mail, kopiuj). Stan w adresie. Telefon: plansza Porownywarka-telefon.

## 10. Zapytanie `/zapytanie` i `/zapytanie/wyslane` (G12)
- 4 kroki (plansza Formularz): **1. Komputer** — Od czego zaczynasz? (Wiem, który zestaw → 16 pieczęci · Pomóżcie mi dobrać → dla kogo i budżet · Mam własną listę → tekst/link); **2. Gry i monitor** — gry (kilka), inne gry, monitor, odświeżanie, obudowa, podświetlenie, „Potrzebujesz też” (monitor, peryferia, słuchawki, Office, dodatkowy dysk — wycenimy osobno); **3. Kontakt** — imię, e-mail, telefon (co najmniej jedno), preferowany kontakt, odbiór (kurier / Rabka / Zakopane), faktura na firmę + NIP (suma kontrolna), uwagi, zgoda RODO (link do polityki), osobno zgoda marketingowa (domyślnie odznaczona); **4. Sprawdzenie** — podsumowanie z „Zmień” przy każdej sekcji. Z boku na żywo „Twoje zapytanie” (istota/konfiguracja, cena).
- Wejścia: `?zestaw=wampir`, `?k=<konfiguracja z konfiguratora>`, porównanie, bon, „Gotowe od ręki” (rezerwacja).
- Walidacja z konkretnymi komunikatami (plansza). Typ zapytania: Wiem, który zestaw → `build` (albo `config` z konfiguratora), Pomóżcie mi dobrać → `advice`, Mam własną listę → `custom_list`. Wysyłka → `POST /api/inquiry` (ADR-G005) → `/zapytanie/wyslane?nr=PKG-…`.
- **Wysłane:** scena istoty, pieczęć budzi się (jedyna animacja), „Zapytanie wysłane”, numer, „Co będzie dalej” (Teraz · W ciągu godziny · Gdy zaakceptujesz [pro forma, przelew albo BLIK] · 5–10 dni roboczych), „Twoja konfiguracja”. Licznik zapytania zeruje się.
- Maile: powiadomienie do skrzynki Gaming i potwierdzenie dla klienta — treści w G12 (szablon z planszy „Co będzie dalej”).

## 11. Gotowe od ręki `/gotowe` (G13)
Plansza Gotowe: egzemplarze z kolekcji `stock` (miejsce Rabka/Zakopane, stan, cena za egzemplarz, części), „Zarezerwuj” (zapytanie `type: ready`, rezerwacja 24 h), pusty stan „Nie ma tego, czego szukasz?” + „Powiadom mnie” (zapytanie). [SZEF] ile egzemplarzy i gdzie.

## 12. Bon podarunkowy `/bon` (G13)
Plansza Bon: podgląd bonu na żywo (kwota, wygląd jednej z 4 istot, dla kogo, dedykacja), „Zamów bon” (zapytanie `type: voucher`), „Jak to działa” (3 kroki), pytania. Kwoty startowe 500 / 1000 / 2000 / 3000 zł, ważność 12 mies. — **[SZEF] decyzja przed publikacją** (inaczej strona ukryta).

## 13. Metryka `/metryka/[kod]` (G14)
Plansza Metryka: „{Istota}, egzemplarz nr …”, kto złożył i przetestował, data, test obciążeniowy (czas, wynik), temperatury maks., klatki zmierzone (3 gry), części z producentem, modelem, SN i gwarancją, gwarancja PRO-KOM do daty, „Pobierz PDF”. Bez danych klienta. `/metryka` bez kodu: pole „Wpisz kod z naklejki”. Nieznany kod → 404. `noindex`.

## 14. Warsztat (G14)
Taśma na głównej (§4 pkt 2) z `orders` (etap, nazwa zestawu, kolor). Pełna strona `/warsztat` — **poza zakresem 20.11** (brak planszy; ewentualnie w grudniu wg wzoru taśmy).

## 15. Konto `/konto` (G14)
Plansza Konto: „Cześć, {imię}”, **Moje komputery** (oś etapów zamówienia, metryka, faktura), **Gwarancje** (PRO-KOM + części), **Zgłoś problem** (egzemplarz, kategoria, opis, zgoda na pomoc zdalną), historia zgłoszeń, **Zapisane konfiguracje** (otwórz w konfiguratorze), dane i zgody, wyloguj. Logowanie: e-mail + hasło (Payload auth, weryfikacja e-maila, reset hasła). Pierwszy cel do cięcia (ADR-G005).

## 16. Dla rodziców `/dla-rodzicow` (G13)
Plansza Rodzice: H1 „Komputer dla dziecka bez stresu i bez żargonu”, „Sprawdź nas, zanim zapłacisz” (firma od 2004, NIP, CEIDG, biała lista VAT z linkami), „Jak to wygląda, krok po kroku” (4 kroki, płatność przelew/BLIK), „W co gra Twoje dziecko?” (gry → istoty), „Bezpieczeństwo i spokój” (kontrola rodzicielska w Windows 11, pytania — w tym „Czy da się kupić na raty?” → „Na razie nie prowadzimy sprzedaży ratalnej…”).

## 17. O nas `/o-nas` (G13)
Plansza OFirmie: historia (od 2004), 4 linie PRO-KOM, ludzie (szef, `[imię serwisanta]`, Krystian — zdjęcia i imiona tylko za zgodą), warsztat, „W co wierzymy” (4 zasady), „PRO-KOM to nie tylko gaming” (linki do stron linii), dane firmy, kontakt.

## 18. Kontakt `/kontakt` (G13)
Plansza Kontakt: 3 kanały (zapytanie, telefon, e-mail), 2 sklepy z godzinami i mapą (statyczny obraz mapy z linkiem do Google Maps — bez osadzonego iframe przed zgodą), „Krótkie pytanie?” (formularz `type: contact`), „Masz już komputer od nas?” (→ konto / zgłoszenie).

## 19. Pytania `/pytania` (G13)
Plansza FAQ: 5 grup, 21 pytań z `seed/prokomgaming/faq.json` (Zakup i płatność, Dostawa i odbiór, Zwroty i gwarancja, Technika i klatki, Dla rodziców), przełączanie grup, JSON-LD `FAQPage`.

## 20. Poradniki (G13)
Kolekcja `guides` (tytuł, slug, kategoria, lead, treść Lexical, czas czytania, istota, autor „Zespół PRO-KOM Gaming”, data, polecane istoty). Lista (plansza Poradniki: wyróżniony + siatka + filtry tematów) i wpis (plansza Poradnik: spis treści, ściągawka, polecane istoty, „Czytaj dalej”). Na start: wpis wzorcowy „Jak kupić komputer do gier dla dziecka i nie przepłacić” (kwoty z cennika); pozostałe 6 tytułów z `guides.json` jako szkice (niepublikowane).

## 21. Regulamin, polityka prywatności, cookies (G13)
Plansze Regulamin i Prywatnosc — **projekty do weryfikacji przez prawnika** (napis na górze do czasu akceptacji). Treść jako rich text w globalach `legal-terms`, `legal-privacy` (zmiana bez wdrożenia), wersja i data. Regulamin bez platformy ODR (wyłączona 20.07.2025), bez rat. Wzór formularza zwrotu (PDF). Panel ustawień cookies z przełącznikami (§24).

## 22. Panel (G3, G4, G15)
Grupy w panelu: **Sprzedaż** (Zapytania, Zamówienia, Egzemplarze, Zgłoszenia, Gotowe od ręki, Bony, Klienci) · **Oferta** (Zestawy, Poziomy mocy, Opcje, Ceny — publikacja, Historia cen) · **Gry i klatki** (Gry, Wyniki FPS) · **Treści** (Poradniki, Pytania, Ustawienia strony, Regulamin, Polityka) · **Administracja** (Użytkownicy: role `admin`, `serwis`). Ekran „Ceny”: kolejka do zatwierdzenia, strażnik marży, import CSV, widok zestawów (cena, koszt, marża, zmiana) — ADR-G002 §4.

## 23. SEO (G15)
- Meta `title`/`description` unikalne (szablony: zestaw — „{Istota} — komputer do gier {rozdzielczość}, {cena} zł | PRO-KOM Gaming”; gra — „Komputer do {gry}: ile klatek w FullHD, 2K i 4K | PRO-KOM Gaming”).
- JSON-LD: `Organization` + `LocalBusiness` ×2 (Rabka, Zakopane), `Product`/`Offer` (zestawy), `FAQPage`, `BreadcrumbList`, `Article` (poradniki).
- `sitemap.xml` (strony, 16 zestawów, 33 gry, opublikowane poradniki), `robots.txt`; staging `noindex`. Metryka, konto, zapytanie: `noindex`.
- Frazy: komputer do gier, komputer do Fortnite / CS2 / Minecrafta, komputer gamingowy do 5000 / 8000 zł, biały komputer gamingowy, komputer do gier dla dziecka.
- Obrazy WebP/AVIF, LCP < 2,5 s na telefonie (hero nie blokuje renderu).

## 24. Analityka i cookies (G15)
Na start **bez cookies analitycznych i marketingowych** (baner wyłączony flagą w ustawieniach). Pomiar: jeśli w `prokom-web` zostanie przyjęty ADR o Umami (bez cookies) — ta sama instancja, zdarzenia: wejście w konfigurator i kroki, wysłane zapytanie (źródło: zestaw / konfigurator / porównanie / bon), „Wyślij rodzicowi”, porównanie. Piksele Meta i TikTok tylko po osobnym ADR i zgodzie (wtedy baner włączony).

## 25. Wymogi prawne (do potwierdzenia z prawnikiem i księgową przed startem)
Zwrot 14 dni neutralnie (nie atut) · gwarancja PRO-KOM odróżniona od rękojmi · dane producenta zestawu i informacje o bezpieczeństwie (GPSR) · deklaracja zgodności CE dla zestawu · BDO i odbiór 1:1 zużytego sprzętu · Omnibus (najniższa cena z 30 dni przy obniżce — `price-history`) · ceny brutto z datą · klatki bez gwarancji · bez logotypów gier · polityka prywatności z celami, podstawami i okresami. Źródła i szczegóły: `10-prawo-i-ryzyka.md` w dokumentacji projektu u Krystiana (`Pulpit\prokom-gaming`, poza repo).

## 26. Do uzupełnienia przed publikacją
`[ocena]`, `[liczba]` opinii, `[telefon]` (gdy inny niż sklep), e-mail Gaming, `[imię serwisanta]` i zdjęcia ludzi (zgody), lista „Co w pudełku”, długość testu, wymagania producenta 33 gier (z datą), zdjęcia egzemplarzy 16 zestawów, kwoty bonów, egzemplarze „Gotowe od ręki”, firma kurierska, BLIK, prawnik: regulamin i polityka.

## 27. Kryteria odbioru całości
1. Ceny 16 zestawów na stronie = `tests/fixtures/pricing-expected.json`; cena tej samej konfiguracji identyczna na karcie, w konfiguratorze, porównywarce, zapytaniu i mailu.
2. Żaden `internalModel`, koszt ani marża nie występuje w HTML ani w API publicznym (test porównuje z listą `internalModel` z bazy — części poziomu mocy, RAM i dysków, bez obudów i chłodzeń, ADR-G002 §8.7; nazwy układów, np. „RTX 5070”, i producenci obudów oraz chłodzeń są na stronie celowo).
3. Każda liczba klatek ma etykietę źródła; „Jak liczymy?” z linkami.
4. Zapytanie z każdej ścieżki (zestaw, konfiguracja, porównanie, kontakt, bon, gotowe) zapisuje rekord, wysyła 2 maile i pokazuje numer.
5. Wszystkie strony zgodne ze zrzutami 1440 i 414; dolny pasek, menu i arkusze działają na Androidzie i iPhonie; klawiatura i axe bez błędów.
6. Lighthouse mobile ≥ 90 (4 kategorie) na: `/`, `/zestawy`, `/zestawy/wampir`, `/konfigurator`, `/komputer-do/cyberpunk-2077`.
7. Zero nawiasów kwadratowych w HTML produkcji; zero słowa „Santander”, kalkulatora i oferty rat (jedyne dozwolone „raty” jako całe słowo: pytanie FAQ „Czy mogę kupić na raty?” z odpowiedzią „Na razie nie…”; test na całe słowa, nie fragmenty jak „utraty”).
8. `sitemap.xml`, `robots.txt`, JSON-LD bez błędów w Rich Results Test.

## 28. Poza zakresem 20.11
Płatności online i raty · import cen z API hurtowni (v1: CSV) · pełna strona `/warsztat` · edycje limitowane · Django / Strefa Klienta (2027) · zmiana procesora lub karty poza poziomami · wersje językowe.
