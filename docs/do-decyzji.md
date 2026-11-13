# Do decyzji przed startem — wszystkie `TODO(krystian)` (stan 14.11.2026, `develop` po #108)

W kodzie jest 231 znaczników `TODO(krystian)`. Ta lista dzieli je według tego, **kto decyduje**, i według tego, czy blokują start 20.11. Większość (ok. 190) to robocze teksty, które można przyjąć hurtem. Prawdziwych decyzji jest ok. 30.

Jak odhaczać: odpowiedz w czacie numerem punktu, np. „A3: 1–2 dni”, „C: przyjmuję hurtem”. Claude wprowadzi zmianę, usunie znacznik i zaktualizuje tę listę. Aktualną liczbę znaczników pokazuje:

```bash
git grep -c "TODO(krystian)" -- src | awk -F: '{s+=$NF} END {print s}'
```

---

## A. Szef [SZEF] — fakty o firmie (odpowiedzi Krystiana 14.11.2026)

| # | Co | Decyzja | Stan |
|---|---|---|---|
| A1 | Telefon Gaming i godziny | 883 200 151, **codziennie 9–22** — także godziny odpowiedzi na zapytania (wszędzie 8–22 → 9–22) | zrobione; **na stagingu/produkcji w panelu:** Ustawienia → „Odpowiedź na zapytanie” = „zwykle w godzinę, codziennie 9–22”, godziny odpowiedzi od 9 |
| A2 | Godziny sklepu | **pon.–pt. 9–17**, ul. Orkana 16B, Rabka-Zdrój | zrobione: `/kontakt` + `openingHoursSpecification` w JSON-LD |
| A3 | Współrzędne sklepu (`geo`) | Google weźmie je z Profilu Firmy | odłożone |
| A4 | Termin i dostawa | montaż **5–10 dni roboczych** (bez zmian), kurier **24 h od nadania** | zrobione: karta zestawu „24 h kurierem”, JSON-LD, `llms.txt` |
| A5 | Serwis kas na „O nas” | **bez informacji o kasach**, tylko „od 2004” | zrobione |
| A6 | Ludzie i zdjęcia na „O nas” | **nigdy** | zrobione (znaczniki usunięte) |
| A7 | Bon | **później** | strona wyłączona flagą |

## B. Prawnik — odłożone (Krystian 14.11.2026: „na razie nie”)

| # | Co | Gdzie |
|---|---|---|
| B1 | Treść trzech zgód RODO w formularzach (wersjonowana klauzula) | `src/lib/inquiry/consent.ts:8`, `:21`, `:36` |
| B2 | Zdanie przy zgodzie w kroku formularza zapytania (spec. §10) | `src/components/inquiry/steps.tsx:443` |
| B3 | Zakres informacji GPSR na karcie zestawu (spec. §6 pkt 14) | `src/components/build/Interior.tsx:61` |
| B4 | „Pobierz jako PDF” przy regulaminie — gdy będzie zatwierdzony PDF | `src/components/content/LegalPage.tsx:92` |
| B5 | Jak długo trzymać dane obdarowanego z bonu (osoba trzecia) — tylko z bonem | `src/collections/Vouchers.ts:21` |
| B6 | Akapit o statystykach bez ciasteczek w polityce prywatności — **warunek włączenia Umami na produkcji** (ADR-G009 pkt 5) | treść polityki w panelu |

## C. Serwis [serwis] — fakty techniczne, **blokują start**

| # | Co | Gdzie |
|---|---|---|
| C1 | Lista „Gwarancja i opieka” na karcie zestawu | `src/components/build/Aftercare.tsx:15` |
| C2 | Ile trwa test obciążeniowy egzemplarza | `src/components/build/Journey.tsx:66` |
| C3 | Karty „Dopasuj pod siebie”: czy ulepszenia pasują do płyty w każdym z 16 poziomów (`power-levels.upgrade`, `_verify`) | `src/components/build/Interior.tsx:42` |
| C4 | Wzór metryki na głównej: „Wzór metryki”, linie montażu i testu | `BeforeShipping.tsx:164` |

## D. Ty — fakty i treści publiczne

| # | Co | Gdzie | Uwaga |
|---|---|---|---|
| D1 | Adresy profili Facebook i TikTok (puste = nie pokazujemy) | `src/lib/site.ts:36–37` | |
| D2 | Prawdziwe opinie i ocena (`site-settings`) | `src/app/(site)/page.tsx:66`, `zestawy/[slug]/page.tsx:94` | do tego czasu sekcje ukryte — zgodnie ze spec. |
| D3 | Prawdziwe zdjęcia egzemplarza po sesji zdjęciowej (`builds.photos`) | `src/components/build/BuyBlock.tsx:39` | |
| D4 | Dopisek planszy „Klatki przykładowe, zdjęcia poglądowe” — czy zostaje na start | `src/components/home/Bestiary.tsx:62` | |
| D5 | „Dwa sklepy na Podhalu” z planszy → jeden sklep od 01.11 — potwierdź obecne zdanie | `o-nas/page.tsx:69` | |
| D6 | „albo SMS-em” przy telefonie (nasz dopisek) | `BuyBlock.tsx:95`, `configurator/StepSummary.tsx:129` | |
| D7 | Nagłówek i notka „Jak liczymy klatki” | `src/components/HowWeMeasure.tsx:75` | |
| D8 | Odpowiedzi szablonu dla gier e-sportowych i z limitem klatek | `src/lib/games.ts:258` | |

