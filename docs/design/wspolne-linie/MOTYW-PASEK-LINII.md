# Motyw, pasek linii i szyna — wspólny kontrakt wszystkich linii (runda 18.11.2026)

Dotyczy: **prokom-web** (Biznes, Instalacje, Software, pro-kom.eu), **prokom-system** (PRO-KOM Tech, prokomserwis.pl) i **prokom-gaming** (prokomgaming.pl). Każde repo ma własny kod — ten plik jest wspólnym kontraktem zachowania i wyglądu. Kopie: `prokom-system/docs/tech/MOTYW-PASEK-LINII.md`, `prokom-gaming/docs/design/wspolne-linie/MOTYW-PASEK-LINII.md`. Przy różnicy wygrywa wersja w prokom-web. Decyzja architektoniczna: ADR-028.

Źródło: pomysły szefa z rozmowy 18.11.2026 (przekazane przez Krystiana) + Asana „💡 Pomysły” z 18.11.

---

## 1. Przycisk motywu z napisem (zamiast samej ikonki)

### Co chce szef
Zamiast ikony księżyca/słońca — przycisk, który mówi, co się stanie: **„Ciemny motyw”** (gdy teraz jest jasny) albo **„Jasny motyw”** (gdy teraz jest ciemny). Ładnie, premium, na wszystkich liniach, z ładną animacją zmiany.

### Wygląd (kapsuła nagłówka, ≥ 1081 px)
- Pigułka 40 px wysokości, `border-radius: 999px`, obramowanie 1 px w kolorze obramowań kapsuły (`--cap-*`/`--nav-*` w prokom-web; odpowiednik w Tech), tło jak przyciski ikonowe kapsuły, tekst 13,5 px / 600, odstęp ikona–tekst 8 px, padding 0 14px 0 12px.
- Ikona 18 px po lewej: księżyc przy „Ciemny motyw”, słońce przy „Jasny motyw”. Kolor ikony: akcent linii (`--nav-active-ink`), tekst: `--nav-ink`.
- **Stała szerokość** równa dłuższej etykiecie („Ciemny motyw”), żeby kapsuła nie skakała przy zmianie.
- 1081–1359 px (ciasna kapsuła Biznesu i Software): etykieta skrócona **„Ciemny” / „Jasny”** (pełna nazwa w `aria-label`). Poniżej 1081 px przycisk znika z kapsuły — motyw jest w arkuszu menu (§1.4).
- Hover: tło o stopień jaśniejsze/ciemniejsze, ikona obraca się o 20°; focus: widoczna obwódka 2 px w akcencie linii.

### Brak mignięcia złego napisu
W HTML są **obie** etykiety i obie ikony; CSS pokazuje właściwą z `html[data-theme]` (ustawianego przed pierwszym malowaniem przez skrypt w `<head>`, §2). Bez JavaScriptu działa reguła `prefers-color-scheme` jak dziś w `ThemeToggle`. Nigdy nie renderujemy etykiety z serwera na podstawie zgadywania motywu.

### Dostępność
- `<button type="button">` z widocznym tekstem = akcja („Ciemny motyw”). **Bez `aria-pressed`** (tekst opisuje akcję, a nie stan — razem byłyby sprzeczne).
- Po zmianie komunikat w regionie `aria-live="polite"`: „Włączono ciemny motyw.” / „Włączono jasny motyw.”
- Cel dotyku ≥ 44 px tam, gdzie jest dotyk.

### 1.4. Arkusz menu (telefon, tablet)
Zostaje przełącznik **Jasny / Ciemny / Auto** (`MenuSheet`, Tech: `ThemeSegmented`). Podpis sekcji: „Motyw strony”. Pod nim drobny opis trybu Auto (§2.3): „Auto: w nocy ciemny, w dzień jak ustawienia telefonu.”

### 1.5. Animacja zmiany (wszystkie linie)
- **Koło** otwierające nowy motyw od środka klikniętego przycisku — mechanizm, który dziś mają Software i Instalacje (`lib/motion/themeReveal.ts`, View Transitions). **Rozszerzamy na Biznes i pro-kom.eu** (prokom-web), Tech ma już własne koło (`switchTechTheme`) — zostaje, dopasować czas.
- Czas 600 ms, krzywa `cubic-bezier(.2,.8,.2,1)`; w prokom-web jedna stała w `src/styles/motion.css`, w Tech w tokenach ruchu.
- W przycisku: ikona obraca się o 90° i przenika (200 ms), napis przenika z przesunięciem 4 px w pionie (200 ms, opóźnienie 120 ms — zmienia się, gdy koło dociera do przycisku).
- `<meta name="theme-color">` aktualizowane po zmianie (pasek przeglądarki na telefonie).
- `prefers-reduced-motion: reduce` albo brak `document.startViewTransition` → zmiana natychmiastowa, bez koła i bez ruchu ikony.
- Przełącznik w arkuszu menu i w szynie używa tej samej animacji (środek koła = kliknięty element).

