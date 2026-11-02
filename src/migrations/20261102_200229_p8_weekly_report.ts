import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'weekly-report';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'weekly-report';
  ALTER TABLE "price_check_settings" ADD COLUMN "weekly_prices" boolean DEFAULT true;
  ALTER TABLE "price_check_settings" ADD COLUMN "weekly_traffic" boolean DEFAULT true;
  ALTER TABLE "price_check_settings" ADD COLUMN "weekly_report_sent_at" timestamp(3) with time zone;`)
}

// Down: the report switches and the date of the last report go; queued reports are deleted first
// (the enum value they use disappears).
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DELETE FROM "payload_jobs_log" WHERE "task_slug" = 'weekly-report';
  DELETE FROM "payload_jobs" WHERE "task_slug" = 'weekly-report';
   ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'margin-alarm', 'inquiry-retention', 'inquiry-sla', 'mail-intake', 'notify-send', 'price-check', 'price-check-scheduler');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'margin-alarm', 'inquiry-retention', 'inquiry-sla', 'mail-intake', 'notify-send', 'price-check', 'price-check-scheduler');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  ALTER TABLE "price_check_settings" DROP COLUMN "weekly_prices";
  ALTER TABLE "price_check_settings" DROP COLUMN "weekly_traffic";
  ALTER TABLE "price_check_settings" DROP COLUMN "weekly_report_sent_at";`)
}
