# ADR-G014: Ruch i wrażenie premium — zasady, narzędzia, budżet; bez wyboru koloru światła

- **Status:** przyjęta (Krystian, 08.11.2026)
- **Data:** 2026-11-08
- **Spec:** `docs/design/prokomgaming/runda-v3/PREMIUM.md` · plan: `docs/zadania/gaming-runda-v3.md` · uzupełnia ADR-G003 (wygląd, ruch, telefon)

## Kontekst
Po rundzie v2 strona jest kompletna i spójna, ale statyczna — Krystian ocenia, że brakuje „uczucia premium”. Przy okazji przeglądu: miniatury na `/zestawy` przesunięte o ok. 70 px, ucięte zdjęcie obudowy Biesa, przepełniony przycisk szukania w szynie oraz wybór koloru światła, który wprowadza w błąd (wszystkie obudowy i chłodzenia w zestawach są ARGB).

## Decyzja
1. **Ruch według zasad PREMIUM §2.1:** jedna orkiestrowana chwila na stronę (wejście hero), reszta ruchu odpowiada na działanie użytkownika; animujemy tylko `transform`/`opacity`; `prefers-reduced-motion` = stan końcowy; tokeny ruchu w `tokens.css`.
2. **Narzędzia:** CSS i IntersectionObserver najpierw; GSAP + ScrollTrigger + SplitText (bezpłatne komercyjnie od 2025 r.) tylko dla osi czasu, ładowane dynamicznie po LCP; View Transitions dla przejścia lista → karta zestawu jako ulepszenie. **Odrzucone:** przejmowanie przewijania (Lenis i podobne) — gorsza dostępność i odczucie na gładziku/telefonie; Framer Motion na całej stronie — większy pakiet przy komponentach serwerowych, a CSS pokrywa większość potrzeb.
3. **Budżet:** JS głównej +≤ 35 KB gzip, LCP/CLS bez zmian, INP < 200 ms, płynność na średnim Androidzie.
4. **Bez wyboru koloru światła** — usuwamy z konfiguratora, karty, formularza, maili, panelu i konta; jedno zdanie o ARGB i możliwości ustawienia koloru przed wysyłką na życzenie. Pole `lightColor` zostaje w bazie dla starych zapytań, nie jest już zapisywane.
5. **Sceny** zostają rysowane kodem (decyzja 08.11); głębię dodajemy warstwami i ruchem. Powrót do obrazów malowanych — osobna decyzja, jeśli po E2 sceny nadal odstają.

## Konsekwencje
- Nowa zależność (GSAP) do aktualizowania razem z resztą (dependabot); przy podnoszeniu wersji przejść e2e hero i porównania.
- Każdy nowy element z ruchem musi mieć wariant reduced-motion i test.
- Walidacja zdjęć obudów w panelu chroni przed kolejnymi uciętymi zdjęciami.

## Uzupełnienie (Krystian, 08.11.2026, plan E2)
- **E2 bez GSAP:** wejście hero, zmiana istoty, karty i sceny pokrywa CSS (klatki kluczowe, `@property`, animacje sterowane przewijaniem) i View Transitions; GSAP nie jest zależnością. Pkt 2 decyzji dalej dopuszcza GSAP tam, gdzie potrzebna oś czasu — wraca do oceny w E3 (porównanie). Konsekwencja o dependabocie dotyczy GSAP dopiero, gdy zostanie dodany.
- Wariant intensywności ruchu: **spokojny** (`--motion-scale: 1`), wybrany na nagraniach.

## Uzupełnienie (E3, 08.11.2026)
- **Wejścia sekcji przy przewijaniu** (nagłówki, treść, liczby, ikony — raz, przez `data-reveal`) zastępują dla stron publicznych zasadę ADR-G003 §1 pkt 3 „bez wjeżdżania sekcji przy przewijaniu”. Ograniczenia: tylko `transform`/`opacity` (nagłówek: odsłonięcie `clip-path`), raz na element, ukrycie natychmiastowe, `prefers-reduced-motion` = nic nie czeka ukryte.
- **E3 też bez GSAP:** porównanie i liczby pokrywa CSS (`@property --count-n` + `counter()`, słupy przez `scaleY`), cena w konfiguratorze — mały licznik w `requestAnimationFrame` (`RollNumber`). 0 KB zależności.
- **Krok konfiguratora bez animacji wyjścia** (PREMIUM §2.3: „obecny krok wysuwa się w lewo”): wyjście opóźniałoby pokazanie kroku, o który użytkownik prosi (§2.1 pkt 2) — nowy krok wjeżdża z kierunku zmiany.
- **Wolne przejście między stronami bez `loading.tsx`** (PREMIUM §2.3 „Ładowanie”): zastępnik trasy podmienia stronę przy każdym kliknięciu (mignięcie pustki przy szybkich przejściach) i wyłącza przelot obudowy przez View Transition (nowa strona musi przyjść w tym samym commicie). Zamiast tego `NavPending`: pieczęć po 300 ms, tylko przy wolnej nawigacji.
- **Podgląd obudowy w konfiguratorze:** nowe zdjęcie wyłania się (także z pamięci przeglądarki), bez nakładania na stare — prawdziwe przejście krzyżowe wymagałoby dwóch warstw zdjęć w podglądzie.
