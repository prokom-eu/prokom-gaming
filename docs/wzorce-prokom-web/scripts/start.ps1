# prokom-web - start pracy (firma lub dom)
# Uzycie:  .\scripts\start.ps1
# Pobiera zmiany z GitHuba, sprawdza stan repo, uruchamia lokalna baze i zaleznosci.
# Opis: docs/sposob-pracy.md

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host ""
Write-Host "=== prokom-web: START PRACY ===" -ForegroundColor Cyan

# 1. Niezacommitowane zmiany - zatrzymaj, zeby niczego nie nadpisac
$dirty = git status --porcelain
if ($dirty) {
    Write-Warning "Masz niezacommitowane zmiany:"
    git status --short
    Write-Warning "Najpierw je zapisz: .\scripts\koniec.ps1 `"opis`"  (albo git stash). Przerywam."
    exit 1
}

# 2. Pobierz wszystko z GitHuba
git fetch --prune --quiet
if ($LASTEXITCODE -ne 0) { Write-Warning "Nie udalo sie pobrac zmian z GitHuba (internet / logowanie?)."; exit 1 }

$branch = (git rev-parse --abbrev-ref HEAD).Trim()

# 3. Zaktualizuj develop - bez przelaczania: w drugim folderze (git worktree) develop moze byc
#    otwarty, a git nie pozwala miec tej samej galezi w dwoch folderach naraz.
if ($branch -eq 'develop') {
    git pull --ff-only --quiet
    if ($LASTEXITCODE -ne 0) { Write-Warning "develop nie da sie zaktualizowac bez scalania - sprawdz git status i zapytaj w czacie."; exit 1 }
} else {
    git fetch origin develop:develop --quiet 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Warning "Lokalny develop nie zostal zaktualizowany (otwarty w drugim folderze albo rozjechany). Nowe galezie zakladaj od origin/develop." }
}

# 4. Zaktualizuj galaz zadania
if ($branch -ne 'develop') {
    git rev-parse --verify --quiet "refs/remotes/origin/$branch" *> $null
    $hasRemote = ($LASTEXITCODE -eq 0)
    if ($hasRemote) {
        git pull --ff-only --quiet
        if ($LASTEXITCODE -ne 0) { Write-Warning "Galaz '$branch' rozjechala sie z GitHubem - nie uzywaj --force, zapytaj w czacie."; exit 1 }
    } elseif ($branch -ne 'main') {
        Write-Host "Galezi '$branch' nie ma na GitHubie: scalona (usun ja: git branch -D $branch) albo jeszcze niewypchnieta." -ForegroundColor Yellow
        Write-Host "Nowe zadanie:  git switch -c <typ>/<opis> origin/develop" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Galaz: $branch" -ForegroundColor Green
git log --oneline -3

# 5. Docker (lokalna baza + Mailpit)
docker info *> $null
$dockerOk = ($LASTEXITCODE -eq 0)
if (-not $dockerOk) {
    Write-Warning "Docker Desktop nie dziala - uruchom go i odpal skrypt jeszcze raz."
} elseif (Test-Path "docker/compose.dev.yml") {
    # Jeden kontener dla obu folderow (stala nazwa projektu w compose.dev.yml).
    docker compose -f docker/compose.dev.yml up -d --wait
    # Kazdy folder ma swoja baze (DATABASE_URL w .env); brakujaca zakladamy raz.
    $dbLine = if (Test-Path ".env") { Select-String -Path ".env" -Pattern '^DATABASE_URL=.*@127\.0\.0\.1:54320/([A-Za-z0-9_]+)' | Select-Object -First 1 }
    if ($dbLine) {
        $db = $dbLine.Matches[0].Groups[1].Value
        $exists = docker compose -f docker/compose.dev.yml exec -T postgres psql -U prokom -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$db'"
        if ("$exists".Trim() -ne '1') {
            docker compose -f docker/compose.dev.yml exec -T postgres createdb -U prokom $db
            Write-Host "Zalozono baze '$db' - po migracjach uruchom: pnpm seed" -ForegroundColor Yellow
        }
    }
}

# 6. Node z .nvmrc (fnm), pnpm, zaleznosci i migracje (gdy projekt juz ma kod - od sesji S1)
if ((Test-Path ".nvmrc") -and (Get-Command fnm -ErrorAction SilentlyContinue)) {
    fnm use --install-if-missing --silent-if-unchanged
}
if ((Test-Path "package.json") -and -not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    corepack enable
}
if (Test-Path "package.json") {
    pnpm install --frozen-lockfile
    if ((Test-Path ".env") -and $dockerOk) {
        pnpm payload migrate
    } elseif (-not (Test-Path ".env")) {
        Write-Warning "Brak pliku .env - skopiuj .env.example do .env i uzupelnij wartosci z menedzera hasel."
    }
}

# 7. Co dalej
Write-Host ""
Write-Host "Gotowe. Nastepny krok wg docs/STAN.md:" -ForegroundColor Cyan
$stan = Get-Content "docs/STAN.md" -Encoding UTF8
$start = ($stan | Select-String -Pattern '^## W toku' | Select-Object -First 1).LineNumber
if ($start) {
    foreach ($line in ($stan | Select-Object -Skip $start)) {
        if ($line -match '^## ') { break }
        Write-Host $line
    }
}
Write-Host ""
Write-Host "Claude Code: nowa sesja -> 'Przeczytaj docs/STAN.md, kontynuujemy' albo /zadanie S<n>" -ForegroundColor Cyan
