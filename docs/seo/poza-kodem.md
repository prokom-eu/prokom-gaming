# SEO i polecenia w czatach AI — co zrobić poza kodem

Plik z sesji SEO z 13.11.2026. Kod daje fundament: metadane, dane strukturalne, sitemapę, `llms.txt`, stronę lokalną i linkowanie. Pozycję w Google i to, czy czaty AI polecą PRO-KOM Gaming, ustalają jednak głównie rzeczy poza kodem. Ta lista je zbiera.

## Najpierw uczciwie

- **1. miejsca na ogólnopolskie „komputery do gier” czy „komputer gamingowy” nikt nie zagwarantuje.** Na te frazy od lat wygrywają x-kom, Morele, Komputronik, Media Expert, porównywarki i duzi składacze. Mają tysiące linków i opinii. To cel na lata, nie na start.
- **Realne na start są frazy lokalne i dokładne:**
  - „komputer do gier Rabka”, „komputer gamingowy Nowy Targ”, „sklep komputerowy Rabka-Zdrój”;
  - „komputer do Fortnite”, „komputer do CS2 do 5000 zł”, „biały komputer gamingowy”;
  - „komputer do gier dla dziecka”.
  Do tego dochodzą wyniki z mapą (Profil Firmy w Google), a te zależą od opinii i odległości.
- **Czaty AI** (ChatGPT, Perplexity, Gemini, Claude) polecają firmy, o których piszą inne strony: rankingi, fora, media, opinie. ChatGPT i Copilot szukają przez Bing, Gemini przez Google, Perplexity ma własny indeks. `llms.txt` pomaga im zrozumieć stronę, ale sam nie sprawi, że ktoś nas poleci.

## P0 — przed startem sprzedaży (20.11.2026) albo w pierwszym tygodniu

| # | Co | Jak | Kto |
|---|---|---|---|
| 1 | **Profil Firmy w Google** (Google Business Profile) | Załóż albo przejmij profil sklepu przy ul. Orkana 16B. Kategoria główna „Sklep komputerowy”, dodatkowe: „Serwis komputerowy”, „Sklep z grami komputerowymi” (jeśli pasuje). Nazwa jak na szyldzie. Telefon +48 883 200 151, strona `https://prokomgaming.pl`. Godziny otwarcia, opis z frazami „komputery do gier”, „komputery gamingowe”, „Rabka-Zdrój”, „Podhale” (bez upychania). Zdjęcia sklepu, warsztatu i zestawów. Produkty: 16 zestawów z ceną i linkiem. Obszar obsługi: Rabka-Zdrój, Nowy Targ, Zakopane, powiat nowotarski. | Krystian + szef (weryfikacja kodem pocztą albo wideo) |
| 2 | **Identyczny NAP wszędzie** (nazwa, adres, telefon) | Dokładnie: „PRO-KOM Tadeusz Wójciak, ul. Orkana 16B, 34-700 Rabka-Zdrój, +48 883 200 151” — jak w stopce i w danych strukturalnych. Żadnych drugich adresów (Zakopane) ani starych numerów. | Krystian |
| 3 | **Google Search Console** | Dodaj domenę `prokomgaming.pl` (weryfikacja przez DNS), zgłoś `https://prokomgaming.pl/sitemap.xml`. Po wdrożeniu sprawdź raporty: „Strony”, „Produkty” i „Fragmenty z informacjami o sprzedawcy” (dane o wysyłce i zwrotach z tej sesji), „Menu nawigacyjne”, „Często zadawane pytania”. Testuj w Rich Results Test. | Krystian |
| 4 | **Bing Webmaster Tools** | Import z Search Console jednym kliknięciem, zgłoś sitemapę, włącz IndexNow, jeśli panel go proponuje. **Ważne dla ChatGPT i Copilota.** | Krystian |
| 5 | **Opinie Google — stały proces** | Krótki link do wystawienia opinii (z Profilu Firmy) w mailu po odbiorze, kod QR na metryce albo w pudełku, prośba przy odbiorze w sklepie. Odpowiadaj na każdą opinię. **Bez kupowania opinii i bez nagród za opinie** — łamie zasady Google i UOKiK. Gdy będzie ok. 10 prawdziwych opinii, włączymy sekcję opinii na stronie (`TODO(krystian)` w `page.tsx`). | Krystian + każdy, kto wydaje komputer |
| 6 | **Zaakceptuj teksty z tej sesji** | Wszystkie `TODO(krystian)` z PR-a SEO: tytuł i opis głównej, opisy zestawów i gier, strona `/komputery-do-gier-rabka-zdroj` (sprawdź odległości), zdanie na `/o-nas` zamiast „Dwa sklepy na Podhalu”, linki w stopce i na `/kontakt`, `llms.txt`. | Krystian (+ szef przy treściach) |
| 7 | **Godziny otwarcia i współrzędne sklepu** | Gdy szef poda godziny, dopiszemy `openingHoursSpecification` i `geo` w `lib/seo.ts`. Godziny muszą być takie same jak w Profilu Firmy. | szef → Krystian |

