import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// P6: status of a build (panel spec §9). Every existing build stays on the site (`published`).
// `down` drops the status: hidden builds come back on the site.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_builds_offer_status" AS ENUM('published', 'draft', 'hidden');
  ALTER TABLE "builds" ADD COLUMN "offer_status" "enum_builds_offer_status" DEFAULT 'published' NOT NULL;
  CREATE INDEX "builds_offer_status_idx" ON "builds" USING btree ("offer_status");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "builds_offer_status_idx";
  ALTER TABLE "builds" DROP COLUMN "offer_status";
  DROP TYPE "public"."enum_builds_offer_status";`)
}
