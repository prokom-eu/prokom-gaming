import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * „Wyróżnik” instead of „Z podań” (ADR-G013 pt 1, runda v2 §2). Texts of the 16 builds, 1:1 from
 * the table of §2 — the same as `highlight` in seed/prokomgaming/builds.json
 * (`src/seed/highlight.test.ts` keeps them equal). Keyed by slug, so every database gets them.
 */
export const HIGHLIGHTS: Record<string, { title: string; body: string }> = {
  skrzat: {
    title: 'Pierwszy prawdziwy komputer do gier',
    body: 'Najtańszy sposób, żeby Roblox, Minecraft, Fortnite i CS2 chodziły płynnie w FullHD. Duże chłodzenie wieżowe zamiast małego wentylatora i szybki dysk NVMe, na którym gra wczytuje się w kilka sekund.',
  },
  licho: {
    title: 'E-sport bez zadyszki',
    body: 'RTX 5060 z DLSS 4 trzyma CS2 i Valoranta grubo powyżej 144 klatek, więc monitor 144 Hz w końcu ma co pokazać. Dysk 1 TB mieści kilka dużych gier naraz.',
  },
  bies: {
    title: 'Platforma, która urośnie z Tobą',
    body: 'Najtańszy zestaw na nowej platformie AM5 z pamięcią DDR5. Za kilka lat wymienisz sam procesor na mocniejszy, bez nowej płyty i nowej pamięci.',
  },
  wodnik: {
    title: 'Do gier i do nauki',
    body: 'Intel Core i5-14400F ma 10 rdzeni, więc poza grami w FullHD na wysokich spokojnie ogarnia naukę, prezentacje i montaż krótkich filmów.',
  },
  strzyga: {
    title: '12 GB pamięci karty i szyba z dwóch stron',
    body: 'Radeon RX 9070 GRE z 12 GB pamięci to zapas na nowe gry w FullHD ultra i 2K. Panoramiczna obudowa pokazuje całe wnętrze.',
  },
  kikimora: {
    title: 'Płynne 2K w fioletowym świetle',
    body: 'RTX 5070 z DLSS 4 i chłodzenie wodne 360 mm: płynne 2K na monitorze 144 Hz, a procesor zostaje chłodny nawet w długich sesjach.',
  },
  zmora: {
    title: '16 GB pamięci karty na nowe gry',
    body: 'Radeon RX 9070 z 16 GB i 32 GB RAM to najspokojniejszy wybór pod premiery w 2K, które potrzebują coraz więcej pamięci. Procesor z nowej serii Ryzen 9000.',
  },
  rusalka: {
    title: 'Cały na biało',
    body: 'Moc Kikimory w bieli: biała karta graficzna, płyta, obudowa i chłodzenie wodne. Do tego 32 GB pamięci zamiast 16.',
  },
  'baba-jaga': {
    title: 'Procesor stworzony do gier',
    body: 'Ryzen 7 7800X3D ma dodatkową pamięć podręczną 3D V-Cache i w grach należy do najszybszych procesorów. Dobry wybór do szybkich strzelanek na monitorze z wysokim odświeżaniem.',
  },
  bazyliszek: {
    title: 'Szybkie strzelanki w 2K',
    body: 'Ryzen 7 7800X3D z Radeonem RX 9070 XT: CS2 i Call of Duty grubo powyżej 144 klatek w 2K, premiery na wysokich. Chłodzenie wodne 360 mm trzyma temperaturę w ryzach.',
  },
  'pani-zimy': {
    title: 'Biel i lodowe światło',
    body: 'Moc Bazyliszka w białej obudowie z lodowym podświetleniem i białym chłodzeniem wodnym. Komputer, który wygląda na biurku równie dobrze, jak gra.',
  },
  wilkolak: {
    title: '4K do grania i do pracy',
    body: 'Intel Core Ultra 7 ma wiele rdzeni, więc poza 4K na wysokich szybko renderuje filmy i radzi sobie z ciężką pracą. RTX 5070 Ti z 16 GB pamięci i DLSS 4.',
  },
  wampir: {
    title: '4K i wysokie odświeżanie w jednym',
    body: 'Ryzen 7 9800X3D, jeden z najszybszych procesorów do gier, i RTX 5070 Ti z 16 GB pamięci: 2K z wysokim odświeżaniem albo 4K na wysokich, z zapasem na kolejne premiery.',
  },
  weles: {
    title: '4K na ultra w najcięższych grach',
    body: 'RTX 5080 z 16 GB pamięci i Ryzen 7 9800X3D. Dysk 2 TB mieści całą bibliotekę, a ekran na pompie chłodzenia pokazuje temperatury.',
  },
  zmij: {
    title: 'Premium w każdym szczególe',
    body: 'Ryzen 7 9850X3D, RTX 5080 z trzema wentylatorami i obudowa premium z ekranem LCD na pompie. Dla tych, którzy chcą 4K ultra i komputera, który robi wrażenie.',
  },
  perun: {
    title: 'Najmocniejszy komputer, jaki składamy',
    body: 'RTX 5090 z 32 GB pamięci, 64 GB RAM i 2 TB na bibliotekę. Gry w 4K na maksimum, a przy okazji montaż wideo, praca z AI i streaming naraz.',
  },
}

