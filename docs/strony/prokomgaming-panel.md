# Panel PRO-KOM Gaming — specyfikacja (wersja 1, 30.10.2026)

Status: **zaakceptowana przez Krystiana 30.10.2026** (wizualizacja v8: 12 ekranów na komputer + każdy ekran na telefonie jak aplikacja; decyzje w ADR-G006…G010).
Wzorzec wyglądu: `docs/design/prokomgaming/panel/` (zrzuty 1440 i 414, stany telefonu `stany/tel-*`, plansze `.dc.html` do podglądu lokalnego). Oryginał na płótnie Claude Design „PRO-KOM Gaming · panel” (link w README wzorca).
Sesje budowy: `docs/zadania/prokomgaming-panel.md` (P0–P8).

Ten dokument opisuje **panel dla Krystiana** (Payload `/admin`): codzienną pracę z zapytaniami, cenami, ofertą, zamówieniami i statystykami. Strona publiczna nadal jest w `docs/strony/prokomgaming.md`. Gdy coś się różni — w sprawach panelu wygrywa ten plik, w sprawach strony tamten.

---

## 0. Zasady nadrzędne
1. **Panel to Payload `/admin` + własne widoki** (ADR-G006). Domyślne listy i formularze Payload zostają jako widok „zaawansowany” każdej kolekcji. Bez drugiej aplikacji.
2. **Pieniądze liczy tylko `lib/pricing/`** (ADR-G002). Żaden widok, żaden model AI nie liczy cen ani marż po swojemu. Claude znajduje i czyta ceny w sklepach, kod liczy (ADR-G007).
3. **Nic nie zmienia się na stronie samo.** Każda zmiana ceny idzie przez kolejkę „Do zatwierdzenia” i strażnika marży z G4. `autoPublish` zostaje wyłączone.
4. **Dane osobowe nigdy nie trafiają do Claude** ani do statystyk. Do Claude idą tylko nazwy produktów, kody i ceny.
5. **Jedna osoba to obsługuje.** Każdy ekran odpowiada na pytanie „co mam teraz zrobić”, a nie pokazuje wszystkiego naraz. Najpilniejsze na górze.
6. Teksty z plansz przenosisz bez zmian. **Liczby na planszach są przykładowe** (poza cenami i marżami z partii 1, które pochodzą z cennika z 25.10.2026) — porównujesz układ, nie wartości.

## 1. Mapa ekranów
| Ekran | Adres w panelu | Plansza / zrzut | Sesja | Dane |
|---|---|---|---|---|
| Pulpit „Dziś” | `/admin` (zastępuje dashboard) | `Main` | P2 | wszystkie poniżej |
| Zapytania (skrzynka, wątek, odpowiedź) | `/admin/zapytania`, `/admin/zapytania?nr=PKG-…` | `Zapytania` | P3, P4 | `inquiries`, `inquiry-messages`, `reply-templates` |
| Klienci (lista) | `/admin/klienci` | — (bez planszy: `DataTable` jak w Centrum cen) | P5 | zapytania i zamówienia zgrupowane po e-mailu: imię, ostatni kontakt, liczba zapytań, zamówienia, wydał |
| Karta klienta | `/admin/klient?zapytanie=<id>` albo `?konto=<id>` | `Klient` | P5 | zapytania, zamówienia, egzemplarze, zgłoszenia o tym samym e-mailu |
| Zamówienia i warsztat | `/admin/zamowienia` | `Zamowienia` | P5 | `orders` (G14), `units` |
| Statystyki strony | `/admin/statystyki` | `Statystyki` | P8 | Umami (API) + `inquiries`, `orders` |
| Raport sprawdzenia cen | `/admin/raporty-cen` (lista: data, uruchomienie, status, znalezione, koszt, alarmy — `DataTable`, bez planszy; pozycja w nawigacji otwiera najnowszy nieprzeczytany raport, inaczej listę), `/admin/raporty-cen/<id>` | `Raport` | P7 | `price-checks`, `price-observations` |
| Do zatwierdzenia + strażnik | `/admin/ceny/zatwierdzanie` | `Publikacja` | P6 | kolejka i strażnik z G4 |
| Centrum cen | `/admin/ceny` (rozbudowa ekranu z G4) | `Ceny` | P6 | `power-levels`, `options`, `published-prices` |
| Gotowe zestawy | `/admin/zestawy` | `Zestawy` | P6 | `builds` |
| Edytor zestawu | `/admin/zestawy/<slug>` | `Zestaw` | P6 | `builds` + `lib/pricing`, `lib/compat` |
| Opcje konfiguratora | `/admin/opcje` | `Opcje` | P6 | `options`, `power-levels` |
| Ustawienia | `/admin/ustawienia` | `Ustawienia` | P1 (szkielet), P3/P4/P5/P7/P8 (sekcje) | globale |
| Telefon: każdy ekran powyżej | te same adresy przy ≤ 760 px (§2a) | `<Ekran>-414`, `stany/tel-01…10`, plansze `Telefon`, `TelefonZapytanie`, `TelefonWiecej` | P1 (powłoka), dalej w sesji ekranu | — |

Nazwy ścieżek po polsku (jak `/admin/ceny` z G4). Widoki z podścieżkami (`/admin/ceny` + `/admin/ceny/zatwierdzanie`, `/admin/zestawy` + `/<slug>`, `/admin/raporty-cen` + `/<id>`) — sprawdź w P1 `exact` i kolejność rejestracji widoków, żeby widok ogólny nie przechwytywał podścieżek. W adresach nie ma danych osobowych (żadnych e-maili, imion, telefonów) — tylko numery i identyfikatory.

