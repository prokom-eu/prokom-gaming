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
