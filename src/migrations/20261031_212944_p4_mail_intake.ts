import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_mail_intake_unmatched_status" AS ENUM('new', 'attached', 'rejected');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'mail-intake';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'mail-intake';
  CREATE TABLE "mail_intake_unmatched" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar,
  	"subject" varchar,
  	"received_at" timestamp(3) with time zone NOT NULL,
  	"body" varchar NOT NULL,
  	"attachments_info" varchar,
  	"message_id" varchar,
  	"references" varchar,
  	"status" "enum_mail_intake_unmatched_status" DEFAULT 'new' NOT NULL,
  	"attached_to_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "mail_intake_state" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"last_uid" numeric DEFAULT 0,
  	"uid_validity" varchar,
  	"last_run_at" timestamp(3) with time zone,
  	"last_ok_at" timestamp(3) with time zone,
  	"error_count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "inquiry_messages" ADD COLUMN "other_sender" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "mail_intake_unmatched_id" integer;
  ALTER TABLE "mail_intake_unmatched" ADD CONSTRAINT "mail_intake_unmatched_attached_to_id_inquiries_id_fk" FOREIGN KEY ("attached_to_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "mail_intake_unmatched_received_at_idx" ON "mail_intake_unmatched" USING btree ("received_at");
  CREATE INDEX "mail_intake_unmatched_message_id_idx" ON "mail_intake_unmatched" USING btree ("message_id");
  CREATE INDEX "mail_intake_unmatched_status_idx" ON "mail_intake_unmatched" USING btree ("status");
  CREATE INDEX "mail_intake_unmatched_attached_to_idx" ON "mail_intake_unmatched" USING btree ("attached_to_id");
  CREATE INDEX "mail_intake_unmatched_updated_at_idx" ON "mail_intake_unmatched" USING btree ("updated_at");
  CREATE INDEX "mail_intake_unmatched_created_at_idx" ON "mail_intake_unmatched" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_mail_intake_unmatched_fk" FOREIGN KEY ("mail_intake_unmatched_id") REFERENCES "public"."mail_intake_unmatched"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_mail_intake_unmatched_id_idx" ON "payload_locked_documents_rels" USING btree ("mail_intake_unmatched_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Moved by hand (as in `p3_inquiry_thread`): the generator drops the foreign key after its
  // table, and the CASCADE has already removed it by then. Jobs of the removed task go first, or
  // recreating the task-slug enums below fails on their rows. `down` deletes unmatched mail, the
  // intake position and the „other sender” marks — copy the tables before running it on a server.
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_mail_intake_unmatched_fk";
  DELETE FROM "payload_jobs_log" WHERE "task_slug" = 'mail-intake';
  DELETE FROM "payload_jobs" WHERE "task_slug" = 'mail-intake';
  ALTER TABLE "mail_intake_unmatched" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "mail_intake_state" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "mail_intake_unmatched" CASCADE;
  DROP TABLE "mail_intake_state" CASCADE;
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'margin-alarm', 'inquiry-retention', 'inquiry-sla');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'margin-alarm', 'inquiry-retention', 'inquiry-sla');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_mail_intake_unmatched_id_idx";
  ALTER TABLE "inquiry_messages" DROP COLUMN "other_sender";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "mail_intake_unmatched_id";
  DROP TYPE "public"."enum_mail_intake_unmatched_status";`)
}
