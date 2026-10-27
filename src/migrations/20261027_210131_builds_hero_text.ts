import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Existing builds get an empty text first (NOT NULL would fail on filled tables); `pnpm seed`
// fills the 16 texts and the default is dropped, so new rows must set them like other fields.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "builds" ADD COLUMN "creature_hero_title" varchar DEFAULT '' NOT NULL;
  ALTER TABLE "builds" ADD COLUMN "creature_hero_text" varchar DEFAULT '' NOT NULL;
  ALTER TABLE "builds" ALTER COLUMN "creature_hero_title" DROP DEFAULT;
  ALTER TABLE "builds" ALTER COLUMN "creature_hero_text" DROP DEFAULT;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "builds" DROP COLUMN "creature_hero_title";
  ALTER TABLE "builds" DROP COLUMN "creature_hero_text";`)
}
