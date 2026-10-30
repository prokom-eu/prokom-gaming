# ADR-G002: Cennik i konfigurator — jedna funkcja ceny, gwarancja marży, reguły zgodności

- **Status:** przyjęta (cennik: decyzje Krystiana 25.10.2026; spec. v3.1; uzupełnienie G0: zakres testu `internalModel`, §8.7)
- **Data:** 2026-10-25
- **Źródło liczb:** `dane/PRO-KOM_cennik_konfiguratora_2026-10-25.xlsx` (poza repo, u Krystiana) → `seed/prokomgaming/*.json`. Wzory arkusza są wzorcem dla kodu; `tests/fixtures/pricing-expected.json` to wynik, który kod musi odtworzyć co do złotówki.

## 1. Zasady nadrzędne
1. **Jedna funkcja ceny** (`lib/pricing/`, ta sama na serwerze i w kliencie). Gotowy zestaw = zapisany przepis z konfiguratora (poziom mocy + obudowa + chłodzenie + RAM + dysk). Jego cena jest **zawsze liczona, nigdy wpisywana**. Ten sam wybór = ta sama cena na karcie zestawu, w konfiguratorze, porównywarce, zapytaniu i mailu.
2. **Gwarancja marży:** żaden komputer z konfiguratora nie może mieć marży poniżej `minMargin` (dziś **11%**). Sprawdzane na **wszystkich** zgodnych konfiguracjach przy każdej publikacji cen (dziś 85 134, minimum 11,09%).
3. **Bez producentów** części poziomu mocy (procesor, karta, płyta, zasilacz) oraz RAM i dysku — na stronie tylko klasa (`publicLabel`, np. „RTX 5070 12 GB”). Modele wewnętrzne i koszty wyłącznie w panelu. **Wyjątek:** obudowy i chłodzenia — pełna nazwa z producentem, zdjęcie i cena (cena zakupu + bufor 20 zł, bez narzutu procentowego, żeby przy Ceneo wyglądała uczciwie). Marżę niesie poziom mocy.
4. **Ceny stabilne:** koszty zmieniają się codziennie, ceny na stronie nie — publikacja przez snapshot z progiem 3% i zatwierdzeniem.
5. **Bez rat** (decyzja 25.10.2026) i bez płatności na stronie. Zapytanie → oferta → pro forma → przelew albo BLIK.

## 2. Model danych (Payload)

### Global `pricing-settings` (`seed/prokomgaming/pricing-settings.json`)
`minMargin` 0,11 · `categoryMarkup` `{ case: 0, cooler: 0, ram: 0,15, ssd: 0,15, service: 0,15 }` · `caseCoolerBuffer` 20 zł · `serviceCost` 150 zł (Windows 90 + wysyłka i opakowanie 60) · `roundingStep` 10 · `whiteSurcharge` 300 zł · `levelMarkupByClass` `{ FullHD: 0,17, 2K: 0,16, 4K: 0,145, flagowiec: 0,135 }` · `publishThreshold` 0,03 · `autoPublish` false.

### `power-levels` (16; pakiet procesor + karta + płyta + zasilacz)
`code` (P01…P16), `tier` (1–9 = „Moc I–IX”), `tierRoman`, `tierLabel` (kraina, np. „2K wysokie”), `tierLead` (czy reprezentuje swój stopień w tabelach 9 wierszy), `targetResolution` (fullhd | qhd | uhd), `monitorFilters[]`, `variant` („GeForce” | „Radeon” | „Intel” | „biały GeForce” | „biały Radeon” | „premium” | ''), `publicLabel` (bez producentów), `platform` (AM4 | AM5 | LGA1700 | LGA1851), `ramType` (DDR4 | DDR5), `color` (czarny | biały), `gpuLengthMm`, `requiresAio`, `components[] { role: cpu|gpu|mobo|psu, publicLabel (klasa na stronie), internalModel, ean?, cost }`, `upgrade { freeRamSlots, freeM2Slots, socket, socketNote, psuW }` („Miejsce na rozbudowę”; potwierdzić z modelem płyty), `markupClass`, `markupOverride` (jawny wyjątek: dziś tylko Skrzat 0,168), reguły sensu `minRamGb`, `minSsdGb`, `minCoolerClass` (1 podst. powietrze, 2 wieża, 3 AIO 360), `minCaseClass` (1 podst., 2 średnia, 3 premium), `leadBuild` (zestaw wiodący; FPS poziomu = FPS tego zestawu).