## E. Nowe teksty SEO z 13.11 (sesja SEO, #108) — do przeczytania raz

Wszystkie są szkicami z fraz spec. §1 i tekstów plansz. Widzi je Google i czaty AI, więc warto przeczytać je przed produkcją.

- tytuł strony głównej i opisy stron: `src/lib/seo.ts:28`, `:55`;
- strona `/komputery-do-gier-rabka-zdroj` (cała treść): `src/app/(site)/komputery-do-gier-rabka-zdroj/page.tsx:25`;
- `llms.txt` (opis firmy dla czatów AI): `src/lib/llms.ts:14`;
- zdania i tytuły stron gier: `src/lib/games.ts:226`, `:297`; wstępy 33 gier do wpisania w panelu: `docs/seo/wstepy-gier.md`;
- nowe linki: `kontakt/page.tsx:128`, `SiteFooter.tsx:38`, `games/GamePicker.tsx:116`.

## F. Robocze teksty strony — **można przyjąć hurtem** (ok. 45)

Komunikaty, których nie ma na planszach: stany puste („brak wyników”), awarie bazy, „Wysyłam…”, błędy formularzy, teksty strony konta (logowanie, rejestracja, hasło, weryfikacja, pusta lista), `/metryka` bez planszy, temat i treść maili „Wyślij rodzicowi” i „Wyślij link”, kroki maila potwierdzenia dla bonu i rezerwacji.

Pliki: `src/app/(site)/{dla-rodzicow,dobor-pod-gre,gotowe,konfigurator,porownaj,zapytanie,poradniki,konto/*,metryka}/…`, `src/components/{account,content,inquiry,compare,configurator/StepSummary.tsx,build/BuyBlock.tsx}`, `src/lib/inquiry/{form,contact,quick,emails}.ts`, `src/lib/compare.ts`.

Odpowiedź „F: przyjmuję hurtem” = usuwam znaczniki, teksty zostają.

## G. Robocze teksty panelu `/admin` — **można przyjąć hurtem** (ok. 130)

Widzisz je tylko Ty w panelu: komunikaty akcji, stany puste Pulpitu i Statystyk, alarmy maili i sprawdzania cen, powiadomienia push, etykiety ustawień, raport tygodniowy. Nie blokują startu.

Pliki: `src/admin/**`, `src/lib/{price-check,mail,notify}/**`, `src/jobs/**`, `src/globals/PriceCheckSettings.ts`, `src/collections/PriceSources.ts`, `src/lib/{clients,clientData.server,orders}.ts`.

Dwie decyzje w panelu, nie tylko tekst:
- **G1** Jak długo zamówienie stoi w kolumnie „Wysłane” na tablicy — `src/admin/orders/load.ts:17`;
- **G2** Czy zamówienie po terminie oznaczać na Pulpicie na czerwono (pilne) — `src/admin/dashboard/rules.ts:204`; święta (1.11, 11.11, Boże Narodzenie) w liczeniu czasu odpowiedzi — `rules.ts:107`.

## H. Do zrobienia w kodzie po starcie (nie decyzje — stare znaczniki z sesji G)

Nie blokują startu. Część dotyczy stron wyłączonych flagami (`/gotowe`, `/bon`).

| # | Co | Gdzie |
|---|---|---|
| H1 | Cena „od” przy istotach w menu telefonu | `src/components/MenuSheet.tsx:120` |
| H2 | „Zgłoś problem” w stopce prowadzi do konta, nie wprost do formularza zgłoszenia | `src/components/SiteFooter.tsx:27` |
| H3 | Panel ustawień ciasteczek — dziś link do polityki (`cookieBannerEnabled = false`, bez ciasteczek analitycznych) | `SiteFooter.tsx:124` |
| H4 | Firma i kontakt czytane z `site-settings` zamiast ze stałych | `src/lib/site.ts:6` |
| H5 | JSON-LD dla `/gotowe` i `/bon` przed włączeniem flag | `src/app/(site)/gotowe/page.tsx:22`, `bon/page.tsx:17` |
| H6 | „egzemplarz nr …” na `/gotowe` | `src/components/content/StockList.tsx:53` |
| H7 | Pole na kod bonu w formularzu zapytania (dziś kod idzie w „Uwagi”) | `src/components/content/VoucherBuilder.tsx:155` |
| H8 | Mail do właściciela adresu przy próbie ponownej rejestracji | `src/app/api/konto/rejestracja/route.ts:69` |
| H9 | Scena na „wysłane” dla „Pomóżcie mi dobrać” i własnej listy | `src/app/(site)/zapytanie/wyslane/page.tsx:36` |
