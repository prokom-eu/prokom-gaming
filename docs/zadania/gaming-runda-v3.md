# PRO-KOM Gaming — runda v3 „premium”: sesje i prompty (08.11.2026)

Spec: `docs/design/prokomgaming/runda-v3/PREMIUM.md` · decyzja: `docs/decyzje/ADR-G014-ruch-premium.md` · zrzuty Krystiana: `runda-v3/uwagi-krystiana/`.
Układ jak w rundzie v2 po zmianie: **większe sesje, kilka PR-ów w jednej sesji, każdy PR osobno na staging → sprawdzenie → produkcja.**

## 1. Sesje
| Sesja | PR-y | Zakres | Wieczory |
|---|---|---|---|
| **E** | E1 · E2 · E3 | E1 poprawki (miniatury, Bies + walidacja zdjęć, szyna Ctrl K, usunięcie koloru światła); E2 system ruchu + hero + karty istot + głębia scen; E3 sekcje, porównanie, liczby, konfigurator, mikrointerakcje, przejścia stron | ok. 3 |
| **F** | F1 | przegląd całości: nagrania przed/po, Lighthouse, prawdziwy telefon, poprawki | 0,5 |

Poza kodem (Krystian): nowe zdjęcie obudowy Biesa (`EXO`) i większe zdjęcia `LB500`, `PANO130`, `PANO100` (PREMIUM §1.2); prawnik — regulamin i polityka.

## 2. Prompty

### Sesja E
```
/zadanie E — runda v3 „premium”: poprawki, ruch, dopracowanie (3 PR-y: E1, E2, E3)
Pliki pakietu rundy v3 (docs/design/prokomgaming/runda-v3/*, ADR-G014, docs/zadania/gaming-runda-v3.md) są nieśledzone — commit w E1.
git fetch; każdy PR na osobnej gałęzi od origin/develop po scaleniu poprzedniego: fix/e1-poprawki, feat/e2-ruch-hero, feat/e3-ruch-sekcje.
Przeczytaj: runda-v3/PREMIUM.md (całość), ADR-G014, ADR-G003 (ruch i telefon), runda-v2/ZMIANY.md §3 (boxy obudów, sceny), STAN.
Najpierw zrzuty i nagrania „przed” (tmp/zrzuty-przed/e/): główna (hero + przewinięcie całej strony), /zestawy (z filtrowaniem), karta Biesa i Wampira, /konfigurator, /porownaj, /dla-rodzicow, /kontakt — 1440 i 390. Potem plan w trybie planowania do mojej akceptacji, z podziałem na E1–E3.

E1 — poprawki (PREMIUM §1):
1. Miniatury §1.1: wyśrodkowanie na /zestawy (dziś +70 px we wszystkich 16), wysokość ~70–75% sceny, ostrość (sizes → ≥ 2× szerokości), te same zasady na głównej i „Inne istoty”; twarde e2e z §1.1.
2. Zdjęcia obudów §1.2: walidacja w panelu (dotyka krawędzi / < 900 px → ostrzeżenie), lista ostrzeżeń dla obecnych zdjęć; nowych zdjęć nie szukaj — wgra je Krystian.
3. Szyna §1.3: przycisk szukania mieści się w rozwiniętej szynie (wybór wariantu na zrzucie w planie), test bez przepełnienia.
4. Kolor światła §1.4: usuń wybór i wzmianki ze wszystkich miejsc z listy (konfigurator, „Dostrój zestaw”, formularz, maile, panel — pole ukryte, konto, stary ?swiatlo= ignorowany), dodaj zdanie o ARGB; testy z §1.4.

E2 — ruch: system + hero + karty + sceny (PREMIUM §2.1–2.4):
1. Tokeny ruchu w tokens.css, hook/utility wejścia w widok, obsługa prefers-reduced-motion w jednym miejscu.
2. GSAP + ScrollTrigger + SplitText: sprawdź licencję i aktualną wersję, przypnij, ładowanie dynamiczne po LCP tylko na stronach z hero/porównaniem; zmierz wpływ na rozmiar JS (budżet +≤ 35 KB gzip na głównej).
3. Hero głównej i karty: sekwencja wejścia §2.3 (ok. 1,2 s, tekst i przyciski klikalne od pierwszej klatki), stan spoczynku, zmiana istoty w hero głównej z pauzą na hover/fokus.
4. Karty istot: hover, kaskada wejścia, filtrowanie FLIP z licznikiem.
5. Sceny §2.4: rozdzielenie na plany w scripts/scenes (wyjście: warstwy), paralaksa, mgła, jedna animowana warstwa na scenę (śnieg/iskry/błysk/odbicie wg istoty).
6. Plan z 2 wariantami intensywności ruchu (spokojny / mocniejszy) na nagraniu hero do mojego wyboru.

E3 — ruch: sekcje, liczby, konfigurator, mikrointerakcje, przejścia stron (PREMIUM §2.3):
1. Wejścia sekcji, liczniki klatek, porównanie (słupy, liczby, zmiana gry), „W cenie”, łuk pieczęci.
2. Konfigurator: kroki, wybór opcji, przewijane cyfry ceny i klatek, przejście podglądu obudowy.
3. Mikrointerakcje: przyciski, licznik porównania/zapytania z lotem ikony, arkusze na telefonie, fokus.
4. View Transitions: lista → karta zestawu (obudowa), sprawdź sposób włączenia w Next 16; bez obsługi w przeglądarce — zwykłe przejście.
5. „Dla rodziców” i „Kontakt” — tylko spokojne wejścia i hover.
6. Stany ładowania (Krystian 08.11, PREMIUM §2.3 „Ładowanie”): wolne przejście między stronami (`loading.tsx`), sceny i zdjęcia wyłaniają się zamiast „wskakiwać”, przyciski formularzy „wysyłam…”.

Każdy PR: testy z PREMIUM §3 dla swojego zakresu, reduced-motion e2e, Lighthouse 5 stron z G15 bez spadku, nagrania „po” w PR, prawdziwy Android przed scaleniem E2 i E3; lint, typecheck, testy, build, CI; /przeglad; STAN; /pr.
Nie zmieniaj: cen i lib/pricing, treści poza tymi z PREMIUM, kolejności sekcji, adresów.
```

### Sesja F
```
/zadanie F — przegląd rundy v3
Gałąź fix/f1-przeglad od origin/develop (po E3).
Przeczytaj PREMIUM.md §3 i STAN. Nagrania i zrzuty wszystkich stron z sitemapy (1440, 390) + hero 16 istot; Lighthouse mobile 5 stron z G15 + /dla-rodzicow, /kontakt, /konfigurator; axe; reduced-motion; prawdziwy Android i iPhone. Popraw drobne, większe do STAN „Pomysły na później”.
DoD: lint, typecheck, testy, build, CI; /przeglad; STAN; /pr.
```

## 3. Krystian po każdym PR (staging)
- **E1:** `/zestawy` — komputery na środku i ostre; szyna — „Szukaj” się mieści; konfigurator i zapytanie — nie ma wyboru światła, jest zdanie o ARGB; wgraj nowe zdjęcie Biesa i sprawdź hero.
- **E2:** wejście na główną i kartę zestawu na komputerze i telefonie — robi wrażenie, ale nie przeszkadza; najedź na karty w `/zestawy`; włącz „ogranicz ruch” w systemie — strona bez animacji.
- **E3:** porównanie, konfigurator (zmiana ceny), dodanie do porównania, przejście z listy na kartę zestawu.
