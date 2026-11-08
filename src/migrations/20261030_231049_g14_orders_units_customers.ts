import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'serwis');
  CREATE TYPE "public"."enum_orders_checklist_key" AS ENUM('parts', 'bios', 'stress', 'temps', 'fps', 'photos', 'certificate', 'packed');
  CREATE TYPE "public"."enum_orders_stage_history_stage" AS ENUM('offer', 'paid', 'parts', 'assembly', 'test', 'metric_ready', 'shipped', 'delivered');
  CREATE TYPE "public"."enum_orders_stage" AS ENUM('offer', 'paid', 'parts', 'assembly', 'test', 'metric_ready', 'shipped', 'delivered');
  CREATE TYPE "public"."enum_units_parts_role" AS ENUM('gpu', 'cpu', 'motherboard', 'ram', 'ssd', 'psu', 'case', 'cooler');
  CREATE TYPE "public"."enum_units_fps_setup_resolution" AS ENUM('fullhd', 'qhd', 'uhd');
  CREATE TYPE "public"."enum_tickets_history_status" AS ENUM('new', 'in_progress', 'resolved', 'closed');
  CREATE TYPE "public"."enum_tickets_category" AS ENUM('stutter', 'no_power', 'noise_heat', 'other');
  CREATE TYPE "public"."enum_tickets_status" AS ENUM('new', 'in_progress', 'resolved', 'closed');
  CREATE TABLE "customers_saved_configs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"k" varchar NOT NULL,
  	"light" varchar,
  	"saved_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar,
  	"consent_clause_version" varchar,
  	"consent_accepted_at" timestamp(3) with time zone,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "customers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"builds_id" integer
  );
  
  CREATE TABLE "orders_checklist" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" "enum_orders_checklist_key" NOT NULL,
  	"done" boolean DEFAULT false,
  	"done_at" timestamp(3) with time zone,
  	"done_by_id" integer
  );
  
  CREATE TABLE "orders_stage_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"stage" "enum_orders_stage_history_stage" NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"by_id" integer
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"stage" "enum_orders_stage" DEFAULT 'offer' NOT NULL,
  	"due_date" timestamp(3) with time zone,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"customer_id" integer,
  	"inquiry_id" integer,
  	"build_id" integer,
  	"price" numeric,
  	"unit_id" integer,
  	"tracking_number" varchar,
  	"config_level" varchar,
  	"config_case" varchar,
  	"config_cooler" varchar,
  	"config_ram" varchar,
  	"config_ssd" varchar,
  	"workshop_note" varchar,
  	"stage_changed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "units_fps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"game_id" integer NOT NULL,
  	"fps" numeric NOT NULL
  );
  
  CREATE TABLE "units_parts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role" "enum_units_parts_role" NOT NULL,
  	"label" varchar NOT NULL,
  	"manufacturer" varchar,
  	"model" varchar,
  	"serial" varchar,
  	"warranty_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "units" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar,
  	"build_id" integer NOT NULL,
  	"number" numeric,
  	"published" boolean DEFAULT false,
  	"serial" varchar,
  	"tested_at" timestamp(3) with time zone,
  	"warranty_until" timestamp(3) with time zone,
  	"assembled_by" varchar,
  	"email" varchar,
  	"customer_id" integer,
  	"stress_test_minutes" numeric,
  	"stress_test_errors" numeric,
  	"temps_cpu_max" numeric,
  	"temps_gpu_max" numeric,
  	"fps_setup_resolution" "enum_units_fps_setup_resolution" DEFAULT 'qhd',
  	"fps_setup_settings" varchar DEFAULT 'wysokie',
  	"fps_setup_driver" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tickets_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"status" "enum_tickets_history_status" NOT NULL,
  	"by_id" integer
  );
  
  CREATE TABLE "tickets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"unit_id" integer NOT NULL,
  	"category" "enum_tickets_category" NOT NULL,
  	"status" "enum_tickets_status" DEFAULT 'new' NOT NULL,
  	"description" varchar NOT NULL,
  	"remote_help_consent" boolean DEFAULT false,
  	"email" varchar NOT NULL,
  	"customer_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'serwis' NOT NULL;
  -- Accounts from before roles keep doing everything (panel spec §15); new ones default to serwis.
  UPDATE "users" SET "role" = 'admin';
  ALTER TABLE "fps_results" ADD COLUMN "unit_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "customers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "orders_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "units_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tickets_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "customers_id" integer;
  ALTER TABLE "customers_saved_configs" ADD CONSTRAINT "customers_saved_configs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_rels" ADD CONSTRAINT "customers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_rels" ADD CONSTRAINT "customers_rels_builds_fk" FOREIGN KEY ("builds_id") REFERENCES "public"."builds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_checklist" ADD CONSTRAINT "orders_checklist_done_by_id_users_id_fk" FOREIGN KEY ("done_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_checklist" ADD CONSTRAINT "orders_checklist_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_stage_history" ADD CONSTRAINT "orders_stage_history_by_id_users_id_fk" FOREIGN KEY ("by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_stage_history" ADD CONSTRAINT "orders_stage_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "units_fps" ADD CONSTRAINT "units_fps_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "units_fps" ADD CONSTRAINT "units_fps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "units_parts" ADD CONSTRAINT "units_parts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "units" ADD CONSTRAINT "units_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "units" ADD CONSTRAINT "units_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tickets_history" ADD CONSTRAINT "tickets_history_by_id_users_id_fk" FOREIGN KEY ("by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tickets_history" ADD CONSTRAINT "tickets_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tickets" ADD CONSTRAINT "tickets_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "customers_saved_configs_order_idx" ON "customers_saved_configs" USING btree ("_order");
  CREATE INDEX "customers_saved_configs_parent_id_idx" ON "customers_saved_configs" USING btree ("_parent_id");
  CREATE INDEX "customers_sessions_order_idx" ON "customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "customers_sessions" USING btree ("_parent_id");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE INDEX "customers_rels_order_idx" ON "customers_rels" USING btree ("order");
  CREATE INDEX "customers_rels_parent_idx" ON "customers_rels" USING btree ("parent_id");
  CREATE INDEX "customers_rels_path_idx" ON "customers_rels" USING btree ("path");
  CREATE INDEX "customers_rels_builds_id_idx" ON "customers_rels" USING btree ("builds_id");
  CREATE INDEX "orders_checklist_order_idx" ON "orders_checklist" USING btree ("_order");
  CREATE INDEX "orders_checklist_parent_id_idx" ON "orders_checklist" USING btree ("_parent_id");
  CREATE INDEX "orders_checklist_done_by_idx" ON "orders_checklist" USING btree ("done_by_id");
  CREATE INDEX "orders_stage_history_order_idx" ON "orders_stage_history" USING btree ("_order");
  CREATE INDEX "orders_stage_history_parent_id_idx" ON "orders_stage_history" USING btree ("_parent_id");
  CREATE INDEX "orders_stage_history_by_idx" ON "orders_stage_history" USING btree ("by_id");
  CREATE UNIQUE INDEX "orders_number_idx" ON "orders" USING btree ("number");
  CREATE INDEX "orders_email_idx" ON "orders" USING btree ("email");
  CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX "orders_inquiry_idx" ON "orders" USING btree ("inquiry_id");
  CREATE INDEX "orders_build_idx" ON "orders" USING btree ("build_id");
  CREATE INDEX "orders_unit_idx" ON "orders" USING btree ("unit_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "units_fps_order_idx" ON "units_fps" USING btree ("_order");
  CREATE INDEX "units_fps_parent_id_idx" ON "units_fps" USING btree ("_parent_id");
  CREATE INDEX "units_fps_game_idx" ON "units_fps" USING btree ("game_id");
  CREATE INDEX "units_parts_order_idx" ON "units_parts" USING btree ("_order");
  CREATE INDEX "units_parts_parent_id_idx" ON "units_parts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "units_code_idx" ON "units" USING btree ("code");
  CREATE INDEX "units_build_idx" ON "units" USING btree ("build_id");
  CREATE INDEX "units_email_idx" ON "units" USING btree ("email");
  CREATE INDEX "units_customer_idx" ON "units" USING btree ("customer_id");
  CREATE INDEX "units_updated_at_idx" ON "units" USING btree ("updated_at");
  CREATE INDEX "units_created_at_idx" ON "units" USING btree ("created_at");
  CREATE UNIQUE INDEX "build_number_idx" ON "units" USING btree ("build_id","number");
  CREATE INDEX "tickets_history_order_idx" ON "tickets_history" USING btree ("_order");
  CREATE INDEX "tickets_history_parent_id_idx" ON "tickets_history" USING btree ("_parent_id");
  CREATE INDEX "tickets_history_by_idx" ON "tickets_history" USING btree ("by_id");
  CREATE INDEX "tickets_unit_idx" ON "tickets" USING btree ("unit_id");
  CREATE INDEX "tickets_email_idx" ON "tickets" USING btree ("email");
  CREATE INDEX "tickets_customer_idx" ON "tickets" USING btree ("customer_id");
  CREATE INDEX "tickets_updated_at_idx" ON "tickets" USING btree ("updated_at");
  CREATE INDEX "tickets_created_at_idx" ON "tickets" USING btree ("created_at");
  ALTER TABLE "fps_results" ADD CONSTRAINT "fps_results_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_units_fk" FOREIGN KEY ("units_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tickets_fk" FOREIGN KEY ("tickets_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "fps_results_unit_idx" ON "fps_results" USING btree ("unit_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_units_id_idx" ON "payload_locked_documents_rels" USING btree ("units_id");
  CREATE INDEX "payload_locked_documents_rels_tickets_id_idx" ON "payload_locked_documents_rels" USING btree ("tickets_id");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");
  -- Yearly counter of order numbers Z-RRRR-NNNN (lib/inquiry/number.ts), like inquiry_counters.
  CREATE TABLE "order_counters" (
  	"year" integer PRIMARY KEY NOT NULL,
  	"last" integer NOT NULL CHECK ("last" > 0)
  );
  -- One customer = one normalised e-mail (panel spec §6): inquiries saved before G14 were only trimmed.
  UPDATE "inquiries" SET "email" = lower("email") WHERE "email" <> lower("email");`)
}

/**
 * Down drops customer accounts, orders, units (certificates) and tickets with their data, and the
 * roles (everyone is back to "panel = everything"). Inquiry e-mails stay lower case — the original
 * casing is not kept anywhere. Before migrate:down on a server: a copy of these tables.
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers_saved_configs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_checklist" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_stage_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "units_fps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "units_parts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "units" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tickets_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tickets" DISABLE ROW LEVEL SECURITY;
  -- Foreign keys first: DROP TABLE … CASCADE already removes them, and a later DROP CONSTRAINT
  -- then fails with "constraint does not exist" (note from G3).
  ALTER TABLE "fps_results" DROP CONSTRAINT "fps_results_unit_id_units_id_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_customers_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_orders_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_units_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tickets_fk";
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_customers_fk";
  DROP TABLE "order_counters";
  DROP TABLE "customers_saved_configs" CASCADE;
  DROP TABLE "customers_sessions" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "customers_rels" CASCADE;
  DROP TABLE "orders_checklist" CASCADE;
  DROP TABLE "orders_stage_history" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "units_fps" CASCADE;
  DROP TABLE "units_parts" CASCADE;
  DROP TABLE "units" CASCADE;
  DROP TABLE "tickets_history" CASCADE;
  DROP TABLE "tickets" CASCADE;
  DROP INDEX "fps_results_unit_idx";
  DROP INDEX "payload_locked_documents_rels_customers_id_idx";
  DROP INDEX "payload_locked_documents_rels_orders_id_idx";
  DROP INDEX "payload_locked_documents_rels_units_id_idx";
  DROP INDEX "payload_locked_documents_rels_tickets_id_idx";
  DROP INDEX "payload_preferences_rels_customers_id_idx";
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "fps_results" DROP COLUMN "unit_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "customers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "orders_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "units_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "tickets_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "customers_id";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_orders_checklist_key";
  DROP TYPE "public"."enum_orders_stage_history_stage";
  DROP TYPE "public"."enum_orders_stage";
  DROP TYPE "public"."enum_units_parts_role";
  DROP TYPE "public"."enum_units_fps_setup_resolution";
  DROP TYPE "public"."enum_tickets_history_status";
  DROP TYPE "public"."enum_tickets_category";
  DROP TYPE "public"."enum_tickets_status";`)
}
