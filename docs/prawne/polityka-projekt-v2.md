# Polityka prywatności — projekt v0.2 do weryfikacji przez prawnika

Przygotowane 04.11.2026 (sesja R1, `docs/design/prokomgaming/runda-v2/ZMIANY.md` §1.4–1.5). **To projekt, nie tekst opublikowany.** W panelu nic się nie zmienia: napis „Projekt do weryfikacji przez prawnika” zostaje, dopóki prawnik i właściciel nie zaakceptują treści (ADR-G013 pkt 5).

**Podstawa:** wersja 0.1 z `seed/prokomgaming/legal-privacy.md` (treść z planszy „Prywatnosc”). Jeśli w panelu produkcji ktoś zmienił politykę, przed wysłaniem do prawnika porównaj ją z panelem (Panel → Polityka prywatności).

**Oznaczenia:** **[NOWE]** — dopisane; **[ZMIANA]** — przeredagowane, poprzednia wersja pod spodem; **[USUNIĘTE]** — do wykreślenia; **[DO UZUPEŁNIENIA]** — brak danych (nazwy z umów, okresy); **[DO DECYZJI]** — pytanie do prawnika lub właściciela.

## Co się zmienia i dlaczego (dla prawnika)

1. **Statystyki** — strona liczy odwiedziny narzędziem Umami na serwerze PRO-KOM, bez plików cookies i bez zapisu czegokolwiek na urządzeniu (ADR-G009). Wersja 0.1 zakładała cookies analityczne i marketingowe za zgodą. Takich narzędzi strona nie ma (bez pikseli Facebooka i TikToka, bez Google Analytics), więc te wiersze wypadają.
2. **Konto klienta** — dokładny zakres danych, cel, podstawa i usuwanie na żądanie.
3. **Korespondencja** — odpowiedzi na zapytania wysyłamy z panelu ze skrzynki `kontakt@prokomgaming.pl`, a odpowiedzi klienta trafiają do historii zapytania w panelu.
4. **Odbiorcy danych** — lista kategorii z miejscem na nazwy z umów, łącznie z kopiami zapasowymi poza serwerem.
5. **Okres przechowywania zapytań** — wersja 0.1 mówi „do 12 miesięcy”, a system usuwa zakończone zapytania po **24 miesiącach** (ustawienie `INQUIRY_RETENTION_MONTHS`, domyślnie 24). Trzeba ujednolicić: zmienić tekst albo ustawienie (**[DO DECYZJI]**).

---

## Kto jest administratorem

Administratorem Twoich danych jest PRO-KOM Tadeusz Wójciak, ul. Orkana 16B, 34-700 Rabka-Zdrój, NIP 735-251-14-47. W sprawach danych napisz na kontakt@prokomgaming.pl albo listownie na adres firmy.

## Jakie dane i po co

| Cel | Dane | Podstawa (RODO) | Jak długo |
| --- | --- | --- | --- |
| Odpowiedź na zapytanie i oferta | imię, e-mail, telefon, opis potrzeb, korespondencja w sprawie zapytania | art. 6 ust. 1 lit. b | **[ZMIANA]** 24 miesiące od zakończenia sprawy, jeśli nie kupisz **[DO DECYZJI: 12 czy 24 miesiące — patrz pkt 5 wyżej]** <br>_było: do 12 miesięcy, jeśli nie kupisz_ |
| Sprzedaż, dostawa, gwarancja | dane do faktury i dostawy, numery części | art. 6 ust. 1 lit. b i c | okres gwarancji i przepisów podatkowych (5 lat) |
| Konto klienta | **[ZMIANA]** e-mail, imię, hasło (przechowywane wyłącznie jako skrót kryptograficzny — nie znamy Twojego hasła), zamówienia, egzemplarze komputerów i ich metryki, zgłoszenia serwisowe, zapisane konfiguracje <br>_było: e-mail, historia zamówień i zgłoszeń_ | art. 6 ust. 1 lit. b | **[ZMIANA]** do usunięcia konta; dane zamówień i egzemplarzy przez okres gwarancji i przedawnienia roszczeń **[DO DECYZJI: prawnik / księgowa]** <br>_było: do usunięcia konta_ |
| **[NOWE]** Statystyki odwiedzin strony | dane techniczne wizyty bez danych osobowych — szczegóły w części „Statystyki” | art. 6 ust. 1 lit. f (uzasadniony interes: ulepszanie strony) **[DO DECYZJI: czy prawnik widzi tu dane osobowe — jeśli nie, wiersz można zastąpić samym opisem]** | **[DO UZUPEŁNIENIA: okres przechowywania danych w Umami]** |
| Obrona przed roszczeniami | korespondencja, dokumenty sprzedaży | art. 6 ust. 1 lit. f | do przedawnienia roszczeń |
| **[USUNIĘTE]** ~~Analityka i reklamy~~ | ~~dane z cookies~~ | ~~art. 6 ust. 1 lit. a (zgoda)~~ | ~~do wycofania zgody~~ |

