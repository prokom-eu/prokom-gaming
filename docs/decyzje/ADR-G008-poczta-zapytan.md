# ADR-G008: Odpowiedzi na zapytania z panelu — SMTP na wyjściu, IMAP na wejściu, wątek w bazie

- **Status:** przyjęta (Krystian, 30.10.2026)
- **Data:** 2026-10-30
- **Spec:** `docs/strony/prokomgaming-panel.md` §4–§5

## Kontekst
Strona obiecuje odpowiedź w godzinę (8–22). Dziś (G6/G12) zapytanie trafia do bazy i na skrzynkę (`Reply-To` klienta), a odpowiadać trzeba z programu pocztowego — bez historii przy zapytaniu, bez szablonów, bez statusu. Klient powinien dostawać zwykłe maile i móc odpisać zwykłą odpowiedzią.

## Opcje
| Opcja | Plusy | Minusy |
|---|---|---|
| **A. SMTP z panelu + IMAP do panelu (skrzynka Gaming w Seohost)** | klient pisze normalnie; historia przy zapytaniu; dalej można używać zwykłej poczty | odbiór IMAP to kolejne zadanie w tle; parsowanie maili |
| B. Tylko wysyłka z panelu, odpowiedzi w poczcie | prościej | wątek dziurawy, status ręcznie |
| C. Zewnętrzny helpdesk (np. SaaS) | gotowe | koszt miesięczny, dane klientów u dostawcy, drugie narzędzie |

## Decyzja
**Opcja A.**
1. **Wysyłka:** adapter e-mail Payload (nodemailer, ten sam co w G6; lokalnie Mailpit 1026). Nadawca i `Reply-To`: skrzynka Gaming (`kontakt@prokomgaming.pl` — Krystian, 01.11.2026; wcześniej roboczo `gaming@pro-kom.eu`). Temat: `Re: [PKG-RRRR-NNNN] <temat>`. Każda wysłana wiadomość ma własny `Message-ID` (zapis w `inquiry-messages.messageId`), kolejne ustawiają `In-Reply-To`/`References`. Treść tekstowa (+ prosta wersja HTML z akapitami); podpis tylko przez zmienną `{podpis}` w szablonie (wartość z `mail-settings`) — nie dopinany automatycznie. Nadawca: w P3 sprawdź, czy adapter z G6 wysyła ze skrzynki Gaming; jeśli nie — zmienne i transport skrzynki Gaming. Potwierdzenie z G12 zapisuje swój `Message-ID` w `inquiries.confirmationMessageId` (zmiana w P3), żeby odpowiedź klienta na nie trafiła do wątku. Kopia wysłanej wiadomości w folderze „Wysłane” skrzynki przez IMAP APPEND (P4; nazwa folderu z serwera Seohost).
2. **Odbiór:** zadanie `mail-intake` w kolejce Payload co 2 min (cron jak w G6; na serwerze sprawdzić, że zadania okresowe ruszają — uwaga z G4). Biblioteka **`imapflow`** (MIT) do IMAP, **`mailparser`** (MIT, ten sam autor) do parsowania — sprawdź aktualne wersje i API w ich dokumentacji, przypnij dokładnie. Folder `INBOX`. Ostatni przetworzony UID i `uidValidity` w globalu `mail-intake-state` — **flag wiadomości nie zmieniamy** (nie oznaczamy jako przeczytane, żeby nie znikały z nowych w zwykłej poczcie), nigdy nie usuwamy. Blokada przed nakładaniem się przebiegów. **Pomijane:** wiadomości od naszego nadawcy (powiadomienia G6, potwierdzenia G12, nasze odpowiedzi), z nagłówkiem `Auto-Submitted` innym niż `no` i z `Precedence: bulk/auto_reply` (autorespondery).
3. **Dopasowanie:** numer `PKG-RRRR-NNNN` w temacie → zapytanie; inaczej `In-Reply-To`/`References` = `messageId` naszej wiadomości; inaczej `mail-intake-unmatched` (przypięcie ręczne w panelu). Wiadomość z numerem zapytania, ale z innego adresu niż klient → przypięta z oznaczeniem „inny nadawca”.
4. **Treść:** tylko tekst (HTML → tekst), obcięty cytat poprzedniej wiadomości, bez obrazów zdalnych; załączniki niepobierane — wpis „Załącznik w poczcie: nazwa, rozmiar”. Maks. 20 tys. znaków na wiadomość.
5. **Status:** wysłanie odpowiedzi na `new` → `in_progress`; szablon rodzaju `offer` → `offer_sent`; odpowiedź klienta na `offer_sent` zostawia status (podświetla wątek jako „nowa wiadomość”).
6. **SLA:** zadanie `inquiry-sla` co 5 min wysyła (przez `notify`, ADR-G010) jeden alarm na zapytanie `new` starsze niż `replyAlarmMinutes` (domyślnie 45) w godzinach `mail-settings.replyHours { from, to }` (domyślnie 8–22). *Dopisek P0 (30.10.2026):* `site-settings` nie ma pola godzin (8–22 jest tylko w treści maili G13) — pole w `mail-settings` (P3); `{termin}` w szablonach = `site-settings.fulfilment`. `Message-ID` dziś nie jest nigdzie zapisywany (`submit.ts` → `payload.sendEmail`) — w P3 sprawdzić, czy adapter go zwraca, inaczej nadać własny nagłówek.
7. **RODO:** wątek należy do zapytania (usunięcie i retencja zapytania obejmują wiadomości). `mail-intake-unmatched` usuwane po 90 dniach.
8. **Testy:** parsowanie i dopasowanie na plikach `.eml` w `tests/fixtures/mail/` (z numerem w temacie, z samym `In-Reply-To`, bez dopasowania, HTML z cytatem, z załącznikiem); klient IMAP za interfejsem (atrapa w testach). Lokalny Mailpit służy do wysyłki — sprawdź, czy obsługuje odbiór; jeśli nie, prawdziwy test odbioru na skrzynce testowej przed produkcją (G16).

## Konsekwencje
- Nowe zmienne: `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASSWORD` (Zod w `lib/env.ts`; brak = odbiór wyłączony, wysyłka działa).
- Doręczalność: SPF/DKIM/DMARC domeny nadawcy sprawdzić przed produkcją (Seohost) — inaczej odpowiedzi trafią do spamu.
- Nowe kolekcje `inquiry-messages`, `reply-templates`, `mail-intake-unmatched`, globale `mail-settings`, `mail-intake-state`, zadania `mail-intake` i `inquiry-sla` (migracja enuma); retencja nieprzypisanych w istniejącym `inquiry-retention`.
