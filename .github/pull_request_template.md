## Co
<!-- 3–7 punktów: co zmienia się w zachowaniu / strukturze -->
- 

## Dlaczego
<!-- 1–2 zdania + odnośnik: sesja w docs/zadania/prokomgaming.md, specyfikacja docs/strony/prokomgaming.md, ADR-G -->

## Jak sprawdzić
<!-- kroki lokalnie albo na stagingu, także na telefonie -->
1. 

## Checklista
- [ ] `pnpm lint`, `typecheck`, `test` przechodzą lokalnie, CI zielone
- [ ] zmiana schematu bazy → migracja w repo
- [ ] nowe zmienne środowiskowe w `.env.example`
- [ ] ceny tylko z `lib/pricing/`; brak kosztów, modeli wewnętrznych i producentów części poziomu w HTML/API
- [ ] zrzuty 1440 i 414 porównane ze wzorcem (sesje z UI); Lighthouse mobile ≥ 90; axe
- [ ] sprawdzone na telefonie (Android + iPhone) — sesje z UI
- [ ] `docs/STAN.md` zaktualizowany (i ADR, jeśli zapadła decyzja)

## Ryzyka i uwagi
<!-- migracje, rzeczy celowo poza zakresem, co sprawdzić po wdrożeniu -->