### [NOWE] Konto klienta

Konto zakładasz sam. Służy do śledzenia zamówienia, wglądu w metrykę komputera, zgłoszeń gwarancyjnych i zapisanych konfiguracji. Możesz w każdej chwili poprosić o usunięcie konta (kontakt@prokomgaming.pl). Usuwamy wtedy konto, zapytania z korespondencją i zgłoszenia. Zamówienia i egzemplarze komputerów zostają w formie zanonimizowanej (bez imienia, adresu e-mail i notatek), bo dotyczą sprzedaży i gwarancji. **[DO DECYZJI: prawnik — czy anonimizacja zamiast usunięcia jest tu wystarczająco opisana]**

### [NOWE] Korespondencja

Na zapytania odpowiadamy z panelu sklepu, ze skrzynki kontakt@prokomgaming.pl. Twoje odpowiedzi na nasze wiadomości trafiają do historii zapytania w panelu, żeby każda osoba obsługująca sprawę widziała całą rozmowę. Korespondencję przechowujemy tak długo jak samo zapytanie (patrz tabela). Wiadomości, których nie da się przypisać do żadnego zapytania, usuwamy po 90 dniach.

## Komu przekazujemy dane

**[ZMIANA]** Tylko tym, bez których nie zrealizujemy zamówienia i nie utrzymamy strony. Nie sprzedajemy danych.

| Odbiorca | Po co | Nazwa |
| --- | --- | --- |
| Firma hostingowa | serwer, na którym działa strona, baza danych i statystyki | **[DO UZUPEŁNIENIA: nazwa z umowy — serwer VPS webh.pl?]** |
| Dostawca poczty | skrzynka kontakt@prokomgaming.pl, wysyłka i odbiór wiadomości | **[DO UZUPEŁNIENIA]** |
| Kopie zapasowe poza serwerem | zaszyfrowane kopie bazy przechowywane u zewnętrznego dostawcy (klucz do odszyfrowania ma tylko PRO-KOM) | **[DO UZUPEŁNIENIA: Backblaze B2 — region przechowywania (UE / USA) i podstawa przekazania, jeśli poza EOG]** |
| Firma kurierska | dostawa komputera | **[DO UZUPEŁNIENIA]** |
| Biuro rachunkowe | faktury i księgowość | **[DO UZUPEŁNIENIA]** |

_było: „Tylko tym, bez których nie zrealizujemy zamówienia: firmie kurierskiej, dostawcy hostingu i poczty, biuru rachunkowemu. Nie sprzedajemy danych. Jeśli dostawca narzędzi analitycznych przetwarza dane poza Europejskim Obszarem Gospodarczym, robi to na podstawie standardowych klauzul umownych.”_ — **[USUNIĘTE]** zdanie o narzędziach analitycznych poza EOG: statystyki działają na naszym serwerze.

## Twoje prawa

Masz prawo do dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia oraz sprzeciwu. Zgodę możesz wycofać w każdej chwili, bez wpływu na to, co działo się wcześniej. Możesz złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych.

## [NOWE] Statystyki

> **Ten akapit Krystian wkleja w panelu produkcji przed włączeniem statystyk (R1, decyzja 04.11.2026; ADR-G009 pkt 5).** Napis „Projekt do weryfikacji przez prawnika” zostaje.

