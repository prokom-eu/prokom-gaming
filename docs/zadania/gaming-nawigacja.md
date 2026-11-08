# Nawigacja Gaming — sesje GN-1, GN-2, GN-3 (prokom-gaming)

Spec: `docs/design/prokomgaming/nawigacja/NAWIGACJA.md` · decyzja: `docs/decyzje/ADR-G012-nawigacja-szyna-wyszukiwarka.md` · wzorzec: `docs/design/prokomgaming/nawigacja/GamingNawigacja.dc.html` (plansza „10 · Gaming” na płótnie https://claude.ai/artifact/7HKNezL1nNmgeZPJum8rQG).

## 1. Sesje

| Sesja | Zakres | Szac. | Gałąź | Zależy od |
|---|---|---|---|---|
| **GN-1** | nagłówek w nowym wyglądzie (kapsuła, stany, przyklejony — decyzja w planie), wariant „Dla rodziców”, szerokości 1280/1200/761, pasek przewijania, dolny pasek telefonu z kulą Konfiguratora, wygląd `MenuSheet` | 0,5 | `feat/gn1-naglowek` | G16 scalone |
| **GN-2** | boczna szyna: `SiteRail`, `id` sekcji strony głównej, aktywna sekcja, „Na tej stronie” na podstronach, akcje (Porównanie, Zapytanie, „Do góry”), flaga „Ostatnio oglądane” | 0,75 | `feat/gn2-szyna` | GN-1 |
| **GN-3** | wyszukiwarka: indeks (`/api/szukaj/indeks`), dopasowanie, `SearchDialog` (desktop + arkusz na telefonie), lupa w nagłówku do 1399 px, pozycja „Szukaj” w szynie, zdarzenia Umami | 0,5 | `feat/gn3-szukaj` | GN-2 (pozycja w szynie), GN-1 (lupa) |
| | **Razem** | **≈ 1,75** | | |

- **Kiedy:** po starcie 20.11 (ADR-G012 pkt 7). Każda sesja to osobny PR, można je robić w odstępach. Wyjątek: GN-1 przed startem tylko wtedy, gdy jest wolny wieczór po G16 i staging jest zielony.
- **Plan cięcia:** GN-3 może wejść później. Do tego czasu szyna nie ma pozycji „Szukaj”, a na górze szyny stoi złoty „Dobierz komputer” (`routes.configurator`).
- **Przed każdą sesją:** zrzuty stron do `tmp/zrzuty-przed/`: główna, `/zestawy`, karta Wampira, `/konfigurator`, `/dobor-pod-gre`, `/dla-rodzicow`, `/kontakt`, każda w 1440, 1280, 1100 i 390. Po sesji porównaj. Każda niezamierzona zmiana poza nawigacją to błąd.
- **Na koniec każdej sesji:** `/przeglad` → porównanie z planszą 10 → `/koniec-sesji` → `/pr`.

## 2. Prompty

### GN-1 — nagłówek, pasek przewijania, telefon
```
/zadanie GN-1 — nawigacja Gaming: nowy wygląd nagłówka, pasek przewijania, dolny pasek telefonu
Gałąź feat/gn1-naglowek od origin/develop. Pliki pakietu (docs/design/prokomgaming/nawigacja/*, ADR-G012, to zadanie) są nieśledzone — commit w tym PR.
Przeczytaj: NAWIGACJA.md §0–§3 i §6–§8, ADR-G012, plansza GamingNawigacja.dc.html (sekcje 1, 5, 6), obecne SiteHeader.tsx, MobileTabBar.tsx, MenuSheet.tsx, Logo.tsx, lib/nav.ts, globals.css (.nav, .tabbar, data-scene-top, data-nav-light), tokens.css.
Najpierw zrzuty „przed” (lista w docs/zadania/gaming-nawigacja.md §1), potem plan w trybie planowania do mojej akceptacji — w planie zapytaj o decyzję „nagłówek przyklejony na komputerze: tak/nie” (spec §2.2).
1. tokens.css: zmienne z spec §1 (bez nowych kolorów).
2. SiteHeader: te same elementy i kolejność; kapsuła z linkami, link aktywny (pigułka + romb), „Odpowiadamy w godzinę / codziennie 8–22” w dwóch linijkach (godziny z istniejącego źródła, bez nowego literału w komponencie), okrągłe Porównanie i Konto z licznikiem, „Dobierz komputer” w wariancie złotym z odblaskiem. Stany: nad sceną, przewinięty (szkło, 66 px, złota nitka), chowanie (useHideOnScroll na wszystkich szerokościach, jeśli decyzja „tak”), wariant jasny na „Dla rodziców”.
3. Szerokości spec §2.3 (≥1280 pełny, 1200–1279 bez „Odpowiadamy”, 761–1199 hamburger).
4. Pasek przewijania spec §3 (globals.css serwisu, @supports dla Firefoksa).
5. Telefon spec §6: nagłówek (bez lupy — dojdzie w GN-3, zostaw miejsce), dolny pasek z kulą Konfiguratora i aktywną kreską, MenuSheet — wygląd linków jak kapsuła (treść bez zmian).
6. Dostępność: fokus widoczny, cele ≥ 44 px, prefers-reduced-motion (bez odblasku i wjazdu nagłówka).
7. Testy: e2e — nagłówek 1440/1280/1100/390, aktywny link, licznik porównania, jasny wariant na /dla-rodzicow, chowanie przy przewijaniu; axe 0 błędów; Lighthouse bez spadku (5 stron z G15).
8. Porównanie z planszą 10 (sekcje 1, 5, 6) — zrzuty i różnice w PR.
Nie zmieniaj: pozycji i adresów menu, treści stron, stopki, panelu.
DoD: lint, typecheck, testy, build, CI; /przeglad; STAN; /pr.
```

### GN-2 — boczna szyna
```
/zadanie GN-2 — nawigacja Gaming: boczna szyna (≥ 1400 px)
Gałąź feat/gn2-szyna od origin/develop (po scaleniu GN-1).
Przeczytaj: NAWIGACJA.md §4 i §8, plansza GamingNawigacja.dc.html (sekcje 2 i 3 — ikony w obiekcie ic.*), komponenty strony głównej (src/components/home/*), strony z „Na tej stronie” (zestawy/[slug], konfigurator, dobor-pod-gre, komputer-do/[gra], dla-rodzicow, o-nas, pytania, poradniki), ShellProvider (compareCount).
Plan w trybie planowania do mojej akceptacji — w planie tabela „Na tej stronie”: dla każdej strony prawdziwe sekcje i nagłówki z kodu (nie z tabeli spec, jeśli się różnią).
1. id + scroll-margin-top w 11 sekcjach strony głównej wg spec §4.2 (WorkshopStrip bez id w szynie; od 08.11 usunięty ze strony — ADR-G015). Sprawdź duplikaty id.
2. components/rail/: SiteRail (fixed, 64 → 258 px, hover/focus-within/dotyk, Esc), useActiveSection (IntersectionObserver), railConfig (sekcje główne + „Na tej stronie”), pierścień „Do góry”, licznik Porównania. Bez renderu poniżej 1400 px (nie tylko display:none). Wyłączona na /metryka/* i /konto/*.
3. Na podstronach: grupa „Na tej stronie · {nazwa}”, sekcje główne zwinięte do „Sekcje strony głównej I–XI ▾”, linki /#id.
4. „Ostatnio oglądane”: flaga site-settings.navigation.recentlyViewed (domyślnie wyłączona; migracja tylko jeśli grupy nie ma), localStorage pkg:recent (try/catch, same slugi, max 3).
5. GN-3 jeszcze nie ma: na górze szyny złoty „Dobierz komputer” (routes.configurator) — GN-3 zamieni go na „Szukaj”.
6. Testy: jednostkowe (useActiveSection, railConfig — każde id istnieje), e2e (1440: hover rozwija, klik przewija, aktywna zmienia się przy przewijaniu; 1399: brak szyny; karta zestawu: „Na tej stronie”; klawiatura: Tab, Esc), axe z rozwiniętą szyną, Lighthouse bez spadku.
7. Porównanie z planszą 10 (sekcje 2 i 3) — zrzuty zwinięta/rozwinięta/podstrona, różnice w PR.
Nie zmieniaj: treści sekcji, kolejności sekcji strony głównej, nagłówka (poza tym, co wymaga szyna).
DoD: lint, typecheck, testy, build, CI; /przeglad; STAN; /pr.
```

### GN-3 — wyszukiwarka
```
/zadanie GN-3 — nawigacja Gaming: wyszukiwarka (Ctrl K)
Gałąź feat/gn3-szukaj od origin/develop (po scaleniu GN-2).
Przeczytaj: NAWIGACJA.md §5 i §8, plansza GamingNawigacja.dc.html (sekcja 4), kolekcje builds i games, lib/pricing (cena „od”), lib/games.ts (parsePicker, strony /komputer-do/[gra]), lib/analytics.ts, BottomSheet.tsx; wzór algorytmu: prokom-web src/lib/search.ts (wyszukiwarka Biznesu — skopiuj z nagłówkiem źródła i datą).
Plan w trybie planowania do mojej akceptacji.
1. GET /api/szukaj/indeks: zestawy (nazwa, slug, moc, rozdzielczość, cena „od” z lib/pricing, kolor), gry (nazwa, slug, aliasy), strony (stała lista z lib/nav). Bez internalModel i kosztów. Cache + revalidate przy publikacji. Rozmiar < 30 KB (test).
2. match.ts: bez polskich znaków i wielkości liter, prefiksy, Levenshtein ≤ 1 (słowa ≥ 4 znaków), aliasy gier, synonimy (4k, dla dziecka/syna/córki, tani). Testy tabelaryczne.
3. SearchDialog (lazy, dynamic import): grupy GRY / ZESTAWY (pod grę: ≥ 60 FPS w FullHD — logika „Dobór pod grę”) / STRONY, max 5 na grupę, klawisze ↑↓ ↵ Esc, Shift+Enter dla gry = /dobor-pod-gre?gra=, puste = Popularne (stała lista), brak wyniku = link do /zapytanie. role=dialog, listbox, aria-activedescendant, fokus uwięziony i zwracany.
4. Otwieranie: pozycja „Szukaj” w szynie (zamiast tymczasowego „Dobierz komputer”), lupa w nagłówku do 1399 px, Ctrl K / ⌘K, „/” poza polami formularzy, pole w MenuSheet. Telefon: arkusz na pełną wysokość.
5. Umami: search_open, search_select { kind } — bez frazy.
6. Testy: e2e (Ctrl K → „fortn” → Enter → /komputer-do/fortnite; „xyz” → Zapytaj; telefon: lupa → arkusz; Esc zwraca fokus), axe z otwartym dialogiem, Lighthouse bez spadku (dialog poza głównym pakietem JS).
7. Porównanie z planszą 10 (sekcja 4) — zrzut dialogu 1440 i arkusza 390.
DoD: lint, typecheck, testy, build, CI; /przeglad; STAN; /pr.
```

## 3. Po każdej sesji (Krystian, ok. 10 minut na stagingu)
- **GN-1:**
  - nagłówek na głównej (nad sceną i po przewinięciu), na „Dla rodziców” (jasny wariant) i na karcie zestawu;
  - telefon: dolny pasek z kulą;
  - pasek przewijania w Chrome i Firefoksie.
- **GN-2:**
  - szyna na monitorze ≥ 1400 px: rozwija się, przewija do sekcji, pokazuje aktywną sekcję;
  - karta zestawu: „Na tej stronie”;
  - poniżej 1400 px szyny nie ma.
- **GN-3:**
  - „fortnite”, „cs2”, „wampir”, „dla syna”, „4k”, literówka „kikimra”;
  - telefon: lupa;
  - Umami: zdarzenia `search_*` widoczne w panelu statystyk.
