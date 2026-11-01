import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "mail_settings" ADD COLUMN "stage_email" boolean DEFAULT true;
  ALTER TABLE "mail_settings" ADD COLUMN "workshop_strip" boolean DEFAULT true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "mail_settings" DROP COLUMN "stage_email";
  ALTER TABLE "mail_settings" DROP COLUMN "workshop_strip";`)
}