// New columns are filled before NOT NULL: a build missing from the table (none today) gets its
// name as the title and an empty body, to be written in the panel. The folk-tale texts stay in the
// database, only optional now (hidden in the panel).
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "builds" ALTER COLUMN "creature_short" DROP NOT NULL;
  ALTER TABLE "builds" ALTER COLUMN "creature_myth" DROP NOT NULL;
  ALTER TABLE "builds" ALTER COLUMN "creature_legend" DROP NOT NULL;
  ALTER TABLE "builds" ALTER COLUMN "creature_legend_source_title" DROP NOT NULL;
  ALTER TABLE "builds" ALTER COLUMN "creature_legend_source_url" DROP NOT NULL;
  ALTER TABLE "builds" ADD COLUMN "highlight_title" varchar;
  ALTER TABLE "builds" ADD COLUMN "highlight_body" varchar;`)
  for (const [slug, { title, body }] of Object.entries(HIGHLIGHTS)) {
    await db.execute(
      sql`UPDATE "builds" SET "highlight_title" = ${title}, "highlight_body" = ${body} WHERE "slug" = ${slug}`,
    )
  }
  await db.execute(sql`
  UPDATE "builds" SET "highlight_title" = "name" WHERE "highlight_title" IS NULL;
  UPDATE "builds" SET "highlight_body" = '' WHERE "highlight_body" IS NULL;
  ALTER TABLE "builds" ALTER COLUMN "highlight_title" SET NOT NULL;
  ALTER TABLE "builds" ALTER COLUMN "highlight_body" SET NOT NULL;`)
}

// Builds added after `up` may have no folk-tale texts: empty strings, so NOT NULL comes back.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "builds" SET "creature_short" = '' WHERE "creature_short" IS NULL;
  UPDATE "builds" SET "creature_myth" = '' WHERE "creature_myth" IS NULL;
  UPDATE "builds" SET "creature_legend" = '' WHERE "creature_legend" IS NULL;
  UPDATE "builds" SET "creature_legend_source_title" = '' WHERE "creature_legend_source_title" IS NULL;
  UPDATE "builds" SET "creature_legend_source_url" = '' WHERE "creature_legend_source_url" IS NULL;
  ALTER TABLE "builds" ALTER COLUMN "creature_short" SET NOT NULL;
  ALTER TABLE "builds" ALTER COLUMN "creature_myth" SET NOT NULL;
  ALTER TABLE "builds" ALTER COLUMN "creature_legend" SET NOT NULL;
  ALTER TABLE "builds" ALTER COLUMN "creature_legend_source_title" SET NOT NULL;
  ALTER TABLE "builds" ALTER COLUMN "creature_legend_source_url" SET NOT NULL;
  ALTER TABLE "builds" DROP COLUMN "highlight_title";
  ALTER TABLE "builds" DROP COLUMN "highlight_body";`)
}
