---
description: Start zadania — kontekst, plan, czekasz na akceptację, potem kod
argument-hint: <sesja, np. G4, albo opis zadania>
---

Zaczynamy zadanie: **$ARGUMENTS**

0. Sprawdź `git status` i `git fetch`; jeśli gałąź jest za `origin` albo są niezacommitowane zmiany — powiedz mi i poczekaj (rozwiązanie: `.\scripts\start.ps1`).
1. Przeczytaj `docs/STAN.md` (zwłaszcza „W toku” → „Następny krok”), opis sesji w `docs/zadania/prokomgaming.md`, odpowiednie sekcje `docs/strony/prokomgaming.md` i powiązane ADR-G w `docs/decyzje/`. Przy UI obejrzyj zrzuty `docs/design/prokomgaming/screens/<Plansza>-1440` i `-414` oraz `stany/`.
2. Gdy zadanie dotyczy API Payload / Next.js — sprawdź dokumentację zainstalowanej wersji, nie pisz z pamięci.
3. Napisz krótko (max 15 linijek):
   - cel własnymi słowami i warunki odbioru („gotowe, gdy…”), w tym telefon 414,
   - pliki, które dodasz lub zmienisz,
   - nowe zależności (z uzasadnieniem) i nowe zmienne środowiskowe,
   - ryzyka i pytania — jeśli czegoś brakuje, wypisz, nie zgaduj.
4. Zaproponuj nazwę gałęzi (`feat/g<n>-...`, `chore/...`, `fix/...`).
5. **Zatrzymaj się i czekaj na moje „ok”**, zanim napiszesz kod.
6. Po akceptacji: małe kroki, po każdym `pnpm lint && pnpm typecheck`. Testy dla cen, zgodności, formularzy i dostępu. Nie wychodź poza zakres — pomysły spoza zakresu zapisz w `docs/STAN.md` → „Pomysły na później”.
