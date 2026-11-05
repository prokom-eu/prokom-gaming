# PRO-KOM Gaming — runda wyglądu v2 + nawigacja: plan sesji i prompty (03.11.2026)

Spec rundy: `docs/design/prokomgaming/runda-v2/ZMIANY.md` · sceny: `runda-v2/SCENY-BRIEF.md` · uwagi Krystiana (zrzuty): `runda-v2/uwagi-krystiana/` · decyzja: `docs/decyzje/ADR-G013-runda-wizualna-v2.md`.
Nawigacja: `docs/zadania/gaming-nawigacja.md` (GN-1, GN-2, GN-3 — prompty tam, tu tylko miejsce w kolejności).
Strona działa na produkcji: **każdy PR → staging → Krystian sprawdza → produkcja.** Nie zbieramy kilku PR-ów w jedno wdrożenie.

**Zmiana 05.11.2026 (decyzja Krystiana):** po GN-1 pozostałe sesje są połączone w 4 większe (A–D). Jedna sesja = jeden plan i jedna decyzja o wyglądzie, ale **dwa PR-y po kolei** (np. A1, A2) — każdy da się przejrzeć (`/przeglad`) i cofnąć osobno. Prompty R3–R9 i GN-2/GN-3 zostają jako składniki (§4, `gaming-nawigacja.md` §2).

