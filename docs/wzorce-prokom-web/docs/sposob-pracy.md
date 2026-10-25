# Sposób pracy — jeden komputer

Krystian pracuje nad projektem na jednym komputerze (od 22.10.2026; wcześniej firma + dom). GitHub jest kopią kodu i jedyną drogą na serwer, dlatego praca w toku trafia tam na koniec dnia — awaria dysku nie zabiera więcej niż jednego dnia pracy.

## Zasada główna
Każdy rodzaj rzeczy ma **jedno** miejsce i **jeden** kanał synchronizacji. Niczego nie kopiujemy ręcznie (pendrive, mail do siebie).

| Co | Gdzie żyje | Jak się synchronizuje |
|---|---|---|
| Czaty, projekt Claude „PRO-KOM Cyfryzacja”, `00-STAN-PROJEKTU`, dokument FINAL, pamięć Claude | claude.ai (to samo konto) | automatycznie |
| Zadania, terminy, akceptacje szefa | Asana (firmowa) | automatycznie |
| Kod i dokumentacja techniczna (`CLAUDE.md`, `docs/`, ADR, `STAN.md`) | GitHub `prokom-eu/prokom-web` | **git**: `pull` na start, `push` na koniec |
| Pliki nie-kodowe: `marka`, `materialy`, `notatki` | dysk w chmurze | automatycznie (aplikacja dysku) |
| Hasła, wartości `.env`, kody odzyskiwania 2FA | menedżer haseł | automatycznie |
| Lokalna baza i media testowe | Docker na komputerze | **nie kopiujemy** — odtwarza je `pnpm seed` |
| Dane produkcyjne (zapytania klientów) | tylko serwer | nigdy nie kopiujemy na komputery (RODO) |

**Nowa sesja Claude Code nie zna historii poprzedniej.** Ciągłość niesie `docs/STAN.md` — `/koniec-sesji` zapisuje tam dokładny następny krok, a następna sesja zaczyna od jego przeczytania.

## Układ folderów
```
D:\PRO-KOM\            (albo C:\PRO-KOM\, jeśli nie ma dysku D:)
├─ repos\              ← TYLKO git. NIGDY w folderze synchronizowanym chmurą.
│  └─ prokom-web\
├─ marka\              ┐
├─ materialy\          ├─ synchronizowane dyskiem w chmurze
└─ notatki\            ┘
```
**Dlaczego repo nie w chmurze:** OneDrive / Google Drive synchronizują pliki w trakcie pracy gita i `pnpm` — psują `.git`, tworzą konflikty i mielą tysiące plików z `node_modules`. Repo synchronizuje wyłącznie git.

## Rytm dnia

### Start pracy
```powershell
cd D:\PRO-KOM\repos\prokom-web
.\scripts\start.ps1
```
Skrypt: pobiera zmiany z GitHuba (`develop` i bieżącą gałąź), ostrzega o niezacommitowanych zmianach, uruchamia lokalną bazę w Dockerze, instaluje zależności i uruchamia migracje, jeśli doszły nowe (np. po scaleniu PR).
Potem Claude Code: nowa sesja, „przeczytaj docs/STAN.md, kontynuujemy”, albo `/zadanie S<n>` przy nowej sesji fundamentu.

### Koniec pracy — ZAWSZE, także w połowie zadania
1. W Claude Code: `/koniec-sesji` (aktualizuje `docs/STAN.md` z następnym krokiem).
2. W PowerShell:
```powershell
.\scripts\koniec.ps1 "krótko: co zostało w toku"
```
Skrypt: robi commit `wip: …` na gałęzi zadania i wypycha go na GitHub; sprawdza, czy na żadnej gałęzi nie zostały niewypchnięte commity. Na `main` / `develop` nic nie commituje (tam tylko przez PR).

### Zasady
1. **Na koniec dnia praca jest na GitHubie** (kopia na wypadek awarii dysku). Commity `wip:` na gałęzi zadania są OK — przy squash merge sklejają się w jeden.
2. **Jedno zadanie = jedna gałąź = jeden PR.**
3. Zadanie skończone → w Claude Code `/przeglad`, potem `/pr` (gotowy tytuł i opis, PR zakładany przez `gh`) → zielone CI → **Squash and merge** → `.\scripts\start.ps1` (pobiera nowy `develop`) → następne zadanie: `git switch -c <typ>/<opis> origin/develop`. Tytuł PR zostaje w historii `develop` — nigdy „wip”.
4. Konflikt albo „coś się rozjechało” → nie kombinuję z `--force`; `git status`, zrzut ekranu i pytanie w czacie.