## 2. Wygląd panelu
- **Kierunek:** ciemny, spokojny panel pracy w rodzinie wyglądu strony: ciemna zieleń prawie czarna, złoty akcent „Grom”, pieczęcie i imiona istot w Cinzel. Gęste tabele, jasne statusy, liczby wyrównane (`tabular-nums`).
- **Tokeny panelu** (osobny plik `src/admin/styles/panel-tokens.css`, nie mieszamy z `tokens.css` strony):
  `--p-bg #080C0B` · `--p-side #050807` · `--p-s1 #0F1613` · `--p-s2 #141D19` · `--p-s3 #1A2520` · `--p-ln rgba(236,228,208,.09)` · `--p-ln2 rgba(236,228,208,.16)` · `--p-tx #ECE4D0` · `--p-tx2 #C2BAA4` · `--p-mu #9A9583` · `--p-gold #F2C230` · `--p-gold2 #FFE08A` · `--p-ok #63D296` · `--p-warn #F2A54A` · `--p-bad #FF7A6B` · `--p-info #86B8F7`. Kolory istot: z `tokens.css` strony (jedno źródło).
- **Kroje:** Manrope (interfejs, 13–14 px w tabelach, 28 px tytuł ekranu), Cinzel 700 tylko imiona istot. Pliki jak na stronie (`next/font`, nasza domena).
- **Statusy** zawsze kolorem **i** kształtem/tekstem: `ok` (zielony, kropka), `warn` (pomarańczowy), `bad` (czerwony, romb), `info` (niebieski), `gold` (do zrobienia), `mu` (neutralny). Progi marży: `< minMargin` bad, `< warnMargin` warn, reszta ok (`warnMargin` w ustawieniach, domyślnie 12%).
- **Komponenty panelu** (`src/admin/ui/`, prefiks `pn-`): `PanelShell` (pasek boczny + górny pasek na komputerze; pasek aplikacji, dolne zakładki i arkusz „Więcej” na telefonie — §2a), `PanelPage` (nagłówek ekranu + akcje), `Card`, `Kpi` (+ `Spark`), `Chip`, `Seg` (segmenty), `FilterPill`, `DataTable` (nagłówek przyklejony; na telefonie tryb kart — §2a), `ActionBar` (akcja pod kciukiem na telefonie), `Sheet` (arkusz od dołu), `MarginBar` (linia minimum), `Alert` (bad/ok), `ClaudeNote` (podsumowania i podpowiedzi), `Feed`, `Toggle`, `Drawer`, `EmptyState`.
- **Motyw Payload:** zmienne motywu ciemnego Payload ustawione tak, żeby domyślne listy i formularze pasowały kolorystycznie (sprawdź w dokumentacji zainstalowanej wersji, jak dodać własny CSS panelu). Własne widoki stylujemy w całości.
- **Nawigacja** (lewy pasek Payload, grupy jak na planszach; łączenie własnych widoków i kolekcji w grupy z licznikami najpewniej wymaga własnego komponentu `admin.components.Nav` — sprawdź w P1): Codziennie (Pulpit, Zapytania [licznik nowych], Zamówienia [w realizacji], Klienci) · Ceny (Centrum cen, Raporty cen [nowy raport], Do zatwierdzenia [licznik kolejki]) · Oferta (Gotowe zestawy, Opcje konfiguratora) · Analiza (Statystyki strony) · System (Ustawienia). Kolekcje Payload bez własnego widoku zostają w nawigacji w grupie „Dane” (zwinięta).
- **Górny pasek własnych widoków:** okruszki, wyszukiwarka (P8), stan strony („Strona działa · ceny z <data partii>”), dzwonek (suma: nowe zapytania + pilne alarmy), przycisk „Sprawdź ceny” (P7; do tego czasu ukryty).
- **Dostępność:** AA (tekst 4,5:1), fokus widoczny, prawdziwe `button`/`a`/`input` z etykietami, axe bez błędów na każdym widoku, `prefers-reduced-motion`.
- **Telefon:** osobny rozdział §2a — panel na telefonie ma działać jak dobra aplikacja, nie jak ściśnięta strona.

