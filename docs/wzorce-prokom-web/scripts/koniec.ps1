# prokom-web - koniec pracy (firma lub dom)
# Uzycie:  .\scripts\koniec.ps1 "krotko: co zostalo w toku"
# Najpierw w Claude Code: /koniec-sesji (aktualizuje docs/STAN.md).
# Robi commit 'wip:' na galezi zadania i wypycha go na GitHub. Na main/develop nic nie commituje.
# Opis: docs/sposob-pracy.md

param([string]$Opis = "")

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host ""
Write-Host "=== prokom-web: KONIEC PRACY ===" -ForegroundColor Cyan

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
$dirty = git status --porcelain

if ($branch -eq 'main' -or $branch -eq 'develop') {
    if ($dirty) {
        Write-Warning "Masz zmiany na '$branch' - tu nie commitujemy (tylko przez PR)."
        git status --short
        Write-Host "Przenies je na galaz zadania:  git switch -c feat/<krotki-opis>   i uruchom skrypt ponownie." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Brak zmian na '$branch'." -ForegroundColor Green
} else {
    if ($dirty) {
        Write-Host "Zmiany do zapisania:" -ForegroundColor Yellow
        git status --short
        if (-not $Opis) { $Opis = Read-Host "Krotko: co zostalo w toku" }
        if (-not $Opis) { $Opis = "praca w toku" }
        git add -A
        git commit -m "wip: $Opis" --quiet
        if ($LASTEXITCODE -ne 0) { Write-Warning "Commit nie powiodl sie - sprawdz komunikat wyzej."; exit 1 }
    }
    git push -u origin $branch --quiet
    if ($LASTEXITCODE -ne 0) { Write-Warning "Push nie powiodl sie (internet / logowanie / rozjechana galaz). NIE zamykaj komputera bez wypchniecia - zapytaj w czacie."; exit 1 }
    Write-Host "Wypchnieto galaz '$branch'." -ForegroundColor Green
}

# Kontrola: czy jakakolwiek galaz ma niewypchniete commity
$ahead = git log --branches --not --remotes --oneline
if ($ahead) {
    Write-Warning "Niewypchniete commity na innych galeziach:"
    $ahead
    Write-Host "Wypchnij je:  git switch <galaz>; git push" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Wszystko jest na GitHubie. Nastepnym razem zacznij od: .\scripts\start.ps1" -ForegroundColor Green
}