### `options` (57)
`type` (case | cooler | ram | ssd), `code`, `publicLabel`, `internalModel`, `ean?` (dziś pusty), `cost`, `active` (domyślnie true), `image`, `description`.
- case: `gpuMaxMm`, `coolerMaxMm`, `aio360` (none | front | top_only | side | yes), `class` 1–3, `color`;
- cooler: `kind` (air | aio360), `heightMm` (air) albo `radiatorThicknessMm` (aio), `class` 1–3, `color`;
- ram: `ramType`, `capacityGb`; ssd: `capacityGb`.

### `builds` (16) — przepisy
`slug`, `name`, `level`, `case`, `cooler`, `ram`, `ssd` (relacje po kodach), treści istoty z `seed/prokomgaming/creatures.json` (pole `creature` w `builds.json` = slug istoty; wygląd: ADR-G003), zdjęcia, `internalRef` (tylko panel). **Brak pola ceny.**

### `published-prices` — snapshot
`{ batch, itemType (level | option | service | level_from), itemCode, sellPrice, costAtPublish (tylko panel), publishedAt, publishedBy }` dla każdego poziomu, opcji, usługi i „ceny od” poziomu (`level_from`). Jedna publikacja = jedna partia (`batch`). **Strona czyta wyłącznie najnowszą partię.** **„Cena z dnia …”** na stronie i `priceValidUntil` w JSON-LD = `publishedAt` najnowszej partii (seed tworzy pierwszą partię z datą 25.10.2026; `pricing-settings.priceDate` służy tylko seedowi). Każda publikacja dopisuje rekordy do `price-history` (`itemCode`, `sellPrice`, `validFrom`, `validTo`).
- **Omnibus:** „najniższa cena z 30 dni” dla zestawu = minimum po dniach z ostatnich 30 dni sumy cen jego pozycji (poziom + 4 opcje + usługa) obowiązujących danego dnia według `price-history`. Pokazujemy tylko przy oznaczonej obniżce.

## 3. Funkcja ceny
Dwie warstwy w `lib/pricing/` (jedna implementacja zaokrąglenia `ceil10`):
- **`lib/pricing/snapshot.ts`** — bezpieczna dla przeglądarki: `priceFromSnapshot(config, snapshot)` = suma opublikowanych cen sprzedaży pozycji, `surcharge(a, b)`, `ceil10`. Nie zna kosztów. Używają jej: strona, konfigurator, porównywarka, karta zestawu i `submitInquiry()` (serwer przelicza cenę zapytania z najnowszej partii snapshotu, nie ufa cenie z przeglądarki).
- **`lib/pricing/cost.ts`** — tylko serwer (`import 'server-only'`): `sellFromCost(item, settings)`, `cost(config)`, `margin(config)`, pełny przegląd marż, liczenie `level_from` i kandydatów do publikacji. Używa jej wyłącznie panel (publikacja cen) i testy.