Liczymy odwiedziny strony narzędziem Umami, które działa na serwerze PRO-KOM. Statystyki nie używają plików cookies i niczego nie zapisują na Twoim urządzeniu. Nie łączymy wizyt z konkretną osobą, a dane nie trafiają do żadnej zewnętrznej firmy. Zbieramy: odwiedzone strony (bez parametrów z adresu), stronę, z której przyszedłeś, typ urządzenia, przeglądarkę, system i przybliżony kraj, a także zdarzenia na stronie, np. otwarcie konfiguratora, wybór gry czy wysłanie zapytania (tylko rodzaj, bez treści i bez danych z formularza). Nie liczymy wejść na strony konta klienta. Kody metryk komputerów nie trafiają do statystyk.

**[DO DECYZJI: prawnik — Umami używa adresu IP i przeglądarki chwilowo, do rozpoznania tej samej wizyty i kraju; według dokumentacji Umami adres IP nie jest zapisywany. Czy to wymaga dodatkowego zdania?]**

## Cookies

**[ZMIANA]** Używamy tylko niezbędnych plików cookies i pamięci przeglądarki: bez nich nie działa logowanie do konta ani zapamiętane wybory na stronie. Nie używamy cookies analitycznych ani marketingowych, więc nie prosimy o zgodę. **[DO DECYZJI: prawnik — potwierdzić, że baner zgody nie jest potrzebny, dopóki nie ma narzędzi śledzących]**

| Rodzaj | Po co | Zgoda | Jak długo |
| --- | --- | --- | --- |
| Niezbędne (cookies) | Logowanie do konta klienta. | nie wymagają | do wylogowania albo wygaśnięcia sesji |
| **[NOWE]** Pamięć przeglądarki (niezbędne) | Zestawy w porównywarce, ostatnia konfiguracja, komputery wybrane do zapytania (bez Twoich danych kontaktowych); numer i podsumowanie wysłanego zapytania tylko do zamknięcia karty. Zostają na Twoim urządzeniu, nie wysyłamy ich do nas. | nie wymagają | do wyczyszczenia danych przeglądarki (podsumowanie zapytania — do zamknięcia karty) |
| **[USUNIĘTE]** ~~Analityczne~~ | ~~Liczymy odwiedziny i sprawdzamy, które strony są niezrozumiałe.~~ | ~~tak~~ | ~~do 14 miesięcy~~ |
| **[USUNIĘTE]** ~~Marketingowe~~ | ~~Mierzymy skuteczność reklam na Facebooku i TikToku.~~ | ~~tak~~ | ~~do 13 miesięcy~~ |

_było: „Używamy plików cookies. Niezbędne działają zawsze, pozostałe tylko za Twoją zgodą. Wybór zmienisz w każdej chwili przyciskiem „Ustawienia cookies” w stopce.”_ — link „Ustawienia cookies” w stopce prowadzi dziś do tej części polityki. **[DO DECYZJI: Krystian — zostawić link jako „Cookies” czy zmienić napis w stopce po akceptacji]**

## Bezpieczeństwo

Strona działa po szyfrowanym połączeniu. Dostęp do danych mają tylko osoby, które ich potrzebują do obsługi zamówienia. Formularz zapytania nie zapisuje danych w przeglądarce. **[NOWE]** Kopie zapasowe bazy są szyfrowane przed wysłaniem poza serwer.

---

## Ramka „W skrócie” (pole „Podsumowanie” w panelu)

1. Dane z zapytania służą tylko do odpowiedzi i oferty.
2. Nie sprzedajemy danych. Przekazujemy je tylko kurierowi, księgowości i hostingowi.
3. **[ZMIANA]** Bez cookies analitycznych i reklamowych — odwiedziny liczymy na własnym serwerze, bez śledzenia. <br>_było: Cookies analityczne i marketingowe tylko za Twoją zgodą._
4. W każdej chwili możesz poprosić o wgląd albo usunięcie danych.

## Do sprawdzenia przed publikacją (lista dla Krystiana)

- [ ] Nazwy odbiorców z umów (hosting, poczta, kopie B2 z regionem, kurier, biuro rachunkowe).
- [ ] Okres przechowywania zapytań: 12 czy 24 miesiące (tekst albo `INQUIRY_RETENTION_MONTHS`).
- [ ] Okres przechowywania danych konta po zamówieniu (gwarancja + przedawnienie).
- [ ] Okres przechowywania danych w Umami (ustawienie w Umami albo zapis „bez ograniczeń” w polityce).
- [ ] Akceptacja prawnika, potem panel: treść, wersja 0.2, data obowiązywania, odznaczenie „Projekt do weryfikacji”.
