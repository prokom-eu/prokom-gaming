---
description: Przygotuj i otwórz pull request do develop — tytuł i opis gotowe do scalenia
---

Przygotowujemy pull request z bieżącej gałęzi do `develop`.

1. **Sprawdzenia (przerwij i powiedz mi, jeśli coś nie gra):** gałąź nie jest `main` ani `develop`; brak niezacommitowanych zmian; gałąź wypchnięta; przy kodzie `pnpm lint && pnpm typecheck && pnpm test` i e2e zmienionego obszaru przechodzą (podaj wynik); przy UI — zrzuty 1440 i 414 porównane ze wzorcem.
2. **Kontekst:** `git fetch`, `git log origin/develop..HEAD --oneline`, `git diff origin/develop...HEAD --stat`, `docs/STAN.md` („W toku”), sesja w `docs/zadania/prokomgaming.md`.
3. **Tytuł** — Conventional Commits po polsku, max ~70 znaków, efekt całej gałęzi (nigdy „wip”), np. `feat(g4): cennik, zgodność i strażnik marży`.
4. **Opis:** **Co** (3–7 punktów zachowania), **Dlaczego** (1–2 zdania + sesja/ADR), **Jak sprawdzić** (kroki, także na telefonie), **Checklista** (tylko faktycznie sprawdzone: testy, zrzuty 1440/414, Lighthouse, axe, telefon), **Ryzyka i uwagi** (migracje, zmienne, poza zakresem).
5. Pokaż mi tytuł i opis. **Czekaj na „ok”.**
6. Po akceptacji: opis do pliku tymczasowego poza repo, `gh pr create --base develop --head <gałąź> --title "<tytuł>" --body-file <plik>` (albo `gh pr edit`). Zweryfikuj `gh pr view` i podaj link.
7. Przypomnij: **Squash and merge** przy zielonym CI; potem `.\scripts\start.ps1`.