Wzory (warstwa kosztów; snapshot = ich wynik zapisany przy publikacji):
```
ceil10(x)          = ceil(round(x, 6) / 10) * 10            // najpierw 6 miejsc: bez błędów zmiennoprzecinkowych
floor              = minMargin / (1 - minMargin)            // 0,123596 — podłoga narzutu
eff(m)             = max(m, floor)
markupOf(level)    = level.markupOverride ?? levelMarkupByClass[level.markupClass]
sell(level)        = ceil10(sum(level.components.cost) * (1 + eff(markupOf(level))) + (level.color == 'biały' ? whiteSurcharge : 0))
sell(case|cooler)  = ceil10(cost * (1 + categoryMarkup[type]) + caseCoolerBuffer)     // bez podłogi: cena rynkowa + bufor
sell(ram|ssd)      = ceil10(cost * (1 + eff(categoryMarkup[type])))
serviceSell        = ceil10(serviceCost * (1 + eff(categoryMarkup.service)))           // 180 zł
price(config)      = sell(level) + sell(case) + sell(cooler) + sell(ram) + sell(ssd) + serviceSell   // czysta suma, bez drugiego zaokrąglenia
cost(config)       = suma kosztów części + serviceCost
margin(config)     = 1 - cost / price
```
- Dopłata za opcję w UI = `sell(nowa) − sell(obecna)`. Ponieważ cena to czysta suma, dopłata jest stała niezależnie od reszty wyboru.
- „**Cena od**” poziomu = minimum `price` po wszystkich zgodnych i sensownych konfiguracjach tego poziomu; przeliczana po każdej publikacji (dziś: Skrzat 4 960 … Perun 52 880 — `tests/fixtures/pricing-expected.json → priceFrom`).
- Wynik dziś (z seeda): 16 zestawów = Skrzat 4 990 · Licho 5 950 · Bies 6 710 · Wodnik 6 870 · Strzyga 7 400 · Kikimora 9 220 · Zmora 10 110 · Rusałka 10 950 · Baba Jaga 11 650 · Bazyliszek 11 930 · Pani Zimy 12 240 · Wilkołak 14 440 · Wampir 14 540 · Weles 17 100 · Żmij 19 840 · Perun 53 900 zł.

## 4. Publikacja cen i strażnik marży (panel)
1. Koszty: edycja w panelu albo import CSV (`kod lub EAN; koszt`) — zapis do `components.cost` / `options.cost`.
2. Po zmianie kosztu liczymy `candidateSell`. Jeśli `|candidate − published| / published > publishThreshold` albo stara cena przy nowym koszcie łamie `minMargin` → pozycja w kolejce „Do zatwierdzenia” (przy `autoPublish` publikuje się od razu, po przejściu strażnika).
3. **Strażnik (jedno zachowanie):** każda publikacja (ręczna albo automatyczna) najpierw robi pełny przegląd wszystkich zgodnych konfiguracji z cenami kandydującymi. Jeśli którakolwiek ma marżę < `minMargin` — **publikacja jest zablokowana** i panel pokazuje, który poziom podnieść; nic się nie zmienia na stronie.
4. **Alarm marży:** gdy po wzroście kosztu **obecnie opublikowana** cena łamie minimum, system nie zmienia ceny sam — wysyła e-mail na `ALERT_EMAIL` z listą zestawów i proponowaną ceną (podłoga), a pozycja trafia na górę kolejki jako „pilne”. Ryzyko jest ograniczone, bo wiąże dopiero oferta wysłana klientowi (ważna 48 h). Zadanie sprawdzające działa po każdym imporcie kosztów (kolejka zadań Payload, jak „zadania w tle” w prokom-web).
5. Widok „Zestawy” w panelu: cena, koszt, marża, różnica względem poprzedniej publikacji. Marży nie ma nigdzie na stronie.