## 2a. Telefon jak aplikacja (≤ 760 px)
Krystian odpowiada klientom i zatwierdza ceny z telefonu, często w biegu. Na telefonie panel ma działać jak najlepsza aplikacja: wszystko pod kciukiem, bez przybliżania i bez przewijania w bok. Wzorzec: `screens/<Ekran>-414/`, `stany/tel-01…10`, plansze `Telefon`, `TelefonZapytanie`, `TelefonWiecej` (otwórz planszę w oknie ≤ 760 px — każda plansza ma tryb telefonu).
1. **Zakres:** wszystkie własne widoki. Domyślne listy i formularze Payload (grupa „Dane”) zostają w mobilnym wyglądzie Payload; wejście z „Więcej → Dane”, powrót przez menu Payload (grupy nawigacji zawierają nasze widoki) — w P1 sprawdź, czy da się dodać tam stały link „Panel”. Na naszych widokach pasek boczny i nagłówek Payload są ukryte — w P1 sprawdź w dokumentacji zainstalowanej wersji, jak (własny szablon widoku albo CSS panelu); jeśli się nie da, odstępstwo do STAN.
2. **Pasek aplikacji** (góra, 56 px + `safe-area-inset-top`, rozmyte tło): na Pulpicie logo; na pozostałych tytuł ekranu, który pojawia się w pasku dopiero po przewinięciu (w treści duży tytuł 31 px, jak w aplikacjach iOS); „Wstecz” na ekranach szczegółu (Edytor zestawu → Zestawy, Klient → Zapytania, Raport → Pulpit); po prawej: szukaj (pełny ekran, P8) i dzwonek z licznikiem.
3. **Dolne zakładki** (przyklejone, rozmyte tło, `safe-area-inset-bottom`): Pulpit · Zapytania [nowe] · Zatwierdź [kolejka] · Zestawy · Więcej. **Do czasu P6** „Zatwierdź” prowadzi do istniejącego `/admin/ceny` z G4, a „Zestawy” do listy Payload `builds`; kafle Centrum cen, Opcje, Raporty cen i Statystyki w „Więcej” są ukryte, dopóki ich sesja nie powstanie. **Rola `serwis`:** zakładki Warsztat · Zgłoszenia · Egzemplarze · Więcej, start i przekierowanie po zalogowaniu na `/admin/zamowienia` (P5). Aktywna: złota pigułka za ikoną i złoty podpis. Cel dotyku ≥ 48 px. Ukryte w wątku zapytania (pełny ekran rozmowy).
4. **Arkusz „Więcej”** (od dołu, uchwyt, przyciemnione tło; zamyka go dotknięcie tła, gest w dół i Esc; fokus zamknięty w arkuszu, powrót fokusu na „Więcej”): stan strony i kolejki, „Sprawdź ceny” (P7), kafle 3 w rzędzie z licznikami: Zamówienia, Klienci, Centrum cen, Raporty cen, Opcje, Statystyki, Ustawienia, Dane, Strona (nowa karta prokomgaming.pl); konto i „Wyloguj”.
5. **Treść:** jedna kolumna, margines 16 px, karty z zaokrągleniem 18 px; kafle liczb 2 w rzędzie; filtry, segmenty, zakładki i rzędy przycisków w jednym rzędzie przewijanym palcem (bez zawijania, bez paska przewijania); **tabele jako karty** (`DataTable` na telefonie: pierwsza kolumna = tytuł karty, reszta = pary „etykieta nad wartością” w 2 kolumnach, pole wyboru w prawym górnym rogu karty); tablica warsztatu jako kolumny przesuwane palcem (przyciąganie, kolumna ≈ 85% szerokości, widać brzeg następnej).
6. **Akcja pod kciukiem** (`ActionBar`, przyklejony nad zakładkami): Do zatwierdzenia — najniższa marża (kolor strażnika) + „Opublikuj N cen” (zablokowany jak na komputerze); Edytor zestawu — cena, marża i marża przy dzisiejszych kosztach + „Do zatwierdzenia”. Wartości liczone tak samo jak w karcie obok (`lib/pricing`).
7. **Zapytania** (rola `admin`; `serwis` nie ma dostępu do zapytań): lista i wątek to dwa ekrany (wątek pod `?nr=`; „Wstecz” w nagłówku, przycisk wstecz przeglądarki i gest wracają do listy z zachowanym filtrem i miejscem). Wątek na pełny ekran: nagłówek (wstecz, temat, numer, statusy przewijane w jednym rzędzie), wiadomości 15 px, pod spodem dane klienta i konfiguracja; pole odpowiedzi przyklejone na dole z szablonami w jednym rzędzie i „Wyślij”. Telefon klienta jako link `tel:`.
8. **Formularze:** pola ≥ 48 px, tekst 16 px (iOS nie przybliża strony), `inputmode` (`decimal` dla kosztów i cen, `tel`, `email`), `enterkeyhint` („wyślij”, „dalej”), etykiety zawsze widoczne.
9. **Ruch i dotyk:** reakcja na dotknięcie (zmniejszenie do 0,97 w 120 ms), arkusz wjeżdża w ok. 300 ms, tytuł paska pojawia się płynnie; wszystko wyłączone przy `prefers-reduced-motion`. Bez animacji wejścia sekcji i bez efektów dla ozdoby.
10. **Szybkość:** dane ekranu z jednego loadera serwerowego; Pulpit i Zapytania gotowe do pracy w ≤ 2,5 s na telefonie przez 4G (pomiar ręczny Lighthouse mobile po zalogowaniu, wynik do STAN).
11. **Do ekranu głównego (PWA, ADR-G010):** manifest dla `/admin` (`scope: "/admin"`, „PRO-KOM Panel”, `display: standalone`, `theme_color #080C0B`, ikony 192/512 i maskowalna, `apple-touch-icon`), `viewport-fit=cover`. Service worker **tylko** do powiadomień push — bez przechowywania danych panelu na telefonie. Manifestu nie robimy przez `app/manifest.ts` (obejmie całą stronę) — `<link rel="manifest">` i meta tylko w layoucie panelu; jak, sprawdź w P1 (Payload `RootLayout` ma `<head>`).
12. **Powiadomienia push (ADR-G010):** zdarzenia z tabeli §14 (kolumna „push”). Treść bez danych osobowych (np. „Nowe zapytanie PKG-2026-0047 · Wampir”); dotknięcie otwiera właściwy ekran. Włączanie w Ustawieniach → Powiadomienia: „Włącz na tym urządzeniu”, lista urządzeń z „Usuń”, „Wyślij próbne”, wybór rodzajów. iPhone: powiadomienia działają po dodaniu panelu do ekranu głównego (iOS/iPadOS 16.4+, [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)) — panel pokazuje instrukcję „Udostępnij → Do ekranu początkowego”.

## 3. Pulpit „Dziś” (`/admin`)
Kolejność (zrzut `Main-1440`):
1. Tytuł „Dziś”, data, akcje: Statystyki, Zapytania. (Oferta bez zapytania klienta — poza v1, §19; ofertę wysyłasz z wątku zapytania szablonem „Oferta z listą części”.)
2. 4 kafle z wykresikiem 30 dni: Zapytania dziś (+ różnica do wczoraj, ile czeka), Odwiedzający dziś (Umami; bez Umami kafel znika), Średnia marża gotowców (przy dzisiejszych kosztach), Najniższa marża w konfiguratorze (pełny przegląd z `lib/pricing/cost.ts`, czerwony poniżej minimum).
3. **Czeka na Ciebie** — lista zadań od najpilniejszego, każde z przyciskiem do miejsca, gdzie się je załatwia. Reguły (P2):
   - zapytania `new` bez odpowiedzi; czerwone, gdy czekają dłużej niż `replySlaMinutes` (domyślnie 60) w godzinach 8–22;
   - kolejka „Do zatwierdzenia” niepusta; czerwone, gdy najniższa marża przy obecnych cenach < `minMargin`;
   - pozycje niedostępne w ostatnim raporcie cen, używane w zestawach;
   - zamówienia z terminem w ciągu 2 dni roboczych, które nie są w etapie „Wysłane”;
   - nowy raport cen nieprzeczytany.
   Pusta lista = „Wszystko załatwione” (stan pusty z planszy, bez dekoracji).