---

## 2. Tryb Auto: w nocy ciemny („strony same przechodzą w dark mode, gdy jest ciemno”)

### 2.1. Reguła (skrypt w `<head>`, przed pierwszym malowaniem)
Kolejność:
1. Parametr adresu `?motyw=jasny|ciemny|auto` (przejście z innej linii, §3) → zapisz wybór (`auto` = usuń klucz) i usuń parametr z paska adresu (§3.3).
2. Zapisany wybór w `localStorage['pk-theme']` = `light` | `dark` → użyj go. **Wybór człowieka zawsze wygrywa.**
3. Brak wyboru (= Auto):
   - linia z ciemnym motywem domyślnym (Software, pro-kom.eu — ADR-015 v24, ADR-H001) → **ciemny**;
   - system/telefon mówi „ciemny” (`prefers-color-scheme: dark`) → **ciemny**;
   - **jest noc w Rabce** (od zachodu do wschodu słońca, czas `Europe/Warsaw`, §2.2) → **ciemny**;
   - inaczej → **jasny**.
4. Skrypt zawsze ustawia `data-theme` (dziś przy braku wyboru atrybut bywa pusty i decyduje CSS) — dzięki temu napis przycisku i ikona zawsze wiedzą, co jest na ekranie.

### 2.2. Noc — bez lokalizacji, bez zewnętrznych usług
- Klienci są z Podhala i Małopolski, więc liczymy dla **Rabki-Zdroju (49,61° N, 19,96° E)**, w czasie `Europe/Warsaw` (`Intl.DateTimeFormat` z `timeZone`, działa także na komputerze z inną strefą). Nie pytamy o lokalizację i nie wysyłamy niczego na serwer.
- Implementacja: funkcja `sunTimes(date)` w TS (prokom-web: `src/lib/shared/daylight.ts`) wg standardowego algorytmu NOAA, z testem na kilku datach (np. 21.06, 21.12, 30.03, 26.10 — wartości referencyjne wpisać w test z podaniem źródła, np. timeanddate.com dla Rabki-Zdroju). Do skryptu w `<head>` trafia **tablica 24 wartości** (wschód/zachód w połowie każdego miesiąca, minuty doby czasu warszawskiego) wygenerowana z tej funkcji w czasie budowania, z interpolacją liniową między miesiącami — skrypt zostaje mały i nie liczy trygonometrii przy każdym wejściu. Dokładność ±10 min wystarcza.
- „Noc” = od zachodu do wschodu (bez przesunięć; stała `NIGHT_OFFSET_MIN = 0` do ewentualnej korekty).

### 2.3. Zmiana w trakcie wizyty
- W trybie Auto motyw sprawdzamy ponownie **tylko przy powrocie na kartę** (`visibilitychange` → visible) i przy zmianie ustawień systemu. Nie przełączamy w trakcie czytania.
- Jeśli wynik się zmienił: łagodne przenikanie całej strony 300 ms (bez koła — to nie był klik), z reduced-motion natychmiast.

### 2.4. Co z liniami
| Linia | Auto (brak wyboru) | Uwagi |
|---|---|---|
| Biznes | noc/system → ciemny, dzień → jasny | dziś zawsze jasny bez wyboru (D-K4-5) — **zmiana decyzji** (ADR-028) |
| Instalacje | jak Biznes | dziś system |
| Software | ciemny | bez zmian (ADR-015 v24) |
| pro-kom.eu | ciemny | bez zmian (ADR-H001) |
| Tech | jak Biznes | dziś system (`lib/tech/theme.ts`) |
| Gaming | zawsze ciemny | brak jasnego projektu — §5 |

---

## 3. Ten sam motyw na innych liniach („jak zmienię motyw na jednej stronie, inne strony linii też się w nim wyświetlają”)

### 3.1. Czy to możliwe?
Tak, bez ciasteczek i bez zewnętrznych usług. Każda domena ma osobny `localStorage`, więc wybór **niesiemy w adresie przy przejściu między naszymi stronami**. Wspólny klucz `pk-theme` i te same wartości mają już prokom-web i Tech.

