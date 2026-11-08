import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_inquiries_light_color" AS ENUM('piorun', 'krew', 'las', 'czary', 'lod', 'ogien');
  ALTER TABLE "inquiries" ADD COLUMN "light_color" "enum_inquiries_light_color";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "inquiries" DROP COLUMN "light_color";
  DROP TYPE "public"."enum_inquiries_light_color";`)
}