## 5. Reguły zgodności i sensu (`lib/compat.ts`, w kliencie i na serwerze)
| Kod błędu | Warunek (błąd, gdy NIE spełniony) | Komunikat przy wyszarzonej opcji |
|---|---|---|
| `gpu_too_long` | `level.gpuLengthMm <= case.gpuMaxMm` | „Karta tego poziomu się nie zmieści” |
| `cooler_too_tall` | air: `cooler.heightMm <= case.coolerMaxMm` | „Chłodzenie za wysokie do tej obudowy” |
| `no_aio_mount` | aio360: `case.aio360 != none` | „Brak miejsca na chłodnicę 360 mm” |
| `ram_type` | `ram.ramType == level.ramType` | „Ten poziom używa pamięci DDR4/DDR5” |
| `requires_aio` | `level.requiresAio ⇒ cooler.kind == aio360` | „Ten procesor wymaga chłodzenia wodnego 360 mm” |
| `ram_too_small` | `ram.capacityGb >= level.minRamGb` | „Za mało pamięci do tego poziomu (min. X GB)” |
| `ssd_too_small` | `ssd.capacityGb >= level.minSsdGb` | „Za mały dysk do tego poziomu” |
| `cooler_class_too_low` | `cooler.class >= level.minCoolerClass` | „Za słabe chłodzenie do tego poziomu” |
| `case_class_too_low` | `case.class >= level.minCaseClass` | „Za prosta obudowa do tego poziomu” |
| ostrzeżenie `thick_radiator_top_only` | AIO z `radiatorThicknessMm >= 38` w obudowie `top_only` | „Gruba chłodnica na górze — sprawdzimy prześwit nad pamięcią” (nie blokuje) |

Serwer odrzuca zapytanie z konfiguracją łamiącą którąkolwiek regułę (400). Kontrola: 236 544 kombinacji → 85 134 zgodnych; odrzucone wg powodu i 11 scenariuszy z arkusza — w fixtures.

## 6. Konfigurator — zachowanie
Kroki: **Monitor i gry → Poziom mocy → Obudowa → Chłodzenie → RAM i dysk → Podsumowanie** (plansza Konfigurator, desktop: `stany/konf-1…6.jpg`, telefon: `stany/tel-07-konf-moc.jpg`, `tel-08-konf-obudowa.jpg`).
- Poziom: lista po monitorze, „od X zł”, przełącznik wariantu (GeForce / Radeon / Intel / biały), `publicLabel`, klatki w 3 grach z etykietą źródła, opłacalność kroku wyżej („+1 010 zł za ok. +20% klatek w Twoich grach”), podpowiedź GeForce vs Radeon.
- **Zmiana poziomu z zachowaniem wyboru:** opcje, które przestały pasować, podmieniamy na najtańszą zgodną z tej samej kategorii (RAM/dysk: najbliższa pojemność spełniająca minimum) i pokazujemy komunikat, co i dlaczego (np. „Ten poziom wymaga min. 32 GB RAM: 16 → 32 GB, +1 280 zł” — dziś najtańsza zgodna 32 GB DDR5 to `R32WP`, 2 530 zł wobec 1 250 zł za `R16`).
- Wyszarzone opcje **zawsze z powodem**; nigdy nie ukrywamy bez wyjaśnienia. Przy opcji: dopłata względem obecnego wyboru; obudowy i chłodzenia ze zdjęciem i parametrami.
- Rozpoznanie gotowca: wybór == przepis → „To dokładnie {nazwa}” + link; inaczej „najbliższy gotowiec” z tego poziomu i różnica ceny.
- Wejście z karty zestawu (`/konfigurator?zestaw=wampir`): kroki prewypełnione. Stan konfiguracji w adresie (link do wysłania).
- „Inna obudowa / chłodzenie”: pole tekstowe → zapytanie z ręczną wyceną.
- Telefon: kroki jako przewijany pasek, cena i „Dalej: <krok>” przyklejone nad dolnymi kartami.

## 7. Promocje
Rabat kwotowy albo procentowy na **poziom albo opcję**, nigdy na sam zestaw (obejmuje gotowca i identyczny wybór). Nie może zejść poniżej podłogi marży (walidacja). Przy obniżce: najniższa cena z 30 dni z `price-history`.

