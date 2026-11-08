# ADR-G013: Runda wyglądu v2 po starcie — bez podań, imię nad komputerem, nowe sceny, poprawki zaufania

- **Status:** przyjęta (Krystian, 03.11.2026)
- **Data:** 2026-11-03
- **Spec:** `docs/design/prokomgaming/runda-v2/ZMIANY.md`, `runda-v2/SCENY-BRIEF.md` · plan: `docs/zadania/gaming-runda-v2.md`

## Kontekst
Strona działa na produkcji od 03.11.2026. Audyt działającej strony i przegląd Krystiana wykazały: brak logo w wynikach Google (`/favicon.ico` 404), brak obrazków podglądu linków poza kartami zestawów, niezbierające się statystyki (brak skryptu Umami), regulamin i polityka oznaczone publicznie jako projekt, a w wyglądzie: imię istoty zachodzi za komputer w hero, przeciętne sceny, niewyśrodkowane miniatury, słabsze sekcje strony głównej, „Dla rodziców” i „Kontakt”. Blok „Z podań” (wierzenia o upiorach, topielcach, klątwach) nie pasuje do strony czytanej przez dzieci i nie sprzedaje komputera.

## Decyzja
1. **Usuwamy „Z podań” i opisy z podań na kartach** — zastępuje je „Wyróżnik” (o samym komputerze). Imiona, pieczęcie, przydomki i sceny zostają jako marka. Pola `myth`/`legend`/`legendSource` ukryte, dane zostają do porządków.
2. **Imię istoty zawsze w całości nad komputerem** — twardy test e2e (16 istot × 5 szerokości); położenie komputera liczone z bounding boxa nieprzezroczystych pikseli zdjęcia obudowy (jedno źródło danych dla hero i miniatur).
3. **Sceny: najpierw kod, potem nowe obrazy.** R3 poprawia warstwy, światło i ruch na obecnych scenach; nowe grafiki 16 istot generuje Krystian wg briefu (narzędzie z prawem do użytku komercyjnego, bez postaci i napisów), R4 je obrabia. Odrzucone: tylko kod (nie da skoku jakości), ilustrator na zlecenie (koszt i czas nieznane na dziś — możliwe później).
4. **Sekcje i strony o dużym ładunku wizualnym (R3, R5–R8): w planie 2 warianty zrzutów do wyboru** zamiast jednego „epickiego” strzału.
5. **Prawne:** kod nie zdejmuje napisu „Projekt do weryfikacji…” — robi to Krystian w panelu po akceptacji prawnika; runda przygotowuje zaktualizowany projekt polityki (Umami, konto, korespondencja z panelu).
6. **Nawigacja** wg ADR-G012 (GN-1–GN-3) wpięta w kolejność rundy: GN-1 wcześnie, GN-2 po zmianach sekcji strony głównej.
7. Każda sesja = osobny PR i osobne wdrożenie (staging → sprawdzenie → produkcja).

## Konsekwencje
- ok. 8,25 wieczoru pracy (bez generowania grafik i bez prawnika).
- Nowy plik danych z boxami obudów — przy każdym nowym zdjęciu obudowy trzeba uruchomić skrypt (opis w README wzorca i w imporcie opcji).
- Teksty „Wyróżnik” są edytowalne w panelu; przy zmianie części zestawu trzeba je przejrzeć (dopisek do edytora zestawu w panelu — przypomnienie przy zmianie przepisu).

## Aktualizacja 06.11.2026 (sesja A, decyzje Krystiana)
- **Boxy obudów zamiast pliku danych i skryptu:** pole `media.box` (ułamki pliku) liczone hakiem `beforeChange` przy wgraniu lub podmianie zdjęcia w panelu (`src/collections/caseBoxHook.ts`), dla istniejących plików — migracja `20261105_225049_media_case_box`. Skryptu `scripts/media/case-boxes.mjs` nie ma; punkt „trzeba uruchomić skrypt” z „Konsekwencji” jest nieaktualny.
- **Sesja A w jednym PR** (R3 + R5 razem, wyjątek od pkt 7 i od podziału A1/A2).
- **Sceny kodem (runda v2 §3.2) przesunięte z R3 do R4** — robione razem z nowymi grafikami, żeby nie stroić dwa razy.