4. Marża gotowych zestawów: 16 wierszy od najniższej, pasek z linią minimum, przełącznik „Ceny z partii / Dzisiejsze koszty / Po zatwierdzeniu” (trzeci tylko, gdy kolejka niepusta).
5. Ostatnie zapytania (4), Warsztat (liczba w każdym etapie), Ceny na rynku (zmiany z ostatniego raportu wg kategorii).
6. Ruch na stronie (30 dni), Ostatnie zdarzenia (zapytanie, alarm, raport, publikacja, zmiana etapu).

## 4. Zapytania (`/admin/zapytania`)
Trzy kolumny (zrzut `Zapytania-1440`): lista · wątek · klient i konfiguracja. Na telefonie lista → wątek → dane klienta pod spodem (`TelefonZapytanie`).
- **Lista:** wyszukiwarka (numer, imię, zestaw), filtry Wszystkie / Nowe / W toku (`in_progress` + `offer_sent`) / Zamknięte (`won`, `lost`, `closed`) z licznikami. Wiersz: inicjały, imię, czas, temat (zestaw / „Dobór do X zł” / „Własna konfiguracja” / rodzaj), początek wiadomości, status, rodzaj, czas oczekiwania (pomarańczowy do SLA, czerwony po). Nowe z kropką. Sortowanie: nowe od najstarszego czekającego, potem reszta od najnowszej aktywności.
- **Wątek:** wiadomość klienta (z formularza), wpis systemowy o potwierdzeniu, wysłane odpowiedzi, odpowiedzi klienta z poczty (P4), notatki wewnętrzne (niebieskie, klient ich nie widzi). Nagłówek: temat, numer, rodzaj, data, przełącznik statusu + menu. Mapowanie: Nowe = `new`, W toku = `in_progress`, Oferta = `offer_sent`, Zamówienie = `won`, Bez zamówienia / „Oznacz: bez zakupu” = `lost`, Zamknięte = `closed`.
- **Odpowiedź:** szablony (`reply-templates`), pole tekstu, „Notatka wewnętrzna”, „Wyślij”. Wysyłka: ADR-G008. Po wysłaniu status `new` → `in_progress` automatycznie; wysłanie szablonu oznaczonego „oferta” → `offer_sent`. Pod polem: od kogo → do kogo (adres klienta częściowo ukryty na liście, pełny w karcie).
- **Szablony** (seed, edytowalne): Potwierdzenie i termin · Oferta z listą części · Prośba o szczegóły · Raty: na start nie. Zmienne: `{nr}`, `{zestaw}`, `{cena}`, `{czesci}` (imienna lista części z `internalModel` — w ofercie klient dostaje modele, ADR-G002 dopuszcza to w ofercie, nie na stronie), `{termin}` (termin realizacji z `site-settings`, na planszy „5–10 dni roboczych”), `{podpis}` (z `mail-settings`). Treść szablonów startowych: plansza `Zapytania` (JS planszy, stała `TPL`) — przenieś 1:1 razem ze zmiennymi `{termin}` i `{podpis}`; **podpis nie jest dopinany automatycznie** (tylko przez `{podpis}`), żeby nie było go dwa razy. Piąty szablon startowy (rodzaj `stage`, e-mail przy zmianie etapu, bez planszy): „Dzień dobry,\n\nTwój komputer {zestaw} (zamówienie {nr_zam}) jest teraz na etapie: {etap}.\n\n{podpis}”. Powitanie „Dzień dobry,” bez imienia (bez odmiany imion).
- **Prawa kolumna:** imię, preferowany kontakt, e-mail, telefon, skąd (`source`: UTM/referrer z formularza), faktura (NIP), link „Karta klienta”; konfiguracja tak jak widział ją klient (`publicLabel`), cena przy zapytaniu i **cena dziś** (z najnowszej partii), marża (tylko panel), gry, monitor, odbiór; akcje: „Zamień w zamówienie” (tworzy `orders` z kodami i ceną, status zapytania `won`; P3, wymaga `orders` z G14 — bez G14 przycisk ukryty) i „Oznacz: bez zakupu”.
- **SLA:** godziny 8–22 z `site-settings`, alarm po `replyAlarmMinutes` (domyślnie 45) dla `new` (zadanie `inquiry-sla` co 5 min, jedno powiadomienie na zapytanie — znacznik `inquiries.slaAlertedAt`).
- **Wyszukiwarka zapytań** (imię, numer, zestaw) przez akcję serwera (POST) — imię nigdy w adresie ani w logach.

## 5. Poczta zapytań (szczegóły: ADR-G008)
- Wysyłka przez adapter e-mail Payload (nodemailer, SMTP skrzynki Gaming). Temat: `Re: [PKG-2026-0047] <temat>`. `Message-ID` zapisywany w `inquiry-messages`, `In-Reply-To`/`References` ustawiane w kolejnych wiadomościach wątku.
- Odbiór: zadanie `mail-intake` co 2 min (IMAP, biblioteka `imapflow`), dopasowanie po numerze w temacie albo `In-Reply-To`; bez dopasowania → „Nieprzypisane” (osobny filtr listy, ręczne przypięcie albo odrzucenie).
- Treść przychodząca: tylko tekst (HTML → tekst, cytowany poprzedni mail obcięty), bez obrazów zdalnych; załączniki nie są pobierane — w wątku „Załącznik w poczcie: nazwa, rozmiar”.

## 6. Karta klienta (`/admin/klient`)
- Klient = **ten sam znormalizowany e-mail** w `inquiries`, `orders`, `units`, `tickets`, `customers`. Wejście z zapytania (`?zapytanie=<id>`) albo konta (`?konto=<id>`); serwer zbiera rekordy po e-mailu. Bez nowej kolekcji klientów.
- Nagłówek (inicjały, imię, „klient od”, źródło, preferowany kontakt, akcje: Napisz → wątek ostatniego zapytania, telefon — na telefonie link `tel:`, na komputerze tekst do skopiowania), 4 kafle (wydał łącznie z zamówień, zapytania + czas pierwszej odpowiedzi, komputer w warsztacie, gwarancja do).
- Zakładki: Oś czasu · Zapytania i zamówienia · Komputer i gwarancja (egzemplarz, części z numerami seryjnymi, metryka) · Zgłoszenia · Zgody i RODO (zgody z zapytań, konto, okres przechowywania, **Eksport danych** = JSON wszystkich rekordów z `inquiries`, `inquiry-messages`, `orders`, `units`, `tickets`, `customers` i `push-subscriptions` (gdy dotyczy), **Usuń dane na żądanie** = istniejąca ścieżka usuwania z G6 + odpowiedniki w nowych kolekcjach, z potwierdzeniem w panelu, ślad w `inquiry-deletions`).
- Notatki o kliencie: pole `notes` w `customers`, a gdy klient nie ma konta — notatka wewnętrzna w wątku ostatniego zapytania.
- **Bez danych z wizyt na stronie** (Umami nie łączy wizyt z osobą — i tak ma zostać).

