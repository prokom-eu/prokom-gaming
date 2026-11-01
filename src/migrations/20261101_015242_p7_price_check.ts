import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// P7: price checks through Claude (ADR-G007) — `price-checks`, `price-observations`, the global
// `price-check-settings`, the jobs `price-check` and `price-check-scheduler`, the push kind
// `price_report`. `down` deletes every report, reading and the settings (competitors' prices
// too), queued price-check jobs, and the `price_report` choice of the phones; the foreign keys of
// locked documents go before their tables (generator order fails, STAN G3).

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_price_checks_trigger" AS ENUM('manual', 'schedule');
  CREATE TYPE "public"."enum_price_checks_status" AS ENUM('running', 'done', 'failed', 'budget');
  CREATE TYPE "public"."enum_price_observations_item_type" AS ENUM('option', 'component');
  CREATE TYPE "public"."enum_price_observations_method" AS ENUM('fetch', 'search');
  CREATE TYPE "public"."enum_price_check_settings_days" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
  CREATE TYPE "public"."enum_price_check_settings_cost_method" AS ENUM('lowest', 'avg2');
  ALTER TYPE "public"."enum_push_subscriptions_kinds" ADD VALUE 'price_report';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'price-check';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'price-check-scheduler';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'price-check';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'price-check-scheduler';
  CREATE TABLE "price_checks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"trigger" "enum_price_checks_trigger" NOT NULL,
  	"status" "enum_price_checks_status" DEFAULT 'running' NOT NULL,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"finished_at" timestamp(3) with time zone,
  	"progress" numeric DEFAULT 0,
  	"step" varchar,
  	"items_total" numeric DEFAULT 0,
  	"items_found" numeric DEFAULT 0,
  	"pages_read" numeric DEFAULT 0,
  	"searches" numeric DEFAULT 0,
  	"input_tokens" numeric DEFAULT 0,
  	"output_tokens" numeric DEFAULT 0,
  	"cost_usd" numeric DEFAULT 0,
  	"summary" varchar,
  	"diff" jsonb,
  	"error" varchar,
  	"read_at" timestamp(3) with time zone,
  	"accepted_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "price_observations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"check_id" integer NOT NULL,
  	"item_type" "enum_price_observations_item_type" NOT NULL,
  	"item_code" varchar NOT NULL,
  	"component_role" varchar,
  	"url" varchar NOT NULL,
  	"shop" varchar,
  	"title" varchar,
  	"price_pln" numeric,
  	"available" boolean DEFAULT false,
  	"matched" boolean DEFAULT false,
  	"method" "enum_price_observations_method",
  	"quote" varchar,
  	"note" varchar,
  	"observed_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "price_check_settings_days" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_price_check_settings_days",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "price_check_settings_shops" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"domain" varchar NOT NULL
  );
  
  CREATE TABLE "price_check_settings_competitors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"build_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"url" varchar,
  	"price" numeric NOT NULL,
  	"checked_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "price_check_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hour" numeric DEFAULT 6 NOT NULL,
  	"alert_min_margin" boolean DEFAULT true,
  	"alert_unavailable" boolean DEFAULT true,
  	"alert_change_pct" numeric DEFAULT 0.05 NOT NULL,
  	"cost_method" "enum_price_check_settings_cost_method" DEFAULT 'lowest' NOT NULL,
  	"outlier_pct" numeric DEFAULT 0.25 NOT NULL,
  	"monthly_budget_usd" numeric DEFAULT 20 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "price_checks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "price_observations_id" integer;
  ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_check_id_price_checks_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."price_checks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "price_check_settings_days" ADD CONSTRAINT "price_check_settings_days_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."price_check_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "price_check_settings_shops" ADD CONSTRAINT "price_check_settings_shops_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."price_check_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "price_check_settings_competitors" ADD CONSTRAINT "price_check_settings_competitors_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "price_check_settings_competitors" ADD CONSTRAINT "price_check_settings_competitors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."price_check_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "price_checks_status_idx" ON "price_checks" USING btree ("status");
  CREATE INDEX "price_checks_started_at_idx" ON "price_checks" USING btree ("started_at");
  CREATE INDEX "price_checks_updated_at_idx" ON "price_checks" USING btree ("updated_at");
  CREATE INDEX "price_checks_created_at_idx" ON "price_checks" USING btree ("created_at");
  CREATE INDEX "price_observations_check_idx" ON "price_observations" USING btree ("check_id");
  CREATE INDEX "price_observations_item_code_idx" ON "price_observations" USING btree ("item_code");
  CREATE INDEX "price_observations_updated_at_idx" ON "price_observations" USING btree ("updated_at");
  CREATE INDEX "price_observations_created_at_idx" ON "price_observations" USING btree ("created_at");
  CREATE INDEX "price_check_settings_days_order_idx" ON "price_check_settings_days" USING btree ("order");
  CREATE INDEX "price_check_settings_days_parent_idx" ON "price_check_settings_days" USING btree ("parent_id");
  CREATE INDEX "price_check_settings_shops_order_idx" ON "price_check_settings_shops" USING btree ("_order");
  CREATE INDEX "price_check_settings_shops_parent_id_idx" ON "price_check_settings_shops" USING btree ("_parent_id");
  CREATE INDEX "price_check_settings_competitors_order_idx" ON "price_check_settings_competitors" USING btree ("_order");
  CREATE INDEX "price_check_settings_competitors_parent_id_idx" ON "price_check_settings_competitors" USING btree ("_parent_id");
  CREATE INDEX "price_check_settings_competitors_build_idx" ON "price_check_settings_competitors" USING btree ("build_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_price_checks_fk" FOREIGN KEY ("price_checks_id") REFERENCES "public"."price_checks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_price_observations_fk" FOREIGN KEY ("price_observations_id") REFERENCES "public"."price_observations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_price_checks_id_idx" ON "payload_locked_documents_rels" USING btree ("price_checks_id");
  CREATE INDEX "payload_locked_documents_rels_price_observations_id_idx" ON "payload_locked_documents_rels" USING btree ("price_observations_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_price_checks_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_price_observations_fk";
  DELETE FROM "payload_jobs_log" WHERE "task_slug" IN ('price-check', 'price-check-scheduler');
  DELETE FROM "payload_jobs" WHERE "task_slug" IN ('price-check', 'price-check-scheduler');
  DELETE FROM "push_subscriptions_kinds" WHERE "value" = 'price_report';
  ALTER TABLE "price_checks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "price_observations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "price_check_settings_days" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "price_check_settings_shops" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "price_check_settings_competitors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "price_check_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "price_checks" CASCADE;
  DROP TABLE "price_observations" CASCADE;
  DROP TABLE "price_check_settings_days" CASCADE;
  DROP TABLE "price_check_settings_shops" CASCADE;
  DROP TABLE "price_check_settings_competitors" CASCADE;
  DROP TABLE "price_check_settings" CASCADE;
  ALTER TABLE "push_subscriptions_kinds" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_push_subscriptions_kinds";
  CREATE TYPE "public"."enum_push_subscriptions_kinds" AS ENUM('inquiry_new', 'inquiry_reply', 'inquiry_sla', 'margin_alarm');
  ALTER TABLE "push_subscriptions_kinds" ALTER COLUMN "value" SET DATA TYPE "public"."enum_push_subscriptions_kinds" USING "value"::"public"."enum_push_subscriptions_kinds";
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'margin-alarm', 'inquiry-retention', 'inquiry-sla', 'mail-intake', 'notify-send');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'margin-alarm', 'inquiry-retention', 'inquiry-sla', 'mail-intake', 'notify-send');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_price_checks_id_idx";
  DROP INDEX "payload_locked_documents_rels_price_observations_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "price_checks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "price_observations_id";
  DROP TYPE "public"."enum_price_checks_trigger";
  DROP TYPE "public"."enum_price_checks_status";
  DROP TYPE "public"."enum_price_observations_item_type";
  DROP TYPE "public"."enum_price_observations_method";
  DROP TYPE "public"."enum_price_check_settings_days";
  DROP TYPE "public"."enum_price_check_settings_cost_method";`)
}
