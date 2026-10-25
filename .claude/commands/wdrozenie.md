---
description: Checklista przed wdrożeniem na staging lub produkcję
argument-hint: staging | produkcja
---

Przygotowujemy wdrożenie na: **$ARGUMENTS**. Przejdź checklistę i zaraportuj każdy punkt (✅ / ❌ / ⚠️):

1. CI zielone (`lint`, `typecheck`, `test`, `build`, e2e, gitleaks).
2. Migracje: w repo? Bezpieczne na danych? Lista do uruchomienia.
3. Nowe zmienne środowiskowe: w `.env.example` i w `.env.prod` / `.env.staging` na serwerze?
4. Ceny: ostatnia publikacja przeszła strażnika marży; ceny 16 zestawów zgodne z oczekiwanymi.
5. Formularze: zapis zapytania, oba maile (powiadomienie i potwierdzenie) na stagingu; numer PKG.
6. SEO: sitemap, robots (staging = `noindex` + hasło), metadane, JSON-LD; zero placeholderów, słowa „Santander” i oferty rat w HTML (całe słowo „raty” tylko w pytaniu FAQ).
7. Telefon: dolny pasek, menu, arkusze i paski przyklejone na Androidzie i iPhonie.
8. Kopia bazy przed wdrożeniem — komenda i miejsce kopii.
9. Plan cofnięcia: poprzedni tag obrazu i komenda.
10. Nginx: szablon `prokomgaming.pl` w `prokom-web` scalony i certyfikat ważny.
11. **Produkcja:** czy zadanie „SZEF · Akceptacja PRO-KOM Gaming” w Asanie jest odhaczone? Jeśli nie — STOP.

Nie uruchamiaj wdrożenia sam. Na końcu podaj dokładne komendy, które uruchomię ja.
