---
description: Samodzielny przegląd zmian przed PR (jak wymagający senior)
---

Przegląd robi **subagent `recenzent`** (`.claude/agents/recenzent.md`) w czystym kontekście — autor zmian nie recenzuje sam siebie.

1. Uruchom subagenta `recenzent`. Przekaż mu tylko: nazwę gałęzi i którą sesję realizuje (bez streszczania zmian i bez uzasadnień autora). Jeśli gałąź `develop` jeszcze nie istnieje — niech porównuje z `main`.
2. Przedstaw mi jego wynik bez łagodzenia: werdykt, problemy od najpoważniejszych (plik:linia, co nie tak, propozycja poprawki), wynik `pnpm lint && pnpm typecheck && pnpm test`.
3. Do każdego problemu dopisz jedno zdanie: zgadzasz się czy nie i dlaczego.

Nie poprawiaj sam bez mojej zgody, poza oczywistymi literówkami.
