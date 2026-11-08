import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_reply_templates_kind" AS ENUM('reply', 'offer', 'stage');
  CREATE TYPE "public"."enum_inquiry_messages_direction" AS ENUM('in', 'out', 'note', 'system');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'inquiry-sla';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'inquiry-sla';
  CREATE TABLE "reply_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"kind" "enum_reply_templates_kind" DEFAULT 'reply' NOT NULL,
  	"order" numeric DEFAULT 0 NOT NULL,
  	"active" boolean DEFAULT true,
  	"body" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "inquiry_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"inquiry_id" integer NOT NULL,
  	"direction" "enum_inquiry_messages_direction" NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"subject" varchar,
  	"body" varchar NOT NULL,
  	"author_id" integer,
  	"message_id" varchar,
  	"in_reply_to" varchar,
  	"attachments_info" varchar,
  	"template_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "mail_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reply_hours_from" numeric DEFAULT 8 NOT NULL,
  	"reply_hours_to" numeric DEFAULT 22 NOT NULL,
  	"reply_sla_minutes" numeric DEFAULT 60 NOT NULL,
  	"reply_alarm_minutes" numeric DEFAULT 45 NOT NULL,
  	"signature" varchar DEFAULT 'Krystian · PRO-KOM Gaming
Rabka-Zdrój, ul. Orkana 16B · +48 18 267 65 11' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "inquiries" ADD COLUMN "last_activity_at" timestamp(3) with time zone;
  ALTER TABLE "inquiries" ADD COLUMN "sla_alerted_at" timestamp(3) with time zone;
  ALTER TABLE "inquiries" ADD COLUMN "unread_count" numeric DEFAULT 0;
  ALTER TABLE "inquiries" ADD COLUMN "confirmation_message_id" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "reply_templates_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "inquiry_messages_id" integer;
  ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_template_id_reply_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."reply_templates"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "reply_templates_name_idx" ON "reply_templates" USING btree ("name");
  CREATE INDEX "reply_templates_updated_at_idx" ON "reply_templates" USING btree ("updated_at");
  CREATE INDEX "reply_templates_created_at_idx" ON "reply_templates" USING btree ("created_at");
  CREATE INDEX "inquiry_messages_inquiry_idx" ON "inquiry_messages" USING btree ("inquiry_id");
  CREATE INDEX "inquiry_messages_author_idx" ON "inquiry_messages" USING btree ("author_id");
  CREATE INDEX "inquiry_messages_message_id_idx" ON "inquiry_messages" USING btree ("message_id");
  CREATE INDEX "inquiry_messages_template_idx" ON "inquiry_messages" USING btree ("template_id");
  CREATE INDEX "inquiry_messages_updated_at_idx" ON "inquiry_messages" USING btree ("updated_at");
  CREATE INDEX "inquiry_messages_created_at_idx" ON "inquiry_messages" USING btree ("created_at");
  CREATE INDEX "inquiry_at_idx" ON "inquiry_messages" USING btree ("inquiry_id","at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reply_templates_fk" FOREIGN KEY ("reply_templates_id") REFERENCES "public"."reply_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inquiry_messages_fk" FOREIGN KEY ("inquiry_messages_id") REFERENCES "public"."inquiry_messages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "inquiries_confirmation_message_id_idx" ON "inquiries" USING btree ("confirmation_message_id");
  CREATE INDEX "payload_locked_documents_rels_reply_templates_id_idx" ON "payload_locked_documents_rels" USING btree ("reply_templates_id");
  CREATE INDEX "payload_locked_documents_rels_inquiry_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("inquiry_messages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Moved by hand (as in `inquiries`): the generator drops these foreign keys after their tables,
  // and the CASCADE has already removed them by then. Jobs of the removed task go first, or
  // recreating the task-slug enums below fails on their rows. `down` deletes every thread,
  // template and the mail settings — copy the tables before running it on a server.
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_reply_templates_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_inquiry_messages_fk";
  DELETE FROM "payload_jobs_log" WHERE "task_slug" = 'inquiry-sla';
  DELETE FROM "payload_jobs" WHERE "task_slug" = 'inquiry-sla';`)
  await db.execute(sql`
   ALTER TABLE "reply_templates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "inquiry_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "mail_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "reply_templates" CASCADE;
  DROP TABLE "inquiry_messages" CASCADE;
  DROP TABLE "mail_settings" CASCADE;
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'margin-alarm', 'inquiry-retention');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'margin-alarm', 'inquiry-retention');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "inquiries_confirmation_message_id_idx";
  DROP INDEX "payload_locked_documents_rels_reply_templates_id_idx";
  DROP INDEX "payload_locked_documents_rels_inquiry_messages_id_idx";
  ALTER TABLE "inquiries" DROP COLUMN "last_activity_at";
  ALTER TABLE "inquiries" DROP COLUMN "sla_alerted_at";
  ALTER TABLE "inquiries" DROP COLUMN "unread_count";
  ALTER TABLE "inquiries" DROP COLUMN "confirmation_message_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "reply_templates_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "inquiry_messages_id";
  DROP TYPE "public"."enum_reply_templates_kind";
  DROP TYPE "public"."enum_inquiry_messages_direction";`)
}
