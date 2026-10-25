# Przekazanie: jak założyć repo prokom-gaming i zacząć (25.10.2026)

Ten folder to **pierwszy commit nowego repo**. Kod nie istnieje — powstaje w sesjach G1–G16 (`docs/zadania/prokomgaming.md`).

## 1. Repo na GitHubie (raz, ok. 10 min)
1. GitHub → organizacja `prokom-eu` → **New repository**: nazwa `prokom-gaming`, **Private**, bez README/.gitignore/licencji.
2. PowerShell 7 (zwykłe okno, nie „Administrator”). Najpierw tożsamość i podpis, potem pierwszy commit:
```powershell
cd D:\PRO-KOM\repos
Copy-Item D:\PRO-KOM\notatki\do-repo\prokom-gaming .\prokom-gaming -Recurse
cd prokom-gaming
git init -b main
git config user.email "<e-mail zweryfikowany na GitHubie — ten sam co w prokom-web>"
git config commit.gpgsign true   # klucz podpisu SSH masz globalnie z setup-komputera.ps1
git add .
git commit -m "docs: pakiet startowy PRO-KOM Gaming (spec, ADR-G001–G005, plan G0–G16, wzorzec v36, seed)"
git remote add origin https://github.com/prokom-eu/prokom-gaming.git
git push -u origin main
git switch -c develop
git push -u origin develop
```
3. GitHub → Settings → **Branches**: ochrona `main` i `develop` (PR wymagany, bez force push). Settings → General → Pull Requests: tylko **Squash merging**. Ustaw `develop` jako domyślną gałąź.
4. Sprawdź na GitHubie, że pierwszy commit ma znaczek **Verified**.

## 2. Pierwsza sesja Claude Code — G0 (dokumenty, bez kodu)
```powershell
cd D:\PRO-KOM\repos\prokom-gaming
git switch -c docs/g0-decyzje
claude
```
W Claude Code (tryb planowania):
```
/zadanie G0 — dokumenty i decyzje
```
Dalej wg `docs/zadania/prokomgaming.md` §3.3 (G0). Na koniec `/koniec-sesji` i `/pr`.

## 3. Potem
G1 (szkielet) → G2 → … Każda sesja: `/zadanie G<n>` → plan → „ok” → kod → `/przeglad` → zrzuty 1440/414 → `/koniec-sesji` → `/pr` → Squash and merge → `.\scripts\start.ps1`.

## 4. Równolegle z prokom-web — zasady
- Osobne foldery, porty i bazy (`docs/sposob-pracy.md`): Gaming 3100 / 54321 / 1026 / 8026.
- **Jedna sesja Claude Code naraz** — wieczór = jedno repo.
- Kontrole terminu: **8.11** i **13.11** (plan cięcia: `docs/zadania/prokomgaming.md` §4).

## 5. Co jest w pakiecie
| Ścieżka | Zawartość |
|---|---|
| `CLAUDE.md`, `.claude/` | zasady repo, komendy `/zadanie`, `/przeglad`, `/pr`, `/koniec-sesji`, `/wdrozenie`, recenzent, hak Prettier |
| `docs/strony/prokomgaming.md` | specyfikacja całej strony |
| `docs/decyzje/` | ADR-G001 repo i serwer · G002 cennik i konfigurator · G003 wygląd i telefon · G004 FPS · G005 zapytania, metryka, konto (do przyjęcia w G0) |
| `docs/zadania/prokomgaming.md` | sesje G0–G16, kalendarz, prompty, plan cięcia |
| `docs/design/prokomgaming/` | plansze v37, hero na 5 ekranach, zrzuty 1440 i 414 wszystkich stron, 13 stanów telefonu, 6 kroków konfiguratora, sceny i pieczęcie 16 istot, tokeny |
| `seed/prokomgaming/` | cennik, 16 poziomów (9 stopni mocy), 57 opcji (+46 zdjęć), 16 zestawów, 16 istot, 33 gry, 1 584 klatki ze źródłami, FAQ (strona, główna, karta zestawu), poradniki |
| `tests/fixtures/pricing-expected.json` | oczekiwane ceny i marże 16 zestawów, 11 scenariuszy, podsumowanie pełnego przeglądu (85 134 zgodnych, minimum marży), ceny „od” |
| `docs/wzorce-prokom-web/` | kopie konfiguracji `prokom-web` do wzorowania w G1 i G16 |
| `.env.example` | szkic zmiennych (finalnie w G1) |