## Dwie strony równolegle (git worktree)
Gdy dwie strony powstają w tym samym czasie, każda ma **własny folder** z własną gałęzią, portem i bazą. Repo jest jedno (wspólna historia, jeden `git fetch`), ale sesje Claude Code nie przełączają sobie nawzajem gałęzi ani plików.

| Folder (obok siebie w `repos\`) | Strona | `PORT` | Baza w `DATABASE_URL` |
|---|---|---|---|
| `prokom-web-biznes` (worktree) | prokombiznes.pl | 3000 | `prokom_web` |
| `prokom-web` (główny) | prokomsoftware.pl | 3001 | `prokom_web_software` |

**Dlaczego osobna baza:** każda gałąź dodaje własne migracje. Na wspólnej bazie Payload trafiłby na migrację, której jego gałąź nie zna, albo na tabele niezgodne z kodem. Kontener PostgreSQL jest jeden (stała nazwa projektu w `docker/compose.dev.yml`), baz w nim dwie.
**Dlaczego osobny port:** `next dev` bez ustalonego portu przy zajętym 3000 sam przeskakuje na 3001, a e2e z `reuseExistingServer` testowałyby wtedy serwer drugiej strony. `pnpm dev` i Playwright biorą `PORT` z `.env`, więc każdy folder ma swój port na stałe.

### Założenie folderu (jednorazowo)
1. W głównym folderze: `git worktree add ..\prokom-web-biznes -b <typ>/<opis> origin/develop`, potem `git -C ..\prokom-web-biznes branch --unset-upstream` (żeby `git push` nie celował w `develop`).
2. `.env` w nowym folderze: kopia `.env` z głównego. W każdym folderze `PORT` i `DATABASE_URL` wg tabeli (wartości w menedżerze haseł).
3. Folder przejmujący istniejącą bazę dostaje też jej pliki: `Copy-Item ..\prokom-web\media . -Recurse` (`media\` nie jest w gicie, a baza wskazuje na te pliki).
4. `.\scripts\start.ps1` w każdym folderze: zależności (`pnpm install`, pliki dzielone przez magazyn pnpm), brakującą bazę zakłada sam, migracje. W folderze z nową bazą potem `pnpm seed`.
5. Claude Code: osobna sesja w każdym folderze. Podgląd w aplikacji: konfiguracja `dev` (3000) albo `dev-3001` z `.claude/launch.json`.

### Zasady
1. **Jedna strona = jeden folder.** W folderze nie przełączaj się na gałąź drugiej strony.
2. **`develop` nie jest otwarty w żadnym folderze** — git nie pozwala na tę samą gałąź w dwóch folderach. Nowe gałęzie zakładasz od `origin/develop`; `start.ps1` aktualizuje lokalny `develop` bez przełączania.
3. **`docs/STAN.md`:** każda sesja edytuje tylko podsekcję swojej strony („W toku”, „Zrobione”). Konflikt w innych sekcjach (np. „Pomysły na później”) → zostaw obie wersje.
4. **Wspólne pliki** (`CLAUDE.md`, ADR, `tokens.css`, `payload.config.ts`, kolekcje) → kto scala drugi, robi `git merge origin/develop` na swojej gałęzi, rozwiązuje konflikty i przepuszcza testy.
5. **Migracje:** po scaleniu cudzej migracji `git merge origin/develop` i `pnpm payload migrate`, zanim utworzysz własną — migawka `.json` musi znać schemat drugiej gałęzi. Gdy obie gałęzie mają już migracje, ta scalana druga tworzy swoją na nowo.
6. **Panel:** ciasteczko logowania nie rozróżnia portów — zalogowanie w `panel.localhost:3001` wylogowuje z `:3000`.
7. **Koniec dnia:** `.\scripts\koniec.ps1` w każdym folderze z pracą w toku.
8. Folder niepotrzebny (praca znów nad jedną stroną): `git worktree remove ..\prokom-web-biznes`.

### Zmiana schematu bazy (ADR-009)
`push` jest wyłączony (`push: false` w `src/payload.config.ts`) — Payload sam nie zmienia tabel. Schemat zmienia się tylko przez migracje w `src/migrations/`:
1. Zmieniam kolekcję/pole → `pnpm payload migrate:create <krotka-nazwa>` (powstaje plik `.ts` + migawka `.json`).
2. `pnpm payload migrate` → sprawdzam w panelu → `pnpm generate:types` → commit migracji razem ze zmianą kolekcji.
3. Po `pull` `scripts\start.ps1` uruchamia `migrate`. CI migruje pustą bazę przed buildem; staging i produkcja migrują przy starcie (`prodMigrations`).
4. Dane testowe: `pnpm seed` (admin z `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; na produkcji seed odmawia działania).

