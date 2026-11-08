---
description: Przygotuj i otwórz pull request do develop — tytuł i opis gotowe do scalenia
---

Przygotowujemy pull request z bieżącej gałęzi do `develop`. Wywołanie `/pr` to zgoda na wypchnięcie bieżącej gałęzi i utworzenie PR do `develop`.

1. **Sprawdzenia (przerwij i powiedz mi, jeśli coś nie gra):** gałąź nie jest `main` ani `develop`; brak niezacommitowanych zmian; `develop` scalony do gałęzi, jeśli poszedł do przodu; przy kodzie `pnpm lint && pnpm typecheck && pnpm test` i e2e zmienionego obszaru przechodzą (podaj wynik); przy UI — zrzuty 1440 i 414 porównane ze wzorcem.
2. **Kontekst:** `git fetch`, `git log origin/develop..HEAD --oneline`, `git diff origin/develop...HEAD --stat`, `docs/STAN.md` („W toku”), sesja w `docs/zadania/prokomgaming.md`.
3. **Tytuł** — Conventional Commits po polsku, max ~70 znaków, efekt całej gałęzi (nigdy „wip”), np. `feat(g4): cennik, zgodność i strażnik marży`.
4. **Opis:** **Co** (3–7 punktów zachowania), **Dlaczego** (1–2 zdania + sesja/ADR), **Jak sprawdzić** (kroki, także na telefonie), **Checklista** (tylko faktycznie sprawdzone: testy, zrzuty 1440/414, Lighthouse, axe, telefon), **Ryzyka i uwagi** (migracje, zmienne, poza zakresem).
5. **Gdy sprawdzenia z kroku 1 są zielone — nie czekaj na „ok”:** opis do pliku tymczasowego poza repo, `git push -u origin <gałąź>`, `gh pr create --base develop --head <gałąź> --title "<tytuł>" --body-file <plik>`. Zweryfikuj `gh pr view` i podaj link.
6. **Czekaj na „ok” tylko, gdy:** coś w kroku 1 nie przeszło albo pominięto, w PR jest decyzja do potwierdzenia (nowa zależność, zmiana ADR, odstępstwo od planu, migracja usuwająca dane), albo celem nie jest `develop`.
7. Przypomnij: **Squash and merge** przy zielonym CI; potem `.\scripts\start.ps1`.
