# Domena i DNS — prokomgaming.pl

**Stan DNS prowadzimy w jednym miejscu dla całej firmy: `prokom-web/docs/dns.md`** (tabela „Domeny”, akapit „prokomgaming.pl”, sekcja „Poczta (S10d)”, „Historia zmian DNS”). Zasada jak tam: każda zmiana najpierw w tamtym pliku (PR w `prokom-web`), potem w panelu Seohost. Ten plik mówi tylko, czego potrzebuje Gaming.

Sprawdzenie z PowerShell: `Resolve-DnsName staging.prokomgaming.pl -Type A` (typy: `A`, `MX`, `TXT`, `NS`).

## Stan (2.11.2026, wg `prokom-web/docs/dns.md`)
- Strefa w Seohost, delegacja `dns1/dns2.microhost.pl`; domena wygasa 31.10.2027.
- `@` i `www` → `194.28.50.70` (VPS webh.pl, wspólny z `prokom-web`; bez IPv6). Do startu produkcji Gaming Nginx nie ma bloku dla tych nazw i zamyka połączenie.
- Poczta: skrzynka **`kontakt@prokomgaming.pl`** w hostingu poczty Seohost; rekordy A `mail`, MX, SPF, DKIM `x._domainkey`, DMARC `p=none` ustawione 2.11.

## Czego potrzebuje Gaming
| Rekord | Wartość | Kiedy | Stan |
|---|---|---|---|
| A `staging` | `194.28.50.70` | przed certyfikatem stagingu (`docs/runbook.md` §1) | do ustawienia — wpis w `prokom-web/docs/dns.md` (PR G16 w `prokom-web`) |
| A `@`, `www` | `194.28.50.70` | produkcja | ustawione 2.11 |

Panel jest pod `/admin` tej samej domeny — **bez osobnej subdomeny panelu**. Certyfikaty: `prokom-gaming-staging` (`staging.prokomgaming.pl`), `prokom-gaming-prod` (`prokomgaming.pl`, `www.prokomgaming.pl`) — runbook.

## Poczta w aplikacji
Jedna skrzynka dla wszystkich maili aplikacji (decyzja Krystiana 31.10, P3): `MAIL_FROM_ADDRESS` = `INQUIRY_NOTIFY_EMAIL` = `kontakt@prokomgaming.pl`, panel czyta ją przez IMAP (odpowiedzi klientów, ADR-G008).
- SMTP: `srv128408.seohost.com.pl`, port 465, `SMTP_SECURE=true` (certyfikat jest na tę nazwę, nie na `mail.prokomgaming.pl`), login = pełny adres skrzynki.
- IMAP: `srv128408.seohost.com.pl`, port 993 — `TODO(krystian)`: potwierdzić nazwę serwera IMAP przy pierwszej próbie (runbook §1.10); hasło z menedżera haseł („Poczta kontakt@prokomgaming.pl”).
- Limit hostingu: 300 wysłanych dziennie na skrzynkę — przy starcie sprzedaży wystarcza (potwierdzenia, odpowiedzi, alarmy); przy większym ruchu do sprawdzenia.
- **Warunek przed włączeniem odpowiedzi z panelu (ADR-G008):** mail-tester.com dla `kontakt@prokomgaming.pl` (wynik i data tutaj: `TODO`), mail ze stagingu w Gmail i Outlook poza spamem.
