# Domena i DNS — prokomgaming.pl

Stan DNS domeny Gaming. **Zasada (jak `prokom-web/docs/dns.md`): każda zmiana najpierw tutaj (PR), potem w panelu Seohost.** Gdy coś przestaje działać (strona, poczta, certyfikat), porównujemy rzeczywistość z tym plikiem zamiast zgadywać. Zasady własności domen (abonent firma, 2FA, autoodnawianie, hasło w menedżerze) — `prokom-web/docs/dns.md`.

Sprawdzenie z PowerShell: `Resolve-DnsName prokomgaming.pl -Type A` (typy: `A`, `MX`, `TXT`, `NS`).

## Domena
| Domena | Rejestrator / DNS | Abonent | Autoodnawianie | Wygasa | Przeznaczenie |
|---|---|---|---|---|---|
| prokomgaming.pl | Seohost; DNS `dns1/dns2.microhost.pl` (jak pozostałe domeny) — `TODO(krystian)`: potwierdzić | PRO-KOM | `TODO(krystian)` | `TODO(krystian)` | strona + panel `/admin` (ADR-G001 §3, §6) + skrzynka Gaming |

Serwer: ten sam VPS co `prokom-web` — webh.pl (ADR-019 w `prokom-web`), IPv4 **`194.28.50.70`**, bez IPv6 (bez rekordów AAAA). Panel jest pod `/admin` tej samej domeny — **bez osobnej subdomeny panelu**.

## Rekordy
TTL przy zwykłej pracy: 3600; dzień przed zmianą IP obniżamy do 300. `<IP>` = IPv4 serwera z akapitu wyżej.

| Typ | Nazwa | Wartość | TTL | Po co | Stan |
|---|---|---|---|---|---|
| NS | @ | `dns1.microhost.pl`, `dns2.microhost.pl` | — | serwery DNS strefy (panel Seohost) | `TODO(krystian)`: potwierdzić |
| A | staging | `<IP>` | 3600 | staging za hasłem i `noindex` (G16) | do ustawienia |
| A | @ | `<IP>` | 3600 | strona i panel; do startu produkcji Nginx nie ma bloku dla tej nazwy i zamyka połączenie | do ustawienia (jeśli Seohost utworzył przy strefie — wpisać „ustawione”) |
| A | www | `<IP>` | 3600 | `www` → 301 na wersję bez `www` (od produkcji) | do ustawienia |

Certyfikaty Let's Encrypt (certbot w stosie `prokom-proxy`, `docs/runbook.md`): `prokom-gaming-staging` (`staging.prokomgaming.pl`) przy stagingu, `prokom-gaming-prod` (`prokomgaming.pl`, `www.prokomgaming.pl`) dopiero przy produkcji — Nginx nie startuje z blokiem, którego certyfikat nie istnieje.

## Poczta — skrzynka Gaming
Jedna skrzynka u Seohost (`TODO(krystian)`: adres — STAN G15 zakłada `kontakt@prokomgaming.pl`): z niej wychodzą wszystkie maile aplikacji (`MAIL_FROM_ADDRESS`, konto SMTP), na nią przychodzą powiadomienia o zapytaniach (`INQUIRY_NOTIFY_EMAIL`), panel czyta ją przez IMAP (odpowiedzi klientów, ADR-G008).

| Typ | Nazwa | Wartość | TTL | Po co | Stan |
|---|---|---|---|---|---|
| MX | @ | `TODO(krystian)`: serwer poczty z panelu Seohost | 3600 | odbiór poczty | `TODO(krystian)` |
| TXT (SPF) | @ | `TODO(krystian)`: `v=spf1 include:<z panelu Seohost> -all` — **jeden** rekord SPF | 3600 | kto może wysyłać z domeny | `TODO(krystian)` |
| TXT (DKIM) | `<selektor>._domainkey` | `TODO(krystian)`: klucz z panelu Seohost (włączyć podpisywanie) | 3600 | podpis maili | `TODO(krystian)` |
| TXT (DMARC) | `_dmarc` | start: `v=DMARC1; p=none; rua=mailto:<adres skrzynki>` | 3600 | raporty; po 2–4 tygodniach bez problemów `p=quarantine` | `TODO(krystian)` |

- **Warunek przed włączeniem odpowiedzi z panelu (ADR-G008):** SPF, DKIM i DMARC ustawione, wysyłka testowa ze stagingu do mail-tester.com (wynik i data tutaj: `TODO`), mail ze stagingu w Gmail i Outlook poza spamem.
- Wartości SPF/DKIM/MX przepisujemy 1:1 z panelu Seohost — nie zgadujemy.

## Historia zmian DNS
| Data | Zmiana | Kto | PR |
|---|---|---|---|
| — | — | — | — |
