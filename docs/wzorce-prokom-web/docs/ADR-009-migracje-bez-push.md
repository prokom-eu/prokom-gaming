# ADR-009: Schemat bazy tylko przez migracje — `push` wyłączony także lokalnie

- **Status:** przyjęta (15.10.2026)
- **Data:** 2026-10-15
- **Decyduje:** Krystian (technika)

## Kontekst
Payload z `@payloadcms/db-postgres` domyślnie w trybie dev **sam dopasowuje schemat bazy** do konfiguracji (`push`), bez pliku migracji. Plan fundamentu zakładał „`push` tylko lokalnie”.

Krystian pracuje na **dwóch komputerach**, a jedynym kanałem synchronizacji jest GitHub (`docs/sposob-pracy.md`). Zmiana schematu zrobiona przez `push` żyje tylko w lokalnej bazie — drugi komputer, CI i serwer jej nie dostaną, dopóki ktoś nie pamięta o `migrate:create`. Payload ostrzega też przed mieszaniem `push` i migracji na jednej bazie (rozjazd stanu, pytania o utratę danych przy `migrate`).

## Opcje
| Opcja | Zalety | Wady | Koszt |
|---|---|---|---|
| A. `push` lokalnie, migracje na serwerach | Szybkie prototypowanie pól | Łatwo zapomnieć o migracji; lokalna baza ≠ to, co w repo; konflikty `push`/`migrate` | 0 zł |
| B. `push: false` wszędzie, zawsze `migrate:create` + `migrate` | Jedno źródło prawdy (migracje w repo); oba komputery, CI i serwer odtwarzają tę samą bazę; błędy migracji widać od razu lokalnie | Każda zmiana pola = dodatkowa komenda i plik migracji | 0 zł |

## Decyzja
Wybieramy **B**: `push: false` w konfiguracji adaptera we wszystkich środowiskach. Schemat zmienia się wyłącznie przez `pnpm payload migrate:create` (plik w repo) i `pnpm payload migrate`.

## Konsekwencje
- S2 ustawia `push: false` i pierwszą migrację; dokładne API sprawdzić w dokumentacji zainstalowanej wersji (ADR-008).
- Przy prototypowaniu pól: kilka małych migracji jest w porządku; przed PR można je scalić w jedną (lokalnie odtworzyć bazę od zera: `docker compose ... down -v`, `up -d`, `migrate`, `seed`).
- e2e w CI może przejść z `pnpm dev` na zbudowaną aplikację z `migrate` (`docs/STAN.md` → „Pomysły na później”).
- Zastępuje zapis „`push` schematu tylko lokalnie” w `CLAUDE.md` i w S2 (zaktualizowane).
