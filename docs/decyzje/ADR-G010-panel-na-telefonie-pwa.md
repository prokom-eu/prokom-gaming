# ADR-G010: Panel na telefonie — PWA z powiadomieniami push, bez aplikacji ze sklepu

- **Status:** przyjęta (Krystian, 30.10.2026: „na mobile panel ma być jak najlepsza aplikacja”)
- **Data:** 2026-10-30
- **Spec:** `docs/strony/prokomgaming-panel.md` §2a, §13, §14, §17

## Kontekst
Strona obiecuje odpowiedź w godzinę (8–22). Krystian często nie siedzi przy komputerze: odpowiada klientom i zatwierdza ceny z telefonu. Potrzebny jest panel, który na telefonie działa jak aplikacja (ikona na ekranie głównym, pełny ekran, dolne zakładki) i **sam daje znać** o nowym zapytaniu, zanim minie godzina. Alarm e-mail z G4/ADR-G008 łatwo przeoczyć wśród innej poczty.

## Opcje
| Opcja | Plusy | Minusy |
|---|---|---|
| **A. PWA (`/admin` do ekranu głównego) + Web Push** | ten sam kod i to samo logowanie co panel; push na Androidzie i iPhonie (iOS/iPadOS 16.4+ po dodaniu do ekranu głównego); bez sklepu i opłat | iPhone wymaga dodania do ekranu głównego; trzeba utrzymać service worker i klucze VAPID |
| B. Aplikacja natywna (np. React Native / Expo) | pełne możliwości systemu | druga aplikacja do utrzymania przez jedną osobę, konta deweloperskie i publikacja w sklepach, osobne API — nieproporcjonalne do potrzeby |
| C. Tylko e-mail | już jest | ginie w poczcie, brak „jak aplikacja” |
| D. SMS przez bramkę | dociera zawsze | koszt za wiadomość, dostawca, dane w treści SMS-a |

## Decyzja
**Opcja A.** Źródło możliwości iPhone’a: [WebKit — Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
1. **Wygląd i zachowanie na telefonie:** spec. §2a (powłoka `PanelShell`, dolne zakładki, arkusz „Więcej”, tabele jako karty, `ActionBar`, wątek zapytania na pełny ekran). Powłoka w P1, każdy ekran dopracowuje telefon w swojej sesji.
2. **Manifest** dla zakresu `/admin` (P1): nazwa „PRO-KOM Panel”, `start_url: /admin`, `scope: /admin`, `display: standalone`, `theme_color`/`background_color #080C0B`, ikony 192/512 + maskowalna (z logo PRO-KOM Gaming), `apple-touch-icon`. Nie przez `app/manifest.ts` (obejmie całą stronę i zderzy się z manifestem strony). Sprawdź w dokumentacji zainstalowanej wersji Payload/Next, jak dodać `<link rel="manifest">` i meta tylko w panelu (Payload `RootLayout` ma `<head>`; wariant awaryjny: `(payload)/layout.tsx`).
3. **Service worker** (zakres `/admin`: domyślny zakres pliku `/admin/sw.js` to `/admin/`, który nie obejmuje samego `/admin` — potrzebny nagłówek `Service-Worker-Allowed: /admin` albo plik w innym miejscu; sprawdź, czy ścieżka nie koliduje z catch-all Payload `(payload)/admin/[[...segments]]` i z Nginx — najpewniej osobny route handler) **tylko** do odbioru push i otwarcia właściwego ekranu po dotknięciu. Bez cache odpowiedzi panelu i bez trybu offline (dane cenowe i osobowe nie zostają na telefonie).
4. **Wysyłka push** (P4): biblioteka **`web-push`** (sprawdź aktualną wersję i licencję w jej dokumentacji, przypnij dokładnie), klucze VAPID w env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` = `mailto:` skrzynki Gaming). Subskrypcje w kolekcji `push-subscriptions` (spec. §17), tylko dla zalogowanych użytkowników panelu; odpowiedź 404/410 usługi push = usunięcie subskrypcji; inne błędy = `failCount`, po 5 — wyłączenie z wpisem w panelu.
5. **Zdarzenia:** tabela w spec. §14 (`kind`: `inquiry_new`, `inquiry_reply`, `inquiry_sla`, `margin_alarm`, `price_report`, opcjonalnie `workshop`). Jedna funkcja `notify(kind, payload)` w `lib/notify/` dodaje zadanie `notify-send` do kolejki — nigdy wysyłka bezpośrednio w haku zapisu (formularz strony nie może czekać na usługę push). Klucz publiczny VAPID trafia do przeglądarki w HTML widoku z serwera.
6. **Treść bez danych osobowych:** tytuł i jedna linia z numerem i nazwą zestawu (np. „Nowe zapytanie PKG-2026-0047 · Wampir”), adres ekranu w danych powiadomienia. Bez imion, e-maili i telefonów — treść przechodzi przez usługę push producenta przeglądarki.
7. **Rola `serwis`:** tylko zdarzenia warsztatu (gdy będą); bez marż i cen.
8. **Testy:** funkcja wyboru odbiorców i treści (czysta, testy jednostkowe), atrapa `web-push` w testach, e2e: włączenie w Ustawieniach z **atrapą `pushManager`** (Chromium w Playwright zwykle nie ma usługi push, a `devices['iPhone 13']` to WebKit), „Wyślij próbne” na atrapie `web-push`; prawdziwa subskrypcja tylko ręcznie. Ręcznie przed G16/po P4: Android (Chrome) i iPhone (z ekranu głównego).

## Konsekwencje
- Krystian dostaje znak o zapytaniu w kilka sekund, także poza komputerem — wspiera obietnicę „odpowiedź w godzinę”.
- iPhone: trzeba raz dodać panel do ekranu głównego (instrukcja w Ustawieniach).
- Nowe zmienne env, kolekcja `push-subscriptions`, plik service workera; przy podnoszeniu wersji Next/Payload sprawdzić manifest i rejestrację SW (e2e).
- Natywna aplikacja poza zakresem (spec. §19).
