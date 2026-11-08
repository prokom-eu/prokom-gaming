import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_inquiries_extras" AS ENUM('monitor', 'mouse_keyboard', 'headphones', 'office', 'extra_drive');
  CREATE TYPE "public"."enum_inquiries_type" AS ENUM('build', 'config', 'advice', 'custom_list', 'compare', 'contact', 'voucher', 'ready');
  CREATE TYPE "public"."enum_inquiries_status" AS ENUM('new', 'in_progress', 'offer_sent', 'won', 'lost', 'closed');
  CREATE TYPE "public"."enum_inquiries_for_whom" AS ENUM('self', 'child', 'gift');
  CREATE TYPE "public"."enum_inquiries_budget" AS ENUM('upto_6k', '6k_9k', '9k_14k', 'over_14k', 'unsure');
  CREATE TYPE "public"."enum_inquiries_monitor" AS ENUM('fullhd', 'qhd', 'uhd', 'unsure');
  CREATE TYPE "public"."enum_inquiries_refresh" AS ENUM('60', '144', '240', 'unsure');
  CREATE TYPE "public"."enum_inquiries_case_color" AS ENUM('black', 'white', 'any');
  CREATE TYPE "public"."enum_inquiries_lighting" AS ENUM('colorful', 'subtle', 'none');
  CREATE TYPE "public"."enum_inquiries_preferred_contact" AS ENUM('email', 'phone');
  CREATE TYPE "public"."enum_inquiries_pickup" AS ENUM('courier', 'rabka', 'zakopane');
  CREATE TYPE "public"."enum_inquiries_invoice" AS ENUM('private', 'company');
  CREATE TYPE "public"."enum_inquiry_deletions_reason" AS ENUM('request', 'retention');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'inquiry-retention';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'inquiry-retention';
  CREATE TABLE "inquiries_extras" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_inquiries_extras",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "inquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"type" "enum_inquiries_type" NOT NULL,
  	"status" "enum_inquiries_status" DEFAULT 'new' NOT NULL,
  	"status_changed_at" timestamp(3) with time zone,
  	"build_id" integer,
  	"config_level" varchar,
  	"config_case" varchar,
  	"config_cooler" varchar,
  	"config_ram" varchar,
  	"config_ssd" varchar,
  	"price_at_inquiry" numeric,
  	"price_batch" numeric,
  	"for_whom" "enum_inquiries_for_whom",
  	"budget" "enum_inquiries_budget",
  	"custom_list" varchar,
  	"other_games" varchar,
  	"monitor" "enum_inquiries_monitor",
  	"refresh" "enum_inquiries_refresh",
  	"case_color" "enum_inquiries_case_color",
  	"lighting" "enum_inquiries_lighting",
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"preferred_contact" "enum_inquiries_preferred_contact",
  	"pickup" "enum_inquiries_pickup",
  	"invoice" "enum_inquiries_invoice",
  	"nip" varchar,
  	"message" varchar,
  	"consent_accepted" boolean,
  	"consent_clause_version" varchar,
  	"consent_accepted_at" timestamp(3) with time zone,
  	"marketing_consent" boolean DEFAULT false,
  	"source_url" varchar,
  	"source_utm_source" varchar,
  	"source_utm_medium" varchar,
  	"source_utm_campaign" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "inquiries_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"games_id" integer
  );
  
  CREATE TABLE "inquiry_deletions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"inquiry_id" numeric NOT NULL,
  	"number" varchar,
  	"reason" "enum_inquiry_deletions_reason" NOT NULL,
  	"deleted_by_id" integer,
  	"deleted_by_email" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_jobs" ADD COLUMN "meta" jsonb;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "inquiries_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "inquiry_deletions_id" integer;
  ALTER TABLE "inquiries_extras" ADD CONSTRAINT "inquiries_extras_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inquiries_rels" ADD CONSTRAINT "inquiries_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "inquiries_rels" ADD CONSTRAINT "inquiries_rels_games_fk" FOREIGN KEY ("games_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "inquiry_deletions" ADD CONSTRAINT "inquiry_deletions_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "inquiries_extras_order_idx" ON "inquiries_extras" USING btree ("order");
  CREATE INDEX "inquiries_extras_parent_idx" ON "inquiries_extras" USING btree ("parent_id");
  CREATE UNIQUE INDEX "inquiries_number_idx" ON "inquiries" USING btree ("number");
  CREATE INDEX "inquiries_status_idx" ON "inquiries" USING btree ("status");
  CREATE INDEX "inquiries_build_idx" ON "inquiries" USING btree ("build_id");
  CREATE INDEX "inquiries_updated_at_idx" ON "inquiries" USING btree ("updated_at");
  CREATE INDEX "inquiries_created_at_idx" ON "inquiries" USING btree ("created_at");
  CREATE INDEX "inquiries_rels_order_idx" ON "inquiries_rels" USING btree ("order");
  CREATE INDEX "inquiries_rels_parent_idx" ON "inquiries_rels" USING btree ("parent_id");
  CREATE INDEX "inquiries_rels_path_idx" ON "inquiries_rels" USING btree ("path");
  CREATE INDEX "inquiries_rels_games_id_idx" ON "inquiries_rels" USING btree ("games_id");
  CREATE INDEX "inquiry_deletions_deleted_by_idx" ON "inquiry_deletions" USING btree ("deleted_by_id");
  CREATE INDEX "inquiry_deletions_updated_at_idx" ON "inquiry_deletions" USING btree ("updated_at");
  CREATE INDEX "inquiry_deletions_created_at_idx" ON "inquiry_deletions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inquiries_fk" FOREIGN KEY ("inquiries_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inquiry_deletions_fk" FOREIGN KEY ("inquiry_deletions_id") REFERENCES "public"."inquiry_deletions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_inquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("inquiries_id");
  CREATE INDEX "payload_locked_documents_rels_inquiry_deletions_id_idx" ON "payload_locked_documents_rels" USING btree ("inquiry_deletions_id");`)

  // Written by hand: yearly counter of inquiry numbers PKG-RRRR-NNNN (lib/inquiry/number).
  // Outside the Payload schema on purpose — no collection, no panel, no API; the upsert there
  // locks the year's row inside the insert's transaction.
  await db.execute(sql`
  CREATE TABLE "inquiry_counters" (
  	"year" integer PRIMARY KEY NOT NULL,
  	"last" integer NOT NULL CHECK ("last" > 0)
  );`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Moved by hand: the generator drops these foreign keys after their tables, and the CASCADE
  // has already removed them by then ("constraint does not exist"). Jobs of the removed task
  // go first, or recreating the task-slug enums below fails on their rows.
  await db.execute(sql`
  DROP TABLE "inquiry_counters";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_inquiries_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_inquiry_deletions_fk";
  DELETE FROM "payload_jobs_log" WHERE "task_slug" = 'inquiry-retention';
  DELETE FROM "payload_jobs" WHERE "task_slug" = 'inquiry-retention';`)
  await db.execute(sql`
   ALTER TABLE "inquiries_extras" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "inquiries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "inquiries_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "inquiry_deletions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_stats" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "inquiries_extras" CASCADE;
  DROP TABLE "inquiries" CASCADE;
  DROP TABLE "inquiries_rels" CASCADE;
  DROP TABLE "inquiry_deletions" CASCADE;
  DROP TABLE "payload_jobs_stats" CASCADE;
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'margin-alarm');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'margin-alarm');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_inquiries_id_idx";
  DROP INDEX "payload_locked_documents_rels_inquiry_deletions_id_idx";
  ALTER TABLE "payload_jobs" DROP COLUMN "meta";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "inquiries_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "inquiry_deletions_id";
  DROP TYPE "public"."enum_inquiries_extras";
  DROP TYPE "public"."enum_inquiries_type";
  DROP TYPE "public"."enum_inquiries_status";
  DROP TYPE "public"."enum_inquiries_for_whom";
  DROP TYPE "public"."enum_inquiries_budget";
  DROP TYPE "public"."enum_inquiries_monitor";
  DROP TYPE "public"."enum_inquiries_refresh";
  DROP TYPE "public"."enum_inquiries_case_color";
  DROP TYPE "public"."enum_inquiries_lighting";
  DROP TYPE "public"."enum_inquiries_preferred_contact";
  DROP TYPE "public"."enum_inquiries_pickup";
  DROP TYPE "public"."enum_inquiries_invoice";
  DROP TYPE "public"."enum_inquiry_deletions_reason";`)
}