**Uzupełnienie 30.10.2026 (G13 — „Gotowe od ręki”, decyzja Krystiana):** wyjątek dla **konkretnego egzemplarza** z kolekcji `stock` (pokazowy, z wystawy, po zwrocie): cena egzemplarza = cena jego konfiguracji z najnowszej opublikowanej partii (`lib/inquiry/price.ts`, te same kody co zestaw) **minus `discount` egzemplarza w zł**. To nie jest promocja zestawu — cena zestawu na stronie i w konfiguratorze się nie zmienia. Strażnik (`lib/pricing/stock.ts`) działa w trzech miejscach: panel nie zapisze egzemplarza, którego marża po rabacie spada poniżej `minMargin` (hak kolekcji `stock`; zdjęcie ze strony i zwolnienie rezerwacji przechodzą zawsze); strona nie pokaże, a serwer nie przyjmie rezerwacji egzemplarza, który przy dzisiejszych cenach i kosztach łamie marżę (np. po nowej partii albo wzroście kosztów — wtedy znika ze strony z wpisem w logu). Serwer liczy cenę przy zapytaniu `ready`, nigdy nie bierze jej z przeglądarki. Omnibus (czy cena egzemplarza z rabatem to „obniżka” wymagająca najniższej ceny z 30 dni) — do potwierdzenia z prawnikiem przed włączeniem strony (`FEATURE_READY`).

## 8. Testy obowiązkowe (G4)
1. Każdy zestaw: `price(build) == price(konfiguracja z tych samych kodów)` == `fixtures.builds[].price`.
2. Pełny przegląd: 85 134 zgodnych, `rejectedByReason`, `minMargin` 0,110920 dla `P01 + H9 + KRAKEN + R16D4 + PXL512` (6 410 zł).
3. `priceFrom` 16 poziomów.
4. 11 scenariuszy z arkusza (błędy i ostrzeżenia).
5. Addytywność: losowe pary różniące się jedną opcją → różnica ceny == różnica cen opcji.
6. `ceil10` z zabezpieczeniem zmiennoprzecinkowym.
7. Żaden ciąg `internalModel` ani pola `cost`, `costAtPublish`, `components` nie występują w HTML ani w odpowiedziach publicznych (test e2e na stronie zestawu, konfiguratora i w API; porównujemy z listą `internalModel` z bazy — nie z listą marek, bo nazwy układów, np. „RTX 5070”, i producenci obudów są na stronie celowo). **Zakres listy (G0, 25.10.2026):** `internalModel` części poziomu mocy (`power-levels.components[]`: cpu, gpu, mobo, psu) oraz opcji `ram` i `ssd`. **Obudowy i chłodzenia są wyłączone** — pokazujemy je z pełną nazwą celowo (§1.3), a w 39 z 46 ich `internalModel` jest identyczny z `publicLabel`, więc test dawałby fałszywe alarmy. Pola `cost` i `costAtPublish` sprawdzamy dla wszystkich typów, także obudów i chłodzeń.
8. `lib/pricing/cost.ts` nie trafia do paczki przeglądarki (`server-only`).

**Uzupełnienie 31.10.2026 (G14) — metryka egzemplarza:** `/metryka/<kod>` pokazuje producenta, model i numer seryjny części **tego jednego egzemplarza** (spec. §13, plansza Metryka) — to jedyny wyjątek od „tylko klasa (`publicLabel`)”. Dane pochodzą z `units.parts[]` (wpisuje serwis), nie z `internalModel` oferty; metryka jest `noindex`, otwierana kodem z naklejki i tylko dla opublikowanych egzemplarzy. Test pkt 7 nie obejmuje `/metryka/*`. Koszty i marże nie trafiają tam nigdy.

## 9. Poza zakresem v1
Automatyczny import z API hurtowni (v1: CSV) · raty i płatności online · zmiana procesora lub karty poza poziomami (poziomy pilnują sensu i zasilacza).
