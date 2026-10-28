import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_faq_group" ADD VALUE 'build';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // The old enum has no 'build': its rows (the nine build page questions, from the seed) must go
  // first, or the cast back fails. `pnpm seed` writes them again after `up`.
  await db.execute(sql`
   DELETE FROM "faq" WHERE "group" = 'build';
   ALTER TABLE "faq" ALTER COLUMN "group" SET DATA TYPE text;
  DROP TYPE "public"."enum_faq_group";
  CREATE TYPE "public"."enum_faq_group" AS ENUM('purchase', 'delivery', 'returns', 'tech', 'parents', 'home');
  ALTER TABLE "faq" ALTER COLUMN "group" SET DATA TYPE "public"."enum_faq_group" USING "group"::"public"."enum_faq_group";`)
}