## 7. Zamówienia i warsztat (`/admin/zamowienia`)
- Tablica 7 etapów z `orders.stage` (G14; etykiety: Oferta przyjęta, Opłacone, Części, Montaż, Testy, Metryka, Wysłane). Karta: pieczęć, zestaw, numer `Z-RRRR-NNNN`, klient (imię), cena, termin, czas w etapie, ostatnia notatka. Kliknięcie → panel szczegółów: etap, termin, napis na tablicy strony („<Zestaw>: <etap>”), **lista kontrolna serwisu**, Klient, Metryka, „Przesuń do: <następny etap>”.
- Nowe pola `orders` (**dodawane w G14** — dopisek panelu, bez osobnej migracji w P5): `dueDate`, `checklist` (tablica `{ key, done, doneAt, doneBy }`; klucze i teksty z planszy, stała `CK`), `workshopNote`. Przesunięcie dopisuje `stageHistory` i — gdy włączone w ustawieniach — wysyła klientowi e-mail z nowym etapem (szablon w `reply-templates`, rodzaj `stage`).
- Rola `serwis` (G14) widzi tablicę, egzemplarze i zgłoszenia, **bez cen zakupu i marż**.

## 8. Centrum cen i zatwierdzanie (`/admin/ceny`, `/admin/ceny/zatwierdzanie`)
Rozbudowa ekranu z G4, bez zmiany logiki publikacji i strażnika.
- **Centrum cen:** 4 kafle (pozycje, zmienione od partii, niedostępne, ostatnie sprawdzenie), **„Co jeśli?”** (suwaki −15…+25% dla grup: procesory, karty, RAM, dyski, reszta; wynik: średnia marża gotowców, najsłabszy zestaw, liczba poniżej `warnMargin` i `minMargin` — tylko symulacja w przeglądarce na danych z serwera, nic nie zapisuje), tabela pozycji z filtrami (kategoria: poziomy mocy / obudowy / chłodzenia / RAM / dyski / usługa; stan: wszystkie / zmienione / do zatwierdzenia / niedostępne). Kolumny: pozycja (publicLabel + internalModel), koszt z partii, koszt dziś, zmiana, cena na stronie, „wg cennika” (kandydat z `sellFromCost`), marża pozycji, **źródło kosztu** (sklepy / faktura), status, edycja. Domyślny filtr: zmienione.
- **Źródło kosztu** (ADR-G007): nowe pola w `options` i w każdej części `power-levels.components`: `costSource` (`market` | `invoice`, domyślnie `market`), `costNote` (np. numer faktury), `costUpdatedAt`. Pozycja z `invoice` nie jest nadpisywana przez sprawdzanie cen — raport pokazuje tylko różnicę do rynku.
- **Do zatwierdzenia:** lista zmian z checkboxami (zaznaczone domyślnie te powyżej progu), „Tylko powyżej progu”, „Odznacz”; po prawej **strażnik na żywo**: przy każdej zmianie zaznaczenia pełny przegląd z cenami po publikacji i dzisiejszymi kosztami (serwer, akcja; G4 mierzy ok. 55 ms), najniższa marża i najsłabsza konfiguracja; poniżej minimum przycisk „Opublikuj” wyłączony z wyjaśnieniem, co podnieść; „Co zobaczy klient” (ile zestawów drożeje/tanieje, średnia marża, największa zmiana); historia partii. Publikacja = istniejąca funkcja z G4.

## 9. Gotowe zestawy i edytor (`/admin/zestawy`, `/admin/zestawy/<slug>`)
- **Lista:** karty 16 zestawów (pieczęć, imię Cinzel, moc, cena, koszt, marża z paskiem, przepis w 4 liniach, ostrzeżenie o niedostępnej części, porównanie z konkurencją z `price-check-settings.competitors`), filtr monitora (wg `monitorFilters`), sortowanie (cena / marża / nazwa), przełącznik „marża przy dzisiejszych kosztach”, „Nowy zestaw”.
- **Edytor:** status (Na stronie / Szkic / Ukryty — pole `offerStatus` w `builds`, migracja; nie `status`, żeby nie kolidować z `_status` Payload, jeśli `Builds` ma wersje; „Szkic” i „Ukryty” nie istnieją dla strony: zapytania strony, mapa strony, konfigurator, dobór pod grę i porównywarka filtrują `published`, adres daje 404 jak dziś przy braku zestawu), zakładki Przepis · Treść i zdjęcia · Historia ceny. Przepis: poziom (lista z ceną), obudowy i chłodzenia jako kafle ze zdjęciem i dopłatą, RAM i dyski jako przyciski; **niezgodne wyszarzone z powodem z `lib/compat.ts`**, ta sama logika co konfigurator. Po prawej (przyklejone): cena na żywo z rozbiciem, koszt, marża przy kosztach z partii i dzisiejszych, pasek z minimum, ostrzeżenia, „przepis: <nazwa>” gdy wybór = istniejący zestaw, konkurencja, „Zapisz szkic” / „Do zatwierdzenia” (zmiana przepisu zestawu, który jest na stronie, zmienia jego cenę — idzie przez kolejkę jak zmiana kosztu).
- Treść i zdjęcia: pola istoty z `builds` (przydomek, krótki opis, „dlaczego”), zdjęcia egzemplarza (`builds.photos`) z informacją o zdjęciu poglądowym.
- Historia ceny: wpisy `price-history` zestawu (suma pozycji) i oczekująca propozycja.

