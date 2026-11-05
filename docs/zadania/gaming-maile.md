# Maile PRO-KOM Gaming w marce — zadanie dla Claude Code · sesja GM

Wzorzec: `docs/design/maile/MaileGaming.dc.html` (płótno https://claude.ai/artifact/7HKNezL1nNmgeZPJum8rQG, plansza „09 · Maile Gaming”). Wspólne zasady maili PRO-KOM są w `prokom-web` (`docs/design/wspolne/MAILE.md`, ADR-023). Gaming przejmuje z nich **zasady**, a wygląd ma własny, zgodny z marką Gaming.

## Stan dziś
Teksty maili są już gotowe i zostają bez zmian. Brakuje im wyglądu marki: dziś HTML to tylko `textToHtml` (akapity).
- Potwierdzenie z G12 (`lib/inquiry/emails.ts` → `confirmationEmail`): tylko tekst, czas odpowiedzi z ustawień, „Co będzie dalej” zależne od rodzaju zapytania.
- Odpowiedź z panelu z P3 (`lib/inquiry/replyMail.ts` → `buildReplyMail`): tekst i prosty HTML, nagłówki wątku `Message-ID` / `In-Reply-To` / `References`.
- Mail etapu z P5 (`lib/orderMail.ts` → `buildStageMail`): szablon `stage` z `{podpis}`, prosty HTML.

## Cel
Jeden szablon marki Gaming (`src/lib/mail/layout.ts`), który obejmuje trzy maile do klienta: potwierdzenie, odpowiedź z panelu i etap zamówienia. Wygląd zgodny z planszą 09.
- **Nagłówek:** ciemny (`#080C0B`), znak „PRO-KOM GAMING” jako PNG, złoty pasek 3 px na 38% szerokości.
- **Treść:** jasna (`#FFFFFF`, tekst `#121613`).
- **Stopka:** tło `#F4F4F1`, w niej firma, adres, NIP i polityka prywatności.

Maile wewnętrzne zostają tekstowe: powiadomienie o zapytaniu, alarmy, raport tygodniowy.

## Zasady (te same co linie PRO-KOM)
1. **Każdy mail ma `text` i `html`.** Tekst bez zmian względem dziś (dochodzi tylko stopka z danymi firmy).
2. **Złoto `#F2C230` wyłącznie jako tło** pasków, przycisków i numerów kroków, zawsze z ciemnym tekstem `#080C0B`. Nigdy jako tekst na białym. „Złoty” tekst na jasnym tle ma kolor `#8A6A00` (kontrast AA).
3. **Ciemny nagłówek, jasna treść:** cały mail na czarno po odwróceniu kolorów w Gmailu na iPhonie robi się szary i nieczytelny.
4. **W potwierdzeniu tylko wartości z list i z bazy:** zestaw, konfiguracja, egzemplarz, kwota bonu. Bez imienia, wiadomości, dedykacji i odbiorcy bonu. Tak jest już dziś i tak zostaje.
5. **Cena i termin tylko z panelu.** Mail nie wymyśla liczb. Czas odpowiedzi pokazujemy tylko wtedy, gdy jest w ustawieniach. Bez promocji i newslettera.
6. **Escapowanie** wszystkiego, co trafia do HTML (`escapeHtml` z `replyMail.ts` przenieść do `lib/mail/html.ts`).
7. **Logo:** `public/mail/logo-gaming@2x.png` wygenerowany z komponentu `Logo` strony (Archivo 118/800, biały „PRO–KOM”, złoty „GAMING”) na tle `#080C0B`, w rozmiarze 2× (np. 400×80), wyświetlany w 200×40, z `alt="PRO-KOM Gaming"`. Dołączany inline jako `cid:logo` (jak ADR-023 pkt 3 w prokom-web). Opcjonalna zmienna `MAIL_LOGO_BASE_URL` przełącza na adres URL. Skrypt generujący logo: `scripts/mail-logo.ts` (Playwright, który jest już w repo).
8. **Wątki bez zmian:** `Message-ID`, `In-Reply-To` i `References` dokładnie jak w P3. Podpis w odpowiedzi występuje dokładnie raz.
9. **Limit potwierdzeń:** 3 na adres na dobę (HMAC adresu, w pamięci), tak jak w prokom-web. Jeśli G12 ma już taki limit, zostaje.

## Treść maili (plansza 09)
- **A · Potwierdzenie:**
  - H1 „Mamy Twoje zapytanie.”, lead z obecnego tekstu (z czasem odpowiedzi albo bez niego),
  - karta zestawu: ciemny pasek z nazwą zestawu i „Zestaw z oferty / Twoja konfiguracja / Zarezerwowany egzemplarz”, pod nim wiersze konfiguracji (publiczne nazwy, `computerLines(…, false)`) i cena z dnia,
  - „Co dalej” z `nextSteps(type)` (numer kroku 1 na złotym tle, pozostałe na `#F1F1EE`),
  - ramka „Chcesz coś zmienić? Odpowiedz na tego maila.” z przyciskiem „Zadzwoń {telefon}” (telefon z `site-settings`),
  - stopka.
  - Temat bez zmian, chyba że plansza mówi inaczej: `Mamy Twoje zapytanie {nr} · {zestaw}`. Do decyzji w PR.
- **B · Odpowiedź z panelu:** nagłówek „Odpowiedź do {nr}”, treść szablonu jako akapity (`textToHtml` w layoucie), podpis z `mail-settings.signature` w osobnym bloku nad stopką. Jeśli treść zawiera ofertę (szablon „oferta”), bez dodatkowych elementów: HTML nie dopisuje ceny, cena jest tylko w tekście szablonu.
- **C · Etap zamówienia:**
  - „Etap {n} z 7” (`#8A6A00`), H1 z etapu, treść szablonu `stage`,
  - pasek 7 etapów: ukończone ✓ na złotym tle, bieżący z ramką, przyszłe szare, etykiety z `stageLabel`,
  - wiersze „Zestaw”, „Zamówienie”,
  - stopka „Mail o postępie zamówienia — wysyłamy go przy każdej zmianie etapu.”.

## Prompt
```
/zadanie GM — maile Gaming w marce (potwierdzenie, odpowiedź z panelu, etap)
Gałąź feat/gm-maile od develop (po G16 albo równolegle — nie dotyka plików wdrożenia).
Przeczytaj: docs/zadania/gaming-maile.md (całość), plansza docs/design/maile/MaileGaming.dc.html, lib/inquiry/emails.ts (confirmationEmail, nextSteps), lib/inquiry/replyMail.ts, lib/orderMail.ts, miejsca wysyłki (submit.ts, thread.server.ts, admin/orders/actions.ts), ADR-G008.
1. src/lib/mail/html.ts: escapeHtml (przeniesione), layout({ preheader, title, body, footer }) — 600 px, tabele, style inline, color-scheme light; button(gold), card(), steps(), stageBar(). Bez nowych zależności.
2. scripts/mail-logo.ts + public/mail/logo-gaming@2x.png (komponent Logo, tło #080C0B); src/lib/mail/logo.ts — cid:logo, cache, MAIL_LOGO_BASE_URL opcjonalnie (env + .env.example).
3. confirmationEmail → html wg zadania §A (tekst bez zmian + stopka). buildReplyMail → html w layoucie (§B), podpis raz. buildStageMail → html wg §C. Typy maili: html + attachments; sprawdź, że payload.sendEmail (adapter nodemailer) przekazuje attachments i nagłówki wątku.
4. Stopka z danymi firmy z site-settings/ustawień (PRO-KOM Tadeusz Wójciak · NIP 7352511447 · adres — bez literałów w kodzie, jeśli są w ustawieniach; jeśli nie ma pól — jedna stała w lib/company.ts z testem).
5. Limit potwierdzeń 3/adres/dobę (HMAC, w pamięci), jeśli jeszcze nie ma.
6. Podgląd: /admin/maile (tylko rola admin) albo /_maile poza produkcją — 3 maile na przykładowych danych, przełącznik HTML/tekst.
7. Testy: escapowanie, brak imienia/wiadomości/dedykacji w potwierdzeniu, cid:logo, rozmiar HTML < 30 KB, nagłówki wątku bez zmian, podpis raz, stageBar dla każdego z 7 etapów, kontrast: brak #F2C230 jako color tekstu na jasnym tle (test na stringu stylów).
8. Ręcznie: Mailpit — zrzuty 600/390 px vs plansza 09, różnice w PR; checklista programów pocztowych (Gmail web/Android/iOS ciemny, Outlook Windows, Outlook.com, Apple Mail iOS) do odhaczenia po stagingu.
Nie zmieniaj: treści szablonów w bazie, logiki wątków, statusów i SLA, maili wewnętrznych.
DoD: lint, typecheck, testy, build, CI; /przeglad; STAN; /pr.
```

Szacunek: **0,75 wieczoru**. Miejsce w kolejce: po PR-ach G16, przed startem 20.11. Jeśli zabraknie czasu, maile działają dziś jako tekst, a GM wchodzi zaraz po starcie, bez wpływu na resztę.