### 3.2. Wysyłanie (strona, z której klient wychodzi)
- Jeden globalny nasłuch kliknięć (prokom-web: mała wyspa `ThemeCarry` w layoucie `(sites)`; Tech: w `TechShell`; Gaming: nie wysyła, bo nie ma wyboru) na `click` i `auxclick` (środkowy przycisk = nowa karta).
- Dotyczy tylko linków `<a>` do **naszych domen**: `prokombiznes.pl`, `prokominstalacje.pl`, `prokomsoftware.pl`, `pro-kom.eu`, `prokomserwis.pl`, `prokomgaming.pl` (+ `www.` i hosty `staging.*` z konfiguracji środowiska). Lista w jednym miejscu (prokom-web: obok `SHARED_LINE_KEYS`/adresów linii; Tech: `config/prokom.ts` → `lines`).
- Do adresu dopisujemy `motyw=jasny|ciemny|auto` (bieżący wybór), **tylko na czas kliknięcia** — po 0 ms przywracamy oryginalny `href`, żeby skopiowany link i HTML dla Google były czyste. W HTML strony linki nie mają parametru (roboty go nie widzą, więc nie ma duplikatów adresów).
- Nie dotykamy linków z `target` do innych domen niż nasze, `mailto:`, `tel:`.

### 3.3. Odbieranie (strona, na którą klient wchodzi)
- Skrypt w `<head>` (§2.1 pkt 1) czyta `motyw`, zapisuje wybór, ustawia `data-theme`.
- **Usunięcie parametru z paska adresu dopiero po hydratacji**, przez natywne `window.history.replaceState(window.history.state, '', czystyAdres)` (Next.js od 14.1 synchronizuje natywne History API z routerem — **sprawdzić w dokumentacji zainstalowanej wersji** przed użyciem; nie `router.replace`, bo pobierałby RSC ponownie).
- Nieznana wartość parametru → ignorujemy i i tak usuwamy go z adresu.
- Strony mają `canonical` bez parametru (już dziś) — nic więcej dla SEO.
- Gaming: odbiera i **tylko usuwa** parametr (§5).

### 3.4. Granice (świadomie)
- Synchronizacja działa przy przejściu linkiem z naszej strony. Jeśli ktoś wpisze adres ręcznie albo wejdzie z Google, druga strona pokaże swój zapisany wybór albo Auto — to akceptujemy (bez śledzenia między domenami).
- Kilka kart naraz w tej samej domenie synchronizuje się już dziś (`storage` event).

---

## 4. Pasek linii (BrandBar) — „premium i mega”, w tym samym miejscu

Szefowi pasek się podoba — zostaje **w tym samym miejscu** (nad kapsułą, ≥ 1081 px, przewija się ze stroną). Podnosimy jakość:

1. **Pigułka podążająca za kursorem:** jeden element tła (zaokrąglony, kolor obramowania kapsuły w 60% krycia) przesuwa się pod wskazywaną linią (`transform` + `width`, 180 ms, ta sama krzywa co kapsuła). Po zejściu kursora wraca pod bieżącą linię. Klawiatura: pigułka idzie za fokusem.
2. **Kreska linii żyje:** 11×3 px → przy wskazaniu 18×3 px z miękką poświatą w kolorze linii (`box-shadow: 0 0 10px` koloru linii w 55% krycia); bieżąca linia ma kreskę 18 px na stałe i lekką pigułkę w kolorze linii (tło: kolor linii w 10–12% krycia, tekst `--nav-ink`, `font-weight: 800`).
3. **Dymek z opisem linii** po 350 ms wskazania albo przy fokusie: krótki opis z danych linii (prokom-web: `CompanyData.lines[]` — jeśli brak pola opisu, dodać `tagline` w osobnym PR `feat/wsp-*` z migracją dodającą; Tech: `config/prokom.ts` → `lines[].description`, już jest). Np. „Kasy, komputery i programy”. Bez dymka na urządzeniach dotykowych.
4. **Rytm:** odstęp 18 → 6 px między pozycjami (pigułki mają własny padding 6×10 px), wysokość paska 38 px bez zmian (żeby nie przesunąć kapsuły), separator „·” między lewą i prawą częścią usunięty — prawa część ma własną cienką linię oddzielającą 1 px × 16 px.
5. **Wejście:** przy pierwszym wczytaniu pozycje pojawiają się po kolei (opacity + 4 px, 30 ms odstępu, raz na sesję — `sessionStorage`), z reduced-motion bez animacji.
6. Kontrast AA w obu motywach (test kontrastu jak `shared-tokens.test.ts`), Gaming: złota kreska ciemniejsza na jasnym tle (`--gaming-dash`, §2.4 WSPOLNE-ELEMENTY — bez zmian).
7. Bez nowych bibliotek. Pigułka i dymek = jedna mała wyspa kliencka; reszta paska zostaje Server Component. Budżet JS linii nie może urosnąć o więcej niż ~2 kB gz (sprawdza e2e budżetu Software).