## 1. Kolejność
| # | Sesja | Składniki (PR-y) | Co | Wieczory | Gałęzie |
|---|---|---|---|---|---|
| 1 | **R1** ✓ | — | logo w Google, podglądy linków, Umami, projekt polityki (#74) | 0,5 | — |
| 2 | **R2** ✓ | — | „Z podań” → „Wyróżnik” (#75) | 0,5 | — |
| 3 | **GN-1** ✓ | — | nagłówek, pasek przewijania, dolny pasek telefonu (#77) | 0,5 | — |
| 4 | **A — komputer na scenie** | A1 = R3, A2 = R5 | hero (imię nad komputerem, sceny kodem) + miniatury zestawów (komputer na środku); wspólne boxy obudów | 1,5 | `feat/a1-hero`, `feat/a2-miniatury` |
| 5 | **B — strona główna** | B1 = R6, B2 = GN-2 | 4 sekcje głównej + boczna szyna (korzysta z `id` sekcji z B1) | 2,25 | `feat/b1-sekcje-glownej`, `feat/b2-szyna` |
| 6 | **C — strony dla klienta** | C1 = R7, C2 = R8 | „Dla rodziców” i „Kontakt” od nowa, wspólne bloki (dowody, kontakt, FAQ) | 1,5 | `feat/c1-dla-rodzicow`, `feat/c2-kontakt` |
| 7 | **D — wyszukiwarka i domknięcie** | D1 = GN-3, D2 = R9 | Ctrl K na gotowym nagłówku i szynie + przegląd całej rundy | 1 | `feat/d1-szukaj`, `fix/d2-przeglad` |
| — | **R4** | — | nowe sceny 16 istot — gdy Krystian ma grafiki (`SCENY-BRIEF.md`); najlepiej po A | 0,5 | `feat/r4-sceny` |
| | | | **Razem (A–D + R4)** | **ok. 6,75** | |

Sesja może trwać kilka wieczorów — ciągłość niesie `docs/STAN.md` („Następny krok” na koniec każdego wieczoru). Poza kodem równolegle: prawnik (regulamin, polityka), generowanie scen, Search Console.

## 2. Zasady dla każdej sesji (dopisz do promptu, jeśli Claude Code ich nie widzi)
- Start: `git fetch`, gałąź pierwszego PR-u od `origin/develop`, `docs/STAN.md` „W toku”.
- Najpierw zrzuty „przed” do `tmp/zrzuty-przed/<sesja>/` (1440, 1280, 390; hero też 1920) dla obu składników, potem **jeden plan** w trybie planowania do akceptacji Krystiana — z podziałem na dwa PR-y. Sesje z wyglądem (A, B1, C): **w planie 2 warianty** (zrzuty szkicu w przeglądarce) do wyboru.
- **Dwa PR-y po kolei:** pierwszy PR → `/przeglad` → `/pr`; drugi składnik na gałęzi od pierwszej. Po scaleniu pierwszego (squash): `git rebase --onto origin/develop <gałąź-1> <gałąź-2>`, testy, `/przeglad`, `/pr`. Staging i sprawdzenie Krystiana po każdym PR-ze (§4); produkcja może objąć oba naraz, gdy oba przeszły staging.
- Wygląd tylko z `tokens.css`, kroje Cinzel/Manrope, skill frontend-design z zastrzeżeniem z CLAUDE.md (wzorzec marki wygrywa). Liczby z danych, nie z tekstu.
- Koniec każdego PR-u: lint, typecheck, testy, build, e2e zmienionego obszaru, axe, Lighthouse 5 stron z G15 bez spadku (pomiar develop i gałęzi na tym samym komputerze), zrzuty „po” w PR, `/przeglad`, `/pr`. Koniec sesji: `/koniec-sesji`.

## 3. Prompty sesji (start)

### A — komputer na scenie (A1 = R3, A2 = R5)
```
/zadanie A — komputer na scenie: hero (R3) i miniatury zestawów (R5)
Przeczytaj docs/zadania/gaming-runda-v2.md §2 i prompty składowe R3 i R5 (§4). Gałąź feat/a1-hero od origin/develop.
Zrzuty „przed” dla obu składników, potem jeden plan w trybie planowania do mojej akceptacji: 2 warianty układu hero i 2 warianty wielkości komputera w miniaturach, podział na PR A1 (R3: boxy obudów, hero, sceny kodem) i A2 (R5: miniatury na boxach z A1).
Wykonaj A1 → /przeglad → /pr; potem A2 na feat/a2-miniatury (od A1, po scaleniu A1 rebase na develop) → /przeglad → /pr.
DoD każdego PR-u: lint, typecheck, testy, build, CI, Lighthouse bez spadku; STAN.
```

### B — strona główna (B1 = R6, B2 = GN-2)
```
/zadanie B — strona główna: sekcje (R6) i boczna szyna (GN-2)
Przeczytaj docs/zadania/gaming-runda-v2.md §2, prompt R6 (§4) i GN-2 (docs/zadania/gaming-nawigacja.md §2). Gałąź feat/b1-sekcje-glownej od origin/develop.
Jeden plan: 2 warianty każdej z 4 sekcji + teksty §4 do akceptacji; w B1 od razu docelowe id sekcji wg NAWIGACJA.md §4.2 (tabela I–XI), w B2 szyna i „Na tej stronie” z prawdziwych sekcji.
Wykonaj B1 → /przeglad → /pr; potem B2 na feat/b2-szyna → /przeglad → /pr.
DoD każdego PR-u: lint, typecheck, testy, build, CI, Lighthouse bez spadku; prawdziwy telefon; STAN.
```

### C — strony dla klienta (C1 = R7, C2 = R8)
```
/zadanie C — „Dla rodziców” (R7) i „Kontakt” (R8) od nowa
Przeczytaj docs/zadania/gaming-runda-v2.md §2 i prompty R7 i R8 (§4). Gałąź feat/c1-dla-rodzicow od origin/develop.
Jeden plan: 2 warianty wyglądu dla każdej strony, pełne teksty §5 i §6 do akceptacji przed kodem; wspólne bloki (dowody firmy, kontakt) jako komponenty użyte na obu stronach.
Wykonaj C1 → /przeglad → /pr; potem C2 na feat/c2-kontakt → /przeglad → /pr.
DoD każdego PR-u: lint, typecheck, testy, build, CI, Lighthouse bez spadku; prawdziwy telefon; STAN.
```

### D — wyszukiwarka i domknięcie (D1 = GN-3, D2 = R9)
```
/zadanie D — wyszukiwarka Ctrl K (GN-3) i przegląd rundy (R9)
Przeczytaj docs/zadania/gaming-runda-v2.md §2, GN-3 (docs/zadania/gaming-nawigacja.md §2) i prompt R9 (§4). Gałąź feat/d1-szukaj od origin/develop.
Plan D1 w trybie planowania do mojej akceptacji (lupa w nagłówku 1200–1399 px: sprawdź, czy 1200 px się mieści — NAWIGACJA.md §2.3). Po scaleniu D1: D2 na fix/d2-przeglad od origin/develop (kryteria ZMIANY.md §8 na stagingu z wyszukiwarką).
DoD każdego PR-u: lint, typecheck, testy, build, CI; /przeglad; STAN; /pr.
```

## 4. Prompty składowe (zakres PR-ów; R1, R2, GN-1 — zrobione)

### R1 — favicon, og:image, Umami, polityka
```
/zadanie R1 — logo w Google, obrazki podglądu, Umami na produkcji, projekt polityki
Gałąź fix/r1-favicon-og-umami od origin/develop. Pliki pakietu rundy v2 (docs/design/prokomgaming/runda-v2/*, ADR-G013, docs/zadania/gaming-runda-v2.md) są nieśledzone — commit w tym PR.
Przeczytaj: runda-v2/ZMIANY.md §0 (zasady) i §1, ADR-G013, src/app/(site)/layout.tsx, icon.svg, apple-icon.png, JsonLd.tsx, generowanie metadanych stron (generateMetadata), compose.prod.yml, zmienne Umami z G15.
Plan w trybie planowania do mojej akceptacji.
1. Favicon wg §1.1: src/app/favicon.ico (16/32/48), icon.png 192 i 512 z sygnetu (sprawdź w docs Next 16 konwencję plików ikon i miejsce favicon.ico przy grupach tras), <link rel=icon> do PNG/ICO na głównej, JSON-LD WebSite (name, alternateName, url). Test e2e: /favicon.ico 200 image/x-icon, WebSite w JSON-LD głównej.
2. og:image wg §1.2: opengraph-image.tsx — główna, zestawy/[slug] (scena, imię Cinzel, moc, cena „od” z lib/pricing), komputer-do/[gra], domyślny dla stron treści; kroje z plików w repo; twitter:card summary_large_image. Test: każda strona z sitemapy ma og:image 200, 1200×630.
3. Umami wg §1.3: znajdź, dlaczego skrypt nie renderuje się na produkcji (warunek, zmienna). Napraw w kodzie, a brakującą zmienną dopisz do .env.example i docs/wdrozenia.md — wartość na serwerze wpisze Krystian (nie czytaj .env). Test dymny w smoke.sh: główna ma /_s/script.js z data-website-id.
4. Polityka §1.4–1.5: przygotuj zaktualizowaną treść polityki jako plik docs/prawne/polityka-projekt-v2.md (dla prawnika, z zaznaczonymi zmianami) — w panelu nic nie zmieniaj; napis „Projekt do weryfikacji” zostaje do decyzji Krystiana po prawniku.
Nie zmieniaj wyglądu stron.
DoD: lint, typecheck, testy, build, CI; /przeglad; STAN; /pr.
```

### R2 — Wyróżnik zamiast „Z podań”
```
/zadanie R2 — „Z podań” → „Wyróżnik” na 16 kartach zestawów
Gałąź feat/r2-wyroznik od origin/develop.
Przeczytaj: runda-v2/ZMIANY.md §0 i §2 (tabela 16 tekstów), uwagi-krystiana/07-z-podan-do-usuniecia.png, src/collections/Builds.ts (myth, legend, legendSource), BuildHero.tsx, CreatureCard.tsx, BuildCardView.tsx, seed builds.
Plan w trybie planowania do mojej akceptacji.
1. Builds: grupa highlight { title ≤ 40, body ≤ 240 } (wymagana), migracja z danymi z tabeli §2 (porównaj fakty z seedem — przy różnicy wygrywa seed, popraw tekst i wypisz w PR). myth/legend/legendSource: ukryte w panelu (admin.hidden), bez kasowania danych, wymagalność zdjęta.
2. BuildHero: blok „Wyróżnik” w miejscu „Z podań” (pieczęć, tytuł Cinzel, treść Manrope bez kursywy, bez linku źródła).
3. Karty (/zestawy, „Szesnaście istot” na głównej, „Inne istoty”): zdanie pod imieniem = highlight.title zamiast tekstów z podań.
4. Zostają: imiona, pieczęcie, przydomki, sceny, opisy „W grach”.
5. Testy: e2e — na 16 kartach brak tekstu „Z podań” i linków do źródeł podań (wikipedia, nationalgeographic, britannica, ceeol, teatrnn), jest „Wyróżnik” z tytułem; panel: highlight edytowalny, walidacja długości.
DoD: lint, typecheck, testy, build, CI; /przeglad; STAN; /pr.
```

### GN-1 — nagłówek, pasek przewijania, telefon
Prompt: `docs/zadania/gaming-nawigacja.md` §2 „GN-1” (bez zmian). Uwaga: zrzuty „przed” rób już po R2.

### R3 — hero: imię nad komputerem + jakość scen
```
/zadanie R3 — hero: imię istoty zawsze nad komputerem, sceny na wyższym poziomie
Gałąź feat/r3-hero od origin/develop (po GN-1).
Przeczytaj: runda-v2/ZMIANY.md §0 i §3.1–3.2, uwagi-krystiana/01-hero-nazwa-za-komputerem.png, Hero.tsx, HeroCard.tsx, Pedestal.tsx, Scene.tsx, BuildHero.tsx, home.css, build.css, public/scenes/*, ADR-G003 (ruch, telefon).
Zrzuty „przed”: hero głównej dla 16 istot (rotacja — wymuś istotę parametrem/stanem testowym) i nagłówek 16 kart, szerokości 1920, 1440, 1280, 1100, 390.
Plan w trybie planowania do mojej akceptacji — z 2 wariantami układu imienia (np. imię wyżej i mniejsze vs komputer niżej i mniejszy; łamanie PANI / ZIMY, BABA / JAGA) na zrzutach.
1. scripts/media/case-boxes.mjs (sharp): bounding box nieprzezroczystych pikseli każdego zdjęcia obudowy → plik danych (jedno źródło dla R3 i R5); uruchamiany przy imporcie zdjęć, test, że każda obudowa ma box.
2. Układ hero (główna + karta): imię w górnej strefie, rozmiar clamp z limitem dla najdłuższego imienia, komputer ustawiany wg boxa — górna krawędź obudowy ≥ 12 px pod linią bazową imienia.
3. Test e2e (twardy): 16 istot × 1920/1440/1280/1100/390 — prostokąty liter imienia (Range.getClientRects) i obudowy (box) bez części wspólnej.
4. Sceny kodem (§3.2 pkt 1): warstwy (tło, mgła, poświata pod postumentem, pierwszy plan), gradacja w kolorze istoty, winieta, paralaksa myszą tylko desktop, max 1 animowana warstwa (świetliki/pył), prefers-reduced-motion statycznie, ostre skalowanie (sizes, AVIF). LCP bez wzrostu (tło priority, dekoracje leniwie).
5. Zrzuty „po” 16 × 5 szerokości w PR (siatka), porównanie z „przed”.
DoD: lint, typecheck, testy, build, CI, Lighthouse bez spadku; prawdziwy telefon; /przeglad; STAN; /pr.
```

### R5 — miniatury zestawów
```
/zadanie R5 — miniatury: komputer na środku postumentu i większy
Gałąź feat/r5-miniatury od origin/develop (po R3 — używa boxów obudów).
Przeczytaj: runda-v2/ZMIANY.md §3.3, uwagi-krystiana/02-miniatury-zestawy.png, BuildCardView.tsx, builds.css, CreatureCard.tsx, creature-card.css, Neighbours.tsx, dane boxów z R3.
Plan z 2 wariantami (wysokość komputera ~70% i ~75% sceny) na zrzutach /zestawy 1440 i 390.
1. Komputer wyśrodkowany wg boxa na postumencie, wspólna linia podstawy dla 16 kart, bez ucinania; tło i animacje bez zmian.
2. To samo w „Szesnaście istot” (główna) i „Inne istoty” (karta).
3. Test e2e: 16 kart — |środek obudowy − środek postumentu| ≤ 4 px, obudowa w kadrze; zrzuty przed/po.
DoD: lint, typecheck, testy, build, CI; /przeglad; STAN; /pr.
```

### R6 — sekcje strony głównej
```
/zadanie R6 — strona główna: „Kupujesz dla dziecka?”, porównanie, „W cenie”, „Napisz, w co grasz”
Gałąź feat/r6-sekcje-glownej od origin/develop.
Przeczytaj: runda-v2/ZMIANY.md §0 i §4 (całość), uwagi-krystiana/04, 05, 06, ForParents.tsx, CompareTeaser.tsx, Included.tsx, FinalCta.tsx, sections.css, home.css, promises.ts, dane firmy (site-settings), lib/fps / fps-results.
Plan w trybie planowania: dla każdej z 4 sekcji 2 warianty (zrzuty 1440 i 390) do mojego wyboru + teksty z §4 do akceptacji.
1. §4.1 „Kupujesz komputer dla dziecka?” — karty dowodów z linkami CEIDG i biała lista (adresy wyszukiwarek, NIP z danych firmy), telefon, 3 kroki; bez zdjęć osób.
2. §4.2 Porównanie — reguła wyboru domyślnych zestawów z danych (każdy krok ≥ 15% klatek), „+X zł → +Y% klatek”, przełącznik gry i rozdzielczości, słupy w kolorze istoty z wejściem raz w widok; etykiety źródeł zostają. Test jednostkowy reguły (nigdy +0%).
3. §4.3 „W cenie każdego komputera” — karty z ikonami z istniejącego źródła obietnic.
4. §4.4 „Napisz, w co grasz” — usuń pusty kształt (sprawdź, co to), łuk 16 pieczęci z poświatą, CTA + 3 szybkie wejścia do /komputer-do/{gra}; telefon bez pustych przestrzeni.
5. id sekcji bez zmian (szyna GN-2 z nich korzysta); jeśli musisz zmienić — wypisz w PR.
DoD: lint, typecheck, testy, build, CI, Lighthouse bez spadku; prawdziwy telefon; /przeglad; STAN; /pr.
```

### R7 — Dla rodziców
```
/zadanie R7 — strona „Dla rodziców” od nowa
Gałąź feat/r7-dla-rodzicow od origin/develop.
Przeczytaj: runda-v2/ZMIANY.md §0 i §5, src/app/(site)/dla-rodzicow/page.tsx i jej komponenty, poradnik /poradniki/rodzice, FAQ tej strony, dane firmy, lib/pricing (przedziały cen z danych), nawigacja: wariant jasny nagłówka (NAWIGACJA.md).
Plan: 2 warianty wyglądu (zrzuty 1440 i 390) + pełne teksty wg struktury §5 (7 części) do mojej akceptacji przed kodem.
1. Struktura §5: hero jasne, 4 pytania rodzica (przedziały z danych — najtańsze pasujące zestawy), dowody (CEIDG, biała lista, adres, od 2004, gwarancja, przykład metryki), zakup w 4 krokach, słowniczek 6 pojęć, FAQ (z istniejącym „Czy da się kupić na raty? Na razie nie…”), zakończenie.
2. Zapytanie z tej strony otwiera formularz z typem „pomóżcie dobrać”.
3. SEO: title/description bez zmian adresu, JSON-LD FAQPage + BreadcrumbList zostają, og:image z R1.
DoD: lint, typecheck, testy, build, CI, Lighthouse bez spadku; prawdziwy telefon; /przeglad; STAN; /pr.
```

### R8 — Kontakt
```
/zadanie R8 — strona „Kontakt” od nowa
Gałąź feat/r8-kontakt od origin/develop.
Przeczytaj: runda-v2/ZMIANY.md §0 i §6, src/app/(site)/kontakt/page.tsx i komponenty, formularz „Krótkie pytanie” (logika bez zmian), dane firmy (telefon, e-mail, adres, godziny — tylko te, które są w danych).
Plan: 2 warianty (1440 i 390) + teksty §6 do akceptacji.
1. Układ §6: nagłówek, 3 równe karty dróg kontaktu (zapytanie wyróżnione), sklep z mapą jako statyczny obraz + link „Prowadź” (bez skryptów map i cookies), krótkie pytanie, „Masz już komputer od nas?”, dane firmy.
2. Telefon i e-mail jako duże cele dotyku na telefonie; LocalBusiness/BreadcrumbList w JSON-LD bez regresji.
DoD: lint, typecheck, testy, build, CI, Lighthouse bez spadku; prawdziwy telefon; /przeglad; STAN; /pr.
```

### GN-2, GN-3
Prompty: `docs/zadania/gaming-nawigacja.md` §2 (bez zmian). GN-2 = B2 (po B1 — `id` sekcji z B1), GN-3 = D1.

### R4 — nowe sceny (gdy są grafiki)
```
/zadanie R4 — nowe sceny 16 istot
Gałąź feat/r4-sceny od origin/develop. Grafiki od Krystiana: public/scenes/nowe/ (nieśledzone; nazwy wg SCENY-BRIEF.md §5).
Przeczytaj: runda-v2/SCENY-BRIEF.md (całość), ZMIANY.md §3, Scene.tsx, HeroCard.tsx, BuildHero.tsx, BuildCardView.tsx, wynik R3.
Plan: raport kontroli stref dla każdej grafiki (§6) — co przechodzi, co nie; zacznij od 2 istot (próba) i pokaż zrzuty przed resztą.
1. scripts/scenes/import.mjs (sharp): przycięcie do szablonu, kontrola stref, WebP + AVIF w szerokościach next/image, oryginały poza repo.
2. Podmiana scen hero, card (i fg, jeśli są) — bez zmian w kodzie układu poza strojeniem poświaty/gradacji pod nowe obrazy.
3. Test imię ≠ komputer (R3) i miniatury (R5) na nowych scenach; LCP bez wzrostu; zrzuty stara/nowa dla 16 istot (1440, 1920, 390) w PR.
DoD: lint, typecheck, testy, build, CI, Lighthouse bez spadku; /przeglad; STAN; /pr.
```

### R9 — przegląd całości
```
/zadanie R9 — przegląd rundy v2 na stagingu i produkcji
Gałąź fix/r9-przeglad od origin/develop.
Przeczytaj: runda-v2/ZMIANY.md §8 (kryteria), STAN.
1. Zrzuty wszystkich stron z sitemapy 1440 i 390 + hero 16 istot 1920; lista różnic względem zamierzonych zmian.
2. Lighthouse mobile 5 stron z G15 + /dla-rodzicow i /kontakt; axe całej strony; brak przewijania w bok 360–414.
3. Sprawdź kryteria §8 jeden po drugim, popraw drobne, większe wpisz do STAN „Pomysły na później”.
DoD: lint, typecheck, testy, build, CI; /przeglad; STAN; /pr.
```

## 5. Krystian po każdym PR-ze (staging, ok. 10 min)
- **R1:** `prokomgaming.pl/favicon.ico` się otwiera; link do strony głównej i do Wampira wklejony na Messengerze pokazuje obrazek; w Umami widać Twoje wejście. Po produkcji: Search Console → „Poproś o zindeksowanie” strony głównej. Projekt polityki → prawnik.
- **R2:** 3 dowolne karty — jest „Wyróżnik”, nie ma „Z podań”; w panelu tekst wyróżnika edytowalny.
- **A1 (R3):** hero 16 istot na komputerze i telefonie — imię nigdzie nie chowa się za komputerem; sceny ładniejsze, nic nie zwalnia.
- **A2 (R5):** „Wszystkie zestawy” — komputery na środku postumentów.
- **B1, C1, C2 (R6–R8):** sekcje i strony na komputerze i prawdziwym telefonie; telefon i e-mail klikają się.
- **B2 (GN-2), D1 (GN-3):** listy w `gaming-nawigacja.md` §3.
- **R4:** każda istota stara/nowa — akceptujesz albo wskazujesz sceny do ponownego wygenerowania.