## 10. Opcje konfiguratora (`/admin/opcje`)
- Zakładki: Obudowy · Chłodzenia · RAM · Dyski · Poziomy mocy. Tabela: miniatura, nazwa na stronie + model wewnętrzny, parametry zgodności (karta do, chłodzenie do, AIO 360, klasa, kolor / typ i wysokość / DDR i GB / GB / narzut, platforma), koszt, cena na stronie, w zestawach, źródła cen (liczba linków, „brak oferty” na czerwono), przełącznik „W konfiguratorze” (`active`), edycja, „Wycofaj/Usuń” (usunięcie zablokowane, gdy użyta w zestawie — hak z G4; przycisk wyłączony z podpowiedzią „Używana w: …”).
- **„Dodaj obudowę/chłodzenie/…”:** panel nad tabelą (`Drawer`), pola jak w `options` + **linki do ofert** (2–4, zapis w `price-sources`) + zdjęcie; podgląd ceny na stronie na żywo (`sellFromCost` przez akcję serwera) i dopłaty względem najtańszej opcji tej klasy; zapis tworzy opcję z `active: false` i wpis w kolejce (nowa pozycja = nowa cena do zatwierdzenia).

## 11. Sprawdzanie cen (szczegóły: ADR-G007)
- Przycisk „Sprawdź ceny” + harmonogram (domyślnie pon. i pt. 06:00). Harmonogram zadań Payload ustawia się w konfiguracji, nie z globalu — dlatego zadanie `price-check-scheduler` co godzinę czyta `price-check-settings` i dodaje `price-check`, gdy nadszedł termin. Przebieg w tle w **osobnej kolejce** (`queue: 'long'`), żeby 15-minutowe sprawdzanie nie blokowało `mail-intake` i `inquiry-sla`; postęp na ekranie raportu.
- Kroki: (1) lista pozycji z `price-sources`; (2) odczyt stron ofert przez Claude (narzędzie web fetch, model Haiku) → wynik w ścisłym JSON; (3) dla pozycji bez ważnej oferty — wyszukiwanie (web search z listą dozwolonych domen, model Sonnet), nowe linki zapisane jako propozycja; (4) **koszt rynkowy = najniższa cena dostępnej od ręki oferty** (albo średnia z 2 najniższych — ustawienie); (5) przeliczenie w `lib/pricing` (kandydaci, marże zestawów, pełny przegląd przy obecnych cenach i po proponowanych); (6) podsumowanie po polsku przez Claude **z gotowych liczb** (JSON różnic) — model nie liczy; (7) alarm e-mail, gdy przy obecnych cenach minimum < `minMargin`, pozycja z zestawu niedostępna albo zmiana > `alertChangePct`.
- **Raport** (`Raport-1440`): przebieg (5 kroków), „Najważniejsze” (akapity Claude z ikonami kierunku), tabela zmian części (filtry: wszystkie / do zatwierdzenia / poniżej progu / niedostępne; linki do ofert z ceną i datą), wpływ na zestawy (cena teraz, koszt z partii → dziś, marża dziś, nowa cena, zmiana dla klienta, marża po, konkurencja), przyciski: Centrum cen, „Przyjmij N propozycji”.
- **„Przyjmij propozycje”** = zapis nowych kosztów (tylko pozycje `market`, ścieżką jak import CSV z G4) → istniejąca kolejka i strażnik. Raport niczego nie publikuje.
- Odchylenie > `outlierPct` (domyślnie 25%) od poprzedniego kosztu → pozycja „do ręcznego sprawdzenia”, bez propozycji.

## 12. Statystyki (szczegóły: ADR-G009)
- Okres: 7 / 30 dni (plansza), później 90 i własny zakres. Kafle: odwiedzający (Umami), zapytania (baza) + konwersja, zamówienia (baza), przychód z zamówień (suma cen zamówień wysłanych/opłaconych — definicja w P8 z Krystianem). Wykres dzienny: odwiedzający (linia) + zapytania (słupki).
- Lejek: odwiedzający → obejrzeli zestaw albo konfigurator (zdarzenia Umami) → skończyli konfigurację (`configurator_done`) → wysłali zapytanie (baza) → dostali ofertę (status `offer_sent` lub dalej) → zamówili (`won`). Przy każdym kroku procent względem poprzedniego.
- Skąd przychodzą (Umami: źródła), najczęściej oglądane zestawy (odsłony `/zestawy/<slug>` + zapytania o zestaw z bazy), gry wybierane w doborze (zdarzenie `game_pick`), urządzenia, strony wejścia.
- Pod tytułem: „Ruch ze statystyk bez ciasteczek (Umami na naszym serwerze), zapytania i sprzedaż z panelu. Bez danych osobowych.”