Ten sam wygląd i zachowanie w Tech (`components/tech/BrandBar.tsx`, `tech-nav.css`) i — nowy element — w Gaming (§5).

---

## 5. Gaming (prokomgaming.pl)

- **Dostaje pasek linii** jak wszystkie strony (dziś go nie ma): nad nagłówkiem, ≥ 1081 px, wg §4, Gaming jako bieżąca linia (złota kreska), pozostałe linie z adresami (te same domeny co §3.2). Dane linii: stała lista w kodzie Gaming (`lib/lines.ts`), bo Gaming nie czyta `CompanyData` prokom-web; kolejność: PRO-KOM, Biznes, Instalacje, Software, Tech, **Gaming na końcu** (WSPOLNE-ELEMENTY §2.4). Prawa część: status godzin i telefon Gaming jak w obecnym nagłówku.
- **Motyw: zostaje tylko ciemny** (rekomendacja — decyzja Krystiana/szefa w `docs/zadania/runda-1811.md` §7). Jasny motyw Gaming to nowy projekt całej strony (sceny, istoty, poświaty) — kilka wieczorów bez wpływu na sprzedaż. Dlatego: bez przycisku motywu w Gaming; parametr `?motyw` przy wejściu z innej linii tylko usuwamy z adresu; wybór klienta zostaje zapisany na pozostałych liniach.

---

## 6. Szyna po lewej (≥ 1400 px) — przycisk motywu na każdej stronie

- Nowa pozycja szyny **nad „Do góry”**: ikona księżyca/słońca (jak w kapsule).
  - Szyna zwinięta (64 px): sama ikona, podpis w dymku jak inne pozycje.
  - Szyna rozwinięta (248 px): napis „Ciemny motyw” / „Jasny motyw” (klik = przełączenie z kołem), a pod nim mały przełącznik **Jasny · Ciemny · Auto** (3 pigułki 28 px, ten sam stan co arkusz menu).
- prokom-web: we wspólnym `SiteRail` (`src/components/shared/SiteRail.tsx`) — jedna zmiana, wszystkie linie dostają ją same. **Linie bez ciemnego projektu** nie pokazują pozycji (dziś: wszystkie cztery tenanty go mają).
- **pro-kom.eu ma szynę tylko na `/`** (H1-2) — szef chce przycisk motywu w szynie „na każdej stronie”: hub montuje szynę na wszystkich podstronach jak pozostałe linie (podstrony: zwinięta „Strona główna”, „Na tej stronie” od 3 sekcji, motyw, „Do góry”).
- Tech: `components/tech/SectionRail.tsx` — ta sama pozycja i zachowanie. Sprawdzić, na których stronach Tech szyna jest montowana; ma być na każdej publicznej.
- Gaming: szyna (`src/components/rail/`) bez pozycji motywu (§5).

---

## 7. Testy (Definition of Done tych zmian)
- Vitest: `sunTimes` (4 daty referencyjne ze źródłem), reguła §2.1 (tablica przypadków: param, zapis, linia, system, noc/dzień), budowa adresu z parametrem (tylko nasze domeny, zachowanie `#` i istniejącego query), czyszczenie adresu.
- Playwright: (1) klik „Ciemny motyw” → `data-theme=dark`, napis „Jasny motyw”, `localStorage`; (2) zegar ustawiony na 22:00 i 12:00 czasu warszawskiego (`page.clock`) przy pustym wyborze → ciemny/jasny na Biznesie; (3) klik w link linii w pasku → adres docelowy ma `motyw=…` w żądaniu, a po wczytaniu pasek adresu go nie ma (w e2e: inny host tego samego serwera, np. `software.localhost`); (4) reduced-motion → brak `data-theme-reveal`; (5) szyna 1440 px: pozycja motywu na stronie głównej i podstronie każdej linii; (6) brak poziomego przewijania 360 px.
- axe bez nowych błędów, kontrast AA paska i przycisku w obu motywach, Lighthouse bez spadku.
