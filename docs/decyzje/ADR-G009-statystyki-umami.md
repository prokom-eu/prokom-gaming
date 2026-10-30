# ADR-G009: Statystyki strony — Umami na naszym serwerze, bez ciasteczek

- **Status:** przyjęta (Krystian, 30.10.2026)
- **Data:** 2026-10-30
- **Spec:** `docs/strony/prokomgaming-panel.md` §12

## Kontekst
Krystian chce widzieć w panelu ruch na stronie, źródła, najczęściej oglądane zestawy i lejek od wejścia do zamówienia. Strona ma baner cookies za flagą (wyłączony); chcemy statystyk bez zgody na ciasteczka i bez wysyłania danych odwiedzających do zewnętrznej firmy.

## Opcje
| Opcja | Plusy | Minusy |
|---|---|---|
| **A. Umami, własna instancja (Docker)** | open source, bez ciasteczek, API do panelu, PostgreSQL (mamy) | kolejny kontener na VPS |
| B. Plausible (chmura) | bez ciasteczek, wygodne | abonament, dane u dostawcy |
| C. Google Analytics 4 | darmowe, rozbudowane | ciasteczka → zgoda i baner, dane w Google |

## Decyzja
**Opcja A — Umami.** Źródła: [dokumentacja](https://docs.umami.is/docs) („bez ciasteczek, śledzenia między stronami i automatycznego zbierania danych osobowych”, API do własnych raportów), [instalacja](https://docs.umami.is/docs/install) (PostgreSQL ≥ 12.14, obraz Docker).
1. **Instalacja (G15 lokalnie, G16 serwer):** kontener `umami` w `compose.prod.yml` (i `compose.dev.yml`), obraz z **przypiętą wersją** (sprawdź aktualną w dokumentacji Umami; nie `latest`), osobna baza `umami` i użytkownik w naszym kontenerze PostgreSQL, limit pamięci (start 256–384 MB, zmierzyć). Panel Umami **niewystawiony publicznie** (dostęp przez tunel SSH); skrypt i zbieranie przez ścieżkę na naszej domenie w Nginx (np. `/_s/` → `umami`), żeby nie było osobnej domeny ani CORS — dokładną konfigurację ścieżek sprawdź w dokumentacji Umami (adres skryptu i punktu zbierania).
2. **Skrypt na stronie:** w layoucie `(site)`, ładowany `defer`, tylko na produkcji (i stagingu z osobnym `website-id`). Bez danych osobowych w zdarzeniach i adresach.
3. **Zdarzenia** (nazwy stałe w `lib/analytics.ts`, jedna funkcja `track(name, data?)`, bez błędu gdy skrypt zablokowany): `configurator_start`, `configurator_step` (`{ step }`), `configurator_done`, `inquiry_sent` (`{ type }` — bez numeru), `game_pick` (`{ game }`), `compare_open`, `build_ask` (`{ build }`).
4. **Panel:** widok `/admin/statystyki` czyta API Umami po sieci Dockera (`UMAMI_URL=http://umami:3000`), dane logowania API w env (sposób z dokumentacji Umami dla instancji własnej). Zapytania, oferty, zamówienia i przychód — z bazy. Odpowiedzi API cache’owane 5 min. Brak Umami = statystyki ruchu ukryte, dane z bazy zostają.
5. **Polityka prywatności:** dopisać informację o statystykach bez ciasteczek (`TODO(krystian)`: z prawnikiem, razem z resztą polityki).

## Konsekwencje
- Ruch zbierany od startu sprzedaży (dlatego instalacja w G15/G16, a widok w panelu może przyjść później — P8).
- Pamięć VPS: jeden kontener więcej; jeśli zabraknie, Umami na stagingu wyłączony.
- Kopia zapasowa: baza `umami` w tym samym `backup.sh` co baza strony.