## 13. Ustawienia (`/admin/ustawienia`)
Jeden widok z sekcjami, każda zapisuje swój global. Zmiana cennika przelicza propozycje i trafia do kolejki, nigdy prosto na stronę.
- **Marża i narzuty** (`pricing-settings`, istniejący): minimum, **`warnMargin` (nowe, 12%)**, narzuty klas, wyjątek Skrzata (widoczny jako informacja), RAM/dyski, bufor obudów i chłodzeń, biała wersja, usługa, zaokrąglenie, próg; zamiast przełącznika `autoPublish` informacja „Publikacja zawsze ręczna” (pole tylko do odczytu, w kodzie twardo wyłączone — §0 pkt 3).
- **Sprawdzanie cen** (`price-check-settings`, nowe): dni i godzina, alarmy (minimum, niedostępna część, zmiana > `alertChangePct` 5%, raport tygodniowy), adres alarmów (`ALERT_EMAIL` jako domyślny), sposób liczenia kosztu (`lowest` | `avg2`), `outlierPct` 25, limit wydatków Claude na miesiąc (domyślnie 20 USD; licznik bieżącego miesiąca), dozwolone domeny sklepów (start: x-kom.pl, morele.net, komputronik.pl; **bez Ceneo i Allegro** — marketplace, ADR-G007 §1), konkurencja `competitors[] { build, name, url, price, checkedAt }` — cena wpisywana ręcznie z datą (v1 bez automatycznego odczytu stron konkurencji).
- **Zapytania i poczta** (`mail-settings`, nowe): adres skrzynki (tylko do odczytu, ze zmiennych nadawcy z G6 / §16), automatyczne potwierdzenie (istniejące, przełącznik informacyjny), `replySlaMinutes` 60, `replyAlarmMinutes` 45, podpis.
- **Zamówienia i klienci:** e-mail do klienta przy zmianie etapu, zaproszenie do konta po wpłacie, tablica warsztatu na stronie (pola w `site-settings` albo `mail-settings` — decyzja w P5).
- **Statystyki:** adres Umami i stan połączenia (tylko odczyt, z env), raport tygodniowy ruchu (zadanie `weekly-report`, pon. 07:00, P8).
- **Powiadomienia na telefon** (P4, ADR-G010): „Włącz na tym urządzeniu”, lista urządzeń (`push-subscriptions` zalogowanego użytkownika) z rodzajami i „Usuń”, „Wyślij próbne”, instrukcja dla iPhone’a (dodaj do ekranu głównego). Sekcja nie ma odpowiednika na planszy `Ustawienia` — układ jak pozostałe sekcje.

## 14. Powiadomienia
Jedna funkcja `notify(kind, payload)` w `lib/notify/` (ADR-G010) — wysyła przez kolejkę (zadanie `notify-send`), nigdy bezpośrednio w haku zapisu (formularz strony nie może czekać).

| Zdarzenie (`kind`) | E-mail (`ALERT_EMAIL`) | Push | Dzwonek | Sesja |
|---|---|---|---|---|
| `inquiry_new` — nowe zapytanie | jak dziś (G6) | tak | tak | P4 |
| `inquiry_reply` — odpowiedź klienta w wątku | — | tak | tak | P4 |
| `inquiry_sla` — bez odpowiedzi po `replyAlarmMinutes` | tak | tak | tak | P3 (e-mail), P4 (push) |
| `margin_alarm` — minimum przy obecnych cenach < `minMargin` | tak (G4) | tak | tak | P4 |
| `price_report` — raport cen z alarmem / część z zestawu niedostępna | tak | tak | tak | P7 |
| `budget` — przekroczony limit Claude | tak | — | tak | P7 |
| `mail_error` — błąd odbioru poczty 3 razy z rzędu | tak | — | tak | P4 |
| `workshop` — zmiana etapu (tylko rola `serwis`, opcjonalnie) | — | tak | — | P5 |

Dzwonek liczony na bieżąco z danych (bez osobnej kolekcji powiadomień). Push: każde urządzenie wybiera rodzaje (`push-subscriptions.kinds[]` = wartości `kind`).

## 15. Dostęp i role
- `users.role`: `admin` (wszystko) i `serwis` (tablica warsztatu, egzemplarze, zgłoszenia, notatki; **bez** zapytań, kosztów, marż, cennika, statystyk sprzedaży, ustawień — 403). Role wprowadza G14 (STAN, uwagi G6): migracja nadaje istniejącym użytkownikom `admin`, nowi domyślnie `serwis`.
- Wszystkie własne widoki sprawdzają dostęp po stronie serwera (widoki własne Payload są publiczne z definicji — sprawdź w dokumentacji i testuj: niezalogowany → przekierowanie do logowania, `serwis` → 403 na widokach cen).
- Akcje serwera (publikacja, wysyłka, przyjęcie propozycji) sprawdzają rolę i zapisują, kto i kiedy.

## 16. RODO i bezpieczeństwo
- `inquiry-messages` dziedziczą retencję zapytania (usunięcie zapytania usuwa wątek; zadanie retencji z G6 obejmuje wątki). Kopie w skrzynce pocztowej: retencja ręczna wg polityki prywatności (do ustalenia z prawnikiem; `TODO(krystian)`).
- Do Claude idą tylko: nazwa produktu, model, kod, EAN, adres oferty, poprzedni koszt. **Nigdy** dane klientów, zapytania, wiadomości.
- Klucze i hasła wyłącznie w zmiennych środowiska (`lib/env.ts`, Zod): `ANTHROPIC_API_KEY`, `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASSWORD`, `UMAMI_URL`, `UMAMI_WEBSITE_ID` i dane logowania API Umami (sposób z dokumentacji Umami), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (push; klucz publiczny trafia do przeglądarki w HTML widoku z serwera, bez `NEXT_PUBLIC_*`). Wysyłka SMTP: zmienne adaptera z G6 — w P3 sprawdź, czy nadawcą jest skrzynka Gaming; jeśli nie, dopisz zmienne nadawcy/transportu skrzynki Gaming. Brak zmiennej = funkcja wyłączona z czytelnym komunikatem w panelu (nie błąd startu), poza produkcją z włączoną funkcją.
- Treść maili przychodzących traktowana jako niezaufana: renderowana jako tekst, bez HTML.
- Treść stron sklepów i wyniki wyszukiwania traktowane jako dane: Claude zwraca wyłącznie JSON wg schematu (ADR-G007), kod waliduje go Zod-em; nic z tych treści nie trafia do panelu poza ceną, tytułem oferty, dostępnością i krótkim cytatem.