## Konfiguracja komputera (jednorazowo, ok. 15 min — np. po reinstalacji albo wymianie sprzętu)
Wszystko robi `scripts/setup-komputera.ps1` (można uruchamiać wielokrotnie — pomija to, co już jest).

1. **Zwykłe** okno PowerShell (NIE „Administrator”). Na nowym komputerze, gdzie repo jeszcze nie ma: pobierz `scripts/setup-komputera.ps1` z GitHuba (repo → plik → „Download raw file”) i uruchom:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\setup-komputera.ps1
   ```
   Gdy repo już jest: `.\scripts\setup-komputera.ps1`.
2. Skrypt:
   - instaluje (winget): Git, PowerShell 7, GitHub CLI, fnm (wersje Node), Starship (prompt z gałęzią), Docker Desktop;
   - Node LTS przez fnm + pnpm (corepack); dokładną wersję dla projektu ustala `.nvmrc`, a fnm przełącza ją sam po wejściu do repo;
   - dopisuje do profilu PowerShell 7: fnm + Starship;
   - ustawia globalnie gita: `pull.ff only`, `fetch.prune`, `push.autoSetupRemote`, `rerere`, `core.autocrlf false`, czytelniejsze konflikty (`merge.conflictstyle zdiff3`) i diffy (`diff.algorithm histogram`, `diff.colorMoved`), `rebase.autoStash`, gałęzie od najnowszych (`branch.sort`), diff w edytorze opisu commita (`commit.verbose`), aliasy `git lg` i `git st`, imię i e-mail;
   - loguje `gh` (HTTPS, przez przeglądarkę), klonuje repo do `D:\PRO-KOM\repos\prokom-web`, dodaje `safe.directory`;
   - **podpisywanie commitów kluczem SSH:** tworzy klucz `~/.ssh/id_ed25519_signing` (osobny dla komputera, bez hasła — służy tylko do podpisu), włącza `commit.gpgsign`, dodaje klucz na GitHub jako *Signing key* (raz poprosi w przeglądarce o zgodę `admin:ssh_signing_key`). Efekt: commity na GitHubie mają znaczek **Verified**; squash merge robi GitHub i podpisuje go sam.
3. Ręcznie (skrypt przypomina na końcu):
   - Windows Terminal → Ctrl+, → Uruchamianie → Profil domyślny: „PowerShell” (czarna ikona, nie „Windows PowerShell”); Profile → PowerShell → Katalog startowy = folder repo; „Uruchom jako Administrator” = wyłączone;
   - Docker Desktop — pierwsze uruchomienie (WSL 2);
   - Claude Code — `claude --version`, logowanie;
   - `.env` — `.env.example` → `.env`, wartości z menedżera haseł (wpis „prokom-web .env lokalny”);
   - aplikacja dysku w chmurze: synchronizuj `marka`, `materialy`, `notatki` — NIE `repos`;
   - e-mail w gicie (`git config user.email` w repo) = e-mail **zweryfikowany** na koncie GitHub — inaczej podpis nie da znaczka Verified.
4. Nowy terminal → `.\scripts\start.ps1` → `pnpm seed` (gdy projekt ma już kod).

**Do pracy nad projektem NIGDY nie używaj okna „Administrator”** — pliki utworzone jako administrator należą do innego właściciela i git zgłasza „dubious ownership”. Administrator tylko do instalowania programów (instalatory same o to poproszą).

## Nawyki (tak pracuje senior)
1. **Czytam diff przed każdym commitem:** `git diff --staged` — linia po linii. Nie commituję kodu, którego nie umiem wyjaśnić. Claude Code pisze szybko, odpowiedzialność za kod jest moja.
2. **Jedna rzecz naraz:** jedna gałąź w toku. Pomysł w trakcie → `docs/STAN.md` → „Pomysły na później”, powrót do zadania.
3. **Świeży kontekst:** w Claude Code `/clear` (albo nowa sesja) między zadaniami; każde zadanie zaczyna się od planu (`/zadanie`) w trybie planowania.
4. **Test najpierw tam, gdzie błąd kosztuje pieniądze** (izolacja tenantów, formularz, retencja, seed). Gdzie indziej testów nie dopisujemy na siłę.
5. **Małe PR-y:** do ~400 linii diffu; większe dzielę. Mały PR łatwiej sprawdzić i łatwiej cofnąć.
6. **Kopia działa tylko wtedy, gdy była odtworzona:** próbne odtworzenie raz w miesiącu (`docs/wdrozenia.md`).
7. **Narzędzia zamrożone do 26.10:** nowe pomysły na narzędzia i automaty → „Pomysły na później”. Najpierw dowozimy strony.

## Bezpieczeństwo
- Konto GitHub i menedżer haseł z 2FA. **Kody odzyskiwania 2FA** (GitHub, rejestrator domen, Seohost, menedżer haseł) zapisane w menedżerze haseł — zgubiony telefon nie może oznaczać utraty konta.
- Domeny i konta dostawców (rejestrator, Seohost) na dane i e-mail firmy, nie prywatne — `docs/dns.md`.
- Komputer: szyfrowanie dysku (BitLocker / szyfrowanie urządzenia), hasło do konta Windows, blokada ekranu.
- `.env` nigdy w gicie (pilnuje `.gitignore`, gitleaks w haku przed commitem i w CI); wartości przenoszę tylko przez menedżer haseł.
- Na komputery nie ściągamy kopii baz produkcyjnych ani danych klientów — praca na `pnpm seed` i stagingu.

## Gdy coś nie gra
| Objaw | Co zrobić |
|---|---|
| `dubious ownership` przy komendach git | okno było „Administrator” albo repo założone jako admin → zwykły terminal + `git config --global --add safe.directory <ścieżka-repo-z-ukośnikami-/>` |
| krzaki zamiast polskich znaków w commitach | używasz starego „Windows PowerShell” 5.1 → przełącz na PowerShell 7 |
| w terminalu pojawia się `>>` | wkleiłeś kilka linii naraz — wklejaj po jednej komendzie |
| `start.ps1`: „masz niezacommitowane zmiany” | sprawdź `git status`; jeśli to Twoja praca — `.\scripts\koniec.ps1 "opis"` i ponownie start |
| `git pull` odmawia (rozjechana historia) | nie używaj `--force`; `git status` + `git log --oneline -5` → pytanie w czacie |
| Brakuje danych w panelu (np. po odtworzeniu bazy) | normalne — lokalnej bazy nie kopiujemy; `pnpm seed` |
| Błąd migracji po `pull` | `pnpm payload migrate`; jeśli dalej błąd — lokalnie można odtworzyć bazę od zera (`docker compose ... down -v`, `up -d`, `migrate`, `seed`) |
| Commit bez znaczka **Verified** na GitHubie | `git config user.email` ≠ e-mail zweryfikowany na GitHubie albo klucz nie dodany jako *Signing key* (GitHub → Settings → SSH and GPG keys) → uruchom ponownie `.\scripts\setup-komputera.ps1` |
| `error: ... ssh-keygen` / `failed to write commit object` przy commicie | brak klienta OpenSSH: Ustawienia → System → Funkcje opcjonalne → „Klient OpenSSH” → zainstaluj; nie wyłączaj podpisywania |
| Commit zablokowany: „gitleaks is not installed” albo `pnpm: command not found` (np. commit z VS Code) | hak nie widzi programów w PATH: zainstaluj gitleaks (`winget install --id Gitleaks.Gitleaks`), zamknij i otwórz ponownie terminal/VS Code; w razie wątpliwości commituj z terminala PowerShell 7 |
| Commit zablokowany: „leaks found” | gitleaks znalazł sekret w zmianach (plik i linia w komunikacie) — usuń go z pliku, przenieś do `.env`; nie omijaj haka (`--no-verify`) |
| Commit zablokowany przez Prettier/ESLint | `pnpm format` (i poprawki ESLint), przejrzyj zmiany, `git add` i commit ponownie |
