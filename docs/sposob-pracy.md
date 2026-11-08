# Sposób pracy — prokom-gaming obok prokom-web

Krystian buduje dwa repo na jednym komputerze (kod tylko w domu). Pełne zasady ogólne: `wzorce-prokom-web/docs/sposob-pracy.md` — obowiązują tu tak samo (git jako kopia, `start.ps1` / `koniec.ps1`, PR + squash, podpisane commity, `.env` z menedżera haseł). Poniżej tylko to, co inne.

## Foldery i porty
| | prokom-web | prokom-gaming |
|---|---|---|
| Folder | `D:\PRO-KOM\repos\prokom-web` (+ worktree `prokom-web-biznes`) | `D:\PRO-KOM\repos\prokom-gaming` |
| Strona | 3000 / 3001 | **3100** |
| PostgreSQL (host) | 54320 | **54321** |
| Mailpit SMTP / podgląd | 1025 / 8025 | **1026 / 8026** |
| Projekt Compose | `prokom-web-dev` | **`prokom-gaming-dev`** |
| Panel | `panel.localhost:3000/admin` | `localhost:3100/admin` |
| Zadania | S, B, SW, K, F, M | **G** |

Oba projekty mogą działać naraz (różne porty i bazy), ale **jedna sesja Claude Code naraz** — wieczór = jedno repo. Ciasteczka panelu nie kolidują (inny host i ścieżka).

## Rytm
1. Start: `cd D:\PRO-KOM\repos\prokom-gaming` → `.\scripts\start.ps1` (od G1).
2. Claude Code: nowa sesja → „przeczytaj docs/STAN.md, kontynuujemy” albo `/zadanie G<n>`.
3. Koniec: `/koniec-sesji` → `.\scripts\koniec.ps1 "co w toku"`.
4. Zadanie skończone: `/przeglad` → `/pr` → zielone CI → Squash and merge → `start.ps1`.

## Szybciej (decyzja Krystiana 30.10.2026)
- **Lokalnie tylko e2e zmienionego obszaru** (`docs/jakosc.md`) — np. nowa strona: jej plik e2e i jej wiersze w `a11y.e2e.spec.ts` (`-g`). Pełne e2e puszcza CI. Szerszą regresję lokalnie tylko, gdy zmienia się kod wspólny: `lib/inquiry/` (API zapytań), powłoka (`SiteHeader`, `MenuSheet`, `SiteFooter`, layout), `lib/pricing/`, `payload.config.ts`.
- **`next dev` nie optymalizuje obrazów** (`images.unoptimized` tylko w trybie dev, `next.config.ts`) — podglądy stron ze scenami są od razu. Wydajność i Lighthouse mierzymy na `pnpm build` + `pnpm start`, nie na `next dev`.
- **`/pr` bez osobnego „ok”**, gdy sprawdzenia są zielone: wywołanie `/pr` to zgoda na push gałęzi i PR do `develop`; „ok” tylko przy decyzji do potwierdzenia. Plan w `/zadanie` dalej czeka na „ok”. Uprawnienia: `.claude/settings.json` (bez pytania: commity, push gałęzi roboczych, PR, migracje i seed lokalnie; pytanie: scalanie PR, zależności, Docker, SSH).

## Asana i 00-STAN
Zadania Gaming w projekcie „PRO-KOM Cyfryzacja” z prefiksem „G”. Po każdej ważnej decyzji — wpis w `claude/00-STAN-PROJEKTU.md` (czat) i w `docs/STAN.md` (repo).

## Dane, których nie ma w repo
Arkusze (`dane/*.xlsx`), oryginały zdjęć, notatki — w `Pulpit\prokom-gaming` i `D:\PRO-KOM\materialy`. Nowe koszty, FPS albo skład zestawów → przeliczenie w czacie → nowy seed i fixtures → PR.