## P1 — pierwszy miesiąc

| # | Co | Jak |
|---|---|---|
| 8 | **Wstępy do 33 stron gier** | Szkice w `docs/seo/wstepy-gier.md` — popraw i wklej w panelu. Największy zysk treściowy z małym wysiłkiem. |
| 9 | **Poradniki** | Opublikowany jest 1 z 7. Kolejne szkice z panelu (Fortnite, rozdzielczość, X3D, pierwsze uruchomienie, FPS, zasilacz) to dokładnie frazy, które ludzie wpisują i o które pytają czaty AI. Jeden poradnik co 1–2 tygodnie. W każdym linki do 2–3 stron gier i zestawów. |
| 10 | **Link z pro-kom.eu** | Na stronie głównej i w „O nas” prokom-web: widoczny link „Komputery do gier — PRO-KOM Gaming” do `https://prokomgaming.pl`. To najłatwiejszy mocny link (stara, zaufana domena). |
| 11 | **Profile społecznościowe** | Facebook i TikTok PRO-KOM Gaming z tym samym adresem i telefonem. Adresy wpisz w `lib/site.ts` → `social` — trafią do stopki i do `sameAs` w danych strukturalnych. |
| 12 | **Katalogi firm z tym samym NAP** | Bing Places (ChatGPT i Copilot korzystają z Binga), Apple Business Connect (Mapy Apple, Siri), pkt.pl, Panorama Firm, Aleo, Firmy.net, oferteo. Wszędzie ten sam NAP i link do `prokomgaming.pl`. Nie płać za „pakiety pozycjonowania” katalogów. |
| 13 | **Lokalne portale i media** | Artykuł albo informacja o starcie PRO-KOM Gaming: rabka.pl, Tygodnik Podhalański, podhale24.pl, nowotarski portal powiatowy, Gazeta Krakowska (dział regionalny). Temat: „firma z Rabki składa komputery do gier z metryką” — lokalna historia, nie reklama. Link do strony = sygnał lokalny dla Google i źródło dla AI. |
| 14 | **Lokalne organizacje** | Szkoły (sponsoring turnieju e-sportowego, warsztaty), kluby, MOK Rabka — link ze strony wydarzenia. |

## P2 — stale, gdy będzie czas

| # | Co | Jak |
|---|---|---|
| 15 | **Fora i społeczności** | PurePC, benchmark.pl, Reddit (r/Polska i subreddity o sprzęcie), grupy na Facebooku „Pomoc w doborze komputera”, Wykop. Odpowiadaj jako ekspert pod własnym nazwiskiem, z jawną informacją, że jesteś z PRO-KOM. Link tylko tam, gdzie naprawdę pomaga. **Bez spamu i fałszywych kont** — to szkodzi bardziej niż pomaga. Takie wątki często cytują czaty AI. |
| 16 | **YouTube i TikTok** | Krótkie filmy: pomiar klatek na konkretnym zestawie, składanie komputera, „komputer do Fortnite za X zł”. W opisie link do strony gry albo zestawu. Wideo z YouTube pojawia się w Google i bywa cytowane przez AI. |
| 17 | **Porównywarki i rankingi** | Ceneo (oferty zestawów, jeśli kiedyś będzie płatność albo „kup u sprzedawcy” — dziś zapytanie, więc najpierw ADR), artykuły typu „najlepsze komputery do gier do 5000 zł” na portalach technologicznych — zaproponuj zestaw do testu redakcyjnego. |
| 18 | **Recenzje i testy egzemplarzy** | Wypożyczenie zestawu youtuberowi albo portalowi (z jawną współpracą). Niezależny test to najsilniejszy sygnał zaufania dla ludzi, Google i AI. |
| 19 | **Pomiar** | Co miesiąc w Search Console: frazy z „Rabka”, „Nowy Targ”, „komputer do [gra]”, CTR tytułów stron gier. Po 2–3 miesiącach popraw tytuły z najniższym CTR. Sprawdzaj też raz w miesiącu, co odpowiadają ChatGPT, Perplexity i Gemini na „gdzie kupić komputer do gier na Podhalu” i „komputer do gier Rabka”. |
| 20 | **Wydajność (Core Web Vitals)** | Lab LCP 3,1–4,3 s (F3: framework i fonty hero). Dane polowe z Chrome (CrUX) pojawią się po ruchu — sprawdzaj raport „Podstawowe wskaźniki internetowe” w Search Console. Osobna sesja wydajności, jeśli raport pokaże „Wymaga poprawy”. |

## Czego nie robić

- Nie kupować linków ani „pozycjonowania z gwarancją TOP 3”.
- Nie robić osobnych stron dla każdego miasta z tym samym tekstem (tzw. doorway pages — Google je obniża). Jedna strona lokalna z konkretami wystarczy.
- Nie wpisywać fraz w tekst na siłę. Kolejność jest taka: najpierw człowiek, potem Google.
- Nie wpisywać do Profilu Firmy adresu w Zakopanem ani innego, jeśli tam nie ma sklepu.
