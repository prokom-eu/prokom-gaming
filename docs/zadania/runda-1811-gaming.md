# Runda 18.11.2026 — PRO-KOM Gaming: pasek linii jak na pozostałych stronach, motyw

Przygotowane w czacie projektu „PRO-KOM Cyfryzacja” 18.11.2026. Plan całej rundy: `prokom-web/docs/zadania/runda-1811.md`. Wspólny kontrakt: `docs/design/wspolne-linie/MOTYW-PASEK-LINII.md` (kopia z prokom-web — przy różnicy wygrywa prokom-web).

## 1. Zakres
### 1.1. Pasek linii (szef 18.11: „na Gaming nie ma tego paska z liniami na górze jak na każdej stronie”)
- Nowy komponent `src/components/BrandBar.tsx` nad `SiteHeader`, **≥ 1081 px** (poniżej linie są w arkuszu menu — dodać chipy linii do `MenuSheet`, jeśli ich tam nie ma), przewija się ze stroną, wysokość 38 px.
- Lewa część: linie PRO-KOM w kolejności **PRO-KOM, Biznes, Instalacje, Software, Tech, Gaming (na końcu)** — kolorowa kreska linii + nazwa, linki do domen: `https://pro-kom.eu`, `https://prokombiznes.pl`, `https://prokominstalacje.pl`, `https://prokomsoftware.pl`, `https://prokomserwis.pl`; Gaming = bieżąca (`aria-current="page"`, złota kreska, pigułka). Kolory kresek: wartości z księgi znaku (`docs/marka` prokom-web / `docs/design/prokomgaming/tokens.css`; Gaming: złoto z tokenów Gaming). Dane w `src/lib/lines.ts` (stała lista — Gaming nie czyta `CompanyData` prokom-web; komentarz: zmiany linii w prokom-web → tu też).
- Prawa część: status godzin (jeśli Gaming ma godziny — dziś w prokom-web `TODO(krystian)` [SZEF]; brak godzin → bez statusu) i telefon Gaming jak w obecnym nagłówku.
- Wygląd i ruch wg §4 kontraktu (pigułka za kursorem, żywa kreska, dymek z opisem linii, wejście raz na sesję, reduced-motion), w tokenach Gaming (ciemne tło, kontrast AA). Opisy linii do dymka: „Kasy, komputery i programy” (Biznes) itd. — skopiować z prokom-web po scaleniu WSP-M (`CompanyData.lines[].tagline` w seedzie), do tego czasu `TODO(krystian)`.
- Zrzuty 1440 i 414 (na 414 pasek niewidoczny, chipy w arkuszu) — dopisać do wzorca jako odstępstwo od planszy w `docs/STAN.md`.

### 1.2. Motyw
- **Rekomendacja (do potwierdzenia przez Krystiana/szefa, `runda-1811.md` §7 pkt 4): Gaming zostaje tylko ciemny** — brak jasnego projektu (sceny, istoty, poświaty), jasny motyw to nowy projekt całej strony. Bez przycisku motywu i bez pozycji motywu w szynie.
- **Odbiór parametru `?motyw=`** (przejście z innej linii, ADR-028 w prokom-web): Gaming parametr **tylko usuwa z adresu** po hydratacji (natywne `history.replaceState` — sprawdzić w `node_modules/next/dist/docs/` zainstalowanej wersji), nic nie zapisuje. `canonical` bez parametru (sprawdzić).
- Linki z Gaming do innych linii: bez parametru (Gaming nie ma wyboru motywu) — inne linie zastosują swój zapisany wybór albo Auto.

## 2. PR
Jeden PR `feat/r1811-pasek-linii` (pasek + chipy w arkuszu + czyszczenie parametru), testy: Vitest (lista linii, kolejność, Gaming na końcu), e2e (1440: pasek widoczny, Gaming `aria-current`; `/?motyw=jasny` → po wczytaniu adres bez parametru i nadal ciemny motyw), axe, Lighthouse mobile ≥ 90 bez spadku.

## 3. Prompt dla Claude Code
```
/zadanie GM-R1 — runda 18.11: pasek linii PRO-KOM na Gaming i odbiór parametru motywu.
Przeczytaj: docs/zadania/runda-1811-gaming.md (całość), docs/design/wspolne-linie/MOTYW-PASEK-LINII.md (§3.3, §4, §5), ADR-G003, docs/STAN.md.
Jeden PR feat/r1811-pasek-linii wg §1–§2. Gaming zostaje ciemny (bez przycisku motywu) — jeśli Krystian zdecydował inaczej, zapytaj przed startem.
Wygląd w tokenach Gaming (ADR-G003), telefon jak aplikacja (chipy linii w MenuSheet). /przeglad przed /pr.
```