## 17. Model danych — zmiany
| Kolekcja / global | Zmiana | Sesja |
|---|---|---|
| `inquiry-messages` (nowa) | `inquiry` (rel.), `direction` (`in` \| `out` \| `note` \| `system`), `body` (tekst), `subject`, `at`, `author` (rel. `users`, puste dla klienta), `messageId`, `inReplyTo`, `attachmentsInfo` (tekst), `template` (rel., opcjonalnie) | P3 |
| `reply-templates` (nowa) | `name`, `kind` (`reply` \| `offer` \| `stage`), `body`, `order`, `active` | P3 |
| `mail-intake-state` (nowy global) | `lastUid`, `uidValidity`, `lastRunAt`, `errorCount` | P4 |
| `inquiries` | `slaAlertedAt`, `lastActivityAt`, `unreadCount` (odpowiedzi klienta nieprzeczytane w panelu), `source` (jeśli nie ma z G6/G12 — sprawdź), `confirmationMessageId` (Message-ID potwierdzenia z G12 — P3 zmienia wysyłkę potwierdzenia, żeby go zapisywała) | P3 |
| `mail-intake-unmatched` (nowa) | `from` (tekst), `subject`, `receivedAt`, `body`, `messageId`, `status` (`new` \| `attached` \| `rejected`); retencja 90 dni | P4 |
| `orders` (G14) | `dueDate`, `checklist[]`, `workshopNote` | **G14** (dopisek panelu) |
| `builds` | `offerStatus` (`published` \| `draft` \| `hidden`, domyślnie `published`) | P6 |
| `options`, `power-levels.components[]` | `costSource`, `costNote`, `costUpdatedAt` | P6 |
| `price-sources` (nowa) | `itemType` (`option` \| `component`), `itemCode` (kod opcji albo **`partKey`** części — ten sam model w kilku poziomach mocy ma jeden `partKey`, więc jedna obserwacja aktualizuje koszt wszędzie, gdzie ta część jest; P6 dodaje `partKey` do `power-levels.components[]`), `componentRole` (dla części poziomu), `url`, `shop` (domena), `active`, `proposedByClaude`, `lastOk`, `lastError` | P6 (pola, ręczne linki), P7 (propozycje) |
| `price-checks` (nowa) | `trigger` (`manual` \| `schedule`), `startedAt`, `finishedAt`, `status` (`running` \| `done` \| `failed` \| `budget`), `progress`, `itemsTotal`, `itemsFound`, `pagesRead`, `searches`, `inputTokens`, `outputTokens`, `costUsd`, `summary` (tekst), `diff` (JSON: zmiany, wpływ, przeglądy), `readAt` | P7 |
| `price-observations` (nowa) | `check` (rel.), `itemType`, `itemCode`, `componentRole`, `url`, `shop`, `title`, `pricePln`, `available`, `quote` (≤ 200 znaków), `method` (`fetch` \| `search`), `matched` (bool), `note`, `observedAt` | P7 |
| `pricing-settings` | `warnMargin` (domyślnie 12% — w tym samym formacie co istniejące `minMargin`) | P1 |
| `price-check-settings` (nowy global) | jak §13 | P7 |
| `mail-settings` (nowy global) | jak §13 | P3 |
| `push-subscriptions` (nowa) | `user` (rel.), `endpoint`, `p256dh`, `auth`, `label` (np. „iPhone Krystiana”), `kinds[]` (rodzaje powiadomień), `createdAt`, `lastOkAt`, `failCount`; usuwana po odpowiedzi 404/410 usługi push | P4 |
| `users` | `role` (G14) | G14 |

**Kolejka „Do zatwierdzenia” z G4** — P0 ustala w kodzie, czym jest (kolekcja, pole, `published-prices`?) i wpisuje tu; edytor zestawu (§9) i dodawanie opcji (§10) dopisują do niej wpisy tą samą funkcją co import kosztów.

Zadania w kolejce (nowe): `inquiry-sla` (co 5 min), `mail-intake` (co 2 min, blokada przed nakładaniem się przebiegów), `notify-send`, `price-check-scheduler` (co godzinę), `price-check` (kolejka `long`), `weekly-report` (pon. 07:00); retencję `mail-intake-unmatched` (90 dni) dopisz do istniejącego `inquiry-retention`.

Nowe kolekcje dopisywane **na końcu** listy w `payload.config.ts` (uwaga z G3 o nazwach indeksów). Każde nowe zadanie w kolejce = migracja enuma `task_slug` (uwaga z G4).

## 18. Kryteria odbioru (każdy ekran)
1. Układ zgodny ze zrzutem 1440 i 414 z `docs/design/prokomgaming/panel/screens/` (różnice wypisane i poprawione albo opisane jako świadome odstępstwo w STAN).
2. Dane prawdziwe z bazy; stany puste i błędu (brak Umami, brak klucza Claude, brak IMAP) opisane jednym zdaniem.
3. axe bez błędów; klawiatura (Tab, Esc w panelach); brak poziomego przewijania przy 414.
4. Dostęp: niezalogowany → logowanie; `serwis` nie widzi kosztów ani marż (test e2e); żadnych danych osobowych w adresach i logach.
5. Ceny i marże = `lib/pricing` (test: liczby na Pulpicie, w Centrum cen i edytorze zestawu równe funkcjom z G4 dla partii 1 i dla przykładowej zmiany kosztów).
6. **Telefon (§2a):** zrzut 414 zgodny z `screens/<Ekran>-414` i `stany/tel-*`; dolne zakładki i arkusz „Więcej” działają (dotyk, Esc, fokus); tabele jako karty; akcja ekranu w zasięgu kciuka; pola 16 px; test e2e na emulacji telefonu (Playwright `devices['iPhone 13']` i `['Pixel 7']`) dla ścieżki ekranu; sprawdzone na prawdziwym telefonie przed PR (Android + iPhone).
7. Test e2e ścieżki ekranu (np. odpowiedź na zapytanie → mail w Mailpit z numerem w temacie; przyjęcie propozycji → kolejka → strażnik → publikacja).

## 19. Poza zakresem v1
Cenniki hurtowni (decyzja Krystiana 30.10: nie korzystamy) · automatyczna publikacja cen · oferta bez zapytania klienta („Nowa oferta” z panelu) · automatyczny odczyt cen konkurencji · PDF oferty (tekst w mailu wystarcza na start; PDF jako osobne zadanie) · SMS · paleta poleceń z pełnym wyszukiwaniem po wszystkim (P8 robi wyszukiwarkę zapytań, zestawów i opcji) · śledzenie klienta między wizytami · natywna aplikacja ze sklepu (panel na telefonie to PWA z push — ADR-G010) · tryb offline panelu.
