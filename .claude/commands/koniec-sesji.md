---
description: Zamknięcie sesji — aktualizacja docs/STAN.md i podsumowanie
---

Kończymy sesję.

1. Zaktualizuj `docs/STAN.md`: zrobione (z datą) do „Zrobione”, „Następne kroki”, „Pomysły na później”, „Otwarte pytania”. W „W toku” zapisz:
   - `Gałąź:` nazwa gałęzi,
   - `Zrobione w tej sesji:` 1–3 punkty,
   - `Niedokończone:` co jest w połowie,
   - `Następny krok:` jedno konkretne zdanie — następna sesja nie zna historii tej.
2. Jeśli zapadła decyzja architektoniczna — zaproponuj ADR-G w `docs/decyzje/` (szablon ADR-000).
3. Jeśli zmieniły się komendy, zmienne środowiskowe albo struktura — zaktualizuj `CLAUDE.md` i `.env.example`.
4. Krótkie podsumowanie (3–6 linijek): co zrobione, co dalej, czego potrzebuję — nadaje się na komentarz w Asanie. Jeśli to sesja przed kontrolą 8.11 albo 13.11 — napisz, czy jesteśmy w planie (`docs/zadania/prokomgaming.md` §1).
5. Przypomnij o końcu pracy: `.\scripts\koniec.ps1 "<krótki opis>"` — podaj gotowy opis. Jeśli zadanie skończone — zaproponuj commit i PR do `develop`.
