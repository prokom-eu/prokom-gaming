# ADR-008: Aktualna dokumentacja bibliotek dla Claude Code

- **Status:** przyjęta (15.10.2026)
- **Data:** 2026-10-15
- **Decyduje:** Krystian (technika)

## Kontekst
Payload 3 i Next.js często zmieniają API, a model Claude pisze „z pamięci” wersji ze swoich danych treningowych. Błędne API to stracony czas jednej osoby. Potrzebujemy źródła dokumentacji **dla zainstalowanej wersji** (dziś: Next 16.3.8, Payload 3.90.2), które działa na obu komputerach bez dodatkowej konfiguracji i nie dokłada ruchomych części.

Stan na 15.10.2026 (sprawdzone):
- **Next.js** dołącza pełną dokumentację do paczki: `node_modules/next/dist/docs/` (~4 MB Markdown, dokładnie ta wersja). `next dev` sam dopisuje do `CLAUDE.md` blok kierujący tam Claude.
- **Payload** w głównej gałęzi repo ma już oficjalny skill dla agentów, dołączany do paczki (`node_modules/payload/skills/payload/SKILL.md`), a `create-payload-app` tworzy `AGENTS.md` wskazujący na niego. **W zainstalowanej wersji 3.90.2 skilla jeszcze nie ma** — przyjdzie z aktualizacją Payload.
- **Payload** publikuje dokumentację dla modeli: `https://payloadcms.com/llms.txt` i `llms-full.txt` (najnowsza wersja, nie przypięta do naszej).
- **Context7** (Upstash) — serwer MCP z dokumentacją wielu bibliotek, wersja `@upstash/context7-mcp` 4.x; usługa zewnętrzna (zapytania wychodzą do Upstash), limity w darmowym planie, opcjonalny klucz API.

## Opcje
| Opcja | Zalety | Wady | Koszt |
|---|---|---|---|
| A. Dokumentacja z `node_modules` (Next teraz, skill Payload po aktualizacji) + `llms-full.txt` Payload przez WebFetch do czasu skilla | Dokładnie zainstalowana wersja; zero konfiguracji; działa offline; przychodzi z Dependabotem razem z kodem | Do aktualizacji Payload: dokumentacja Payload = najnowsza, nie przypięta (ryzyko rozjazdu jest małe w obrębie 3.x); typy `.d.ts` w `node_modules/payload` jako ostateczne źródło prawdy | 0 zł |
| B. Context7 MCP | Jedno narzędzie dla wielu bibliotek (też Zod, Tailwind, Playwright); wyszukiwanie po fragmentach | Nowa ruchoma część: konfiguracja MCP na dwóch komputerach, klucz API w menedżerze haseł; usługa zewnętrzna i jej limity; wersje indeksu nie zawsze równe naszym | 0 zł (darmowy plan) |
| C. A + B | Najszersze pokrycie | Dwa źródła, czasem sprzeczne; największa złożoność | 0 zł |

## Decyzja
Wybieramy **A**, ponieważ daje dokumentację dokładnie zainstalowanych wersji bez nowej usługi i bez konfiguracji na dwóch komputerach — zgodnie z zasadą „każda ruchoma część musi mieć uzasadnienie”.

Kolejność źródeł dla Claude:
1. **Next.js:** `node_modules/next/dist/docs/`.
2. **Payload:** `node_modules/payload/skills/payload/SKILL.md`, gdy istnieje; do tego czasu `https://payloadcms.com/llms-full.txt` (WebFetch) + typy w `node_modules/payload/dist/**/*.d.ts` rozstrzygają wątpliwości.
3. Inne biblioteki: README/typy w `node_modules`, potem oficjalna strona.
4. Gdy źródło milczy — powiedzieć „nie wiem”, nie zgadywać (CLAUDE.md).

## Konsekwencje
- Kolejność źródeł dopisana do `CLAUDE.md` („Zanim zaczniesz zadanie”, pkt 6).
- Przy pierwszej aktualizacji Payload, która dołącza skill: sprawdzić `node_modules/payload/skills/payload/`, dodać `AGENTS.md` wskazujący na skill (jak robi `create-payload-app`) i zaktualizować ten ADR.
- Wracamy do Context7 (opcja B), jeśli w S2–S5 Claude co najmniej kilka razy użyje nieistniejącego API mimo źródeł z opcji A.
