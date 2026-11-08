import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_options_type" AS ENUM('case', 'cooler', 'ram', 'ssd');
  CREATE TYPE "public"."enum_options_aio360" AS ENUM('none', 'front', 'top_only', 'side', 'yes');
  CREATE TYPE "public"."enum_options_kind" AS ENUM('air', 'aio360');
  CREATE TYPE "public"."enum_options_color" AS ENUM('czarny', 'szary', 'biały');
  CREATE TYPE "public"."enum_options_ram_type" AS ENUM('DDR4', 'DDR5');
  CREATE TYPE "public"."enum_power_levels_monitor_filters" AS ENUM('fullhd', 'qhd', 'uhd');
  CREATE TYPE "public"."enum_power_levels_components_role" AS ENUM('cpu', 'gpu', 'mobo', 'psu');
  CREATE TYPE "public"."enum_power_levels_target_resolution" AS ENUM('fullhd', 'qhd', 'uhd');
  CREATE TYPE "public"."enum_power_levels_variant" AS ENUM('GeForce', 'Radeon', 'Intel', 'biały GeForce', 'biały Radeon', 'premium');
  CREATE TYPE "public"."enum_power_levels_platform" AS ENUM('AM4', 'AM5', 'LGA1700', 'LGA1851');
  CREATE TYPE "public"."enum_power_levels_ram_type" AS ENUM('DDR4', 'DDR5');
  CREATE TYPE "public"."enum_power_levels_color" AS ENUM('czarny', 'biały');
  CREATE TYPE "public"."enum_power_levels_markup_class" AS ENUM('fullhd', 'qhd', 'uhd', 'flagship');
  CREATE TYPE "public"."enum_builds_creature_shell" AS ENUM('dark', 'white');
  CREATE TYPE "public"."enum_published_prices_item_type" AS ENUM('level', 'option', 'service', 'level_from');
  CREATE TYPE "public"."enum_price_history_item_type" AS ENUM('level', 'option', 'service', 'level_from');
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "options" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_options_type" NOT NULL,
  	"code" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"public_label" varchar NOT NULL,
  	"internal_model" varchar NOT NULL,
  	"ean" varchar,
  	"cost" numeric NOT NULL,
  	"image_id" integer,
  	"description" varchar,
  	"gpu_max_mm" numeric,
  	"cooler_max_mm" numeric,
  	"aio360" "enum_options_aio360",
  	"kind" "enum_options_kind",
  	"height_mm" numeric,
  	"radiator_thickness_mm" numeric,
  	"class" numeric,
  	"color" "enum_options_color",
  	"ram_type" "enum_options_ram_type",
  	"capacity_gb" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "power_levels_monitor_filters" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_power_levels_monitor_filters",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "power_levels_components" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role" "enum_power_levels_components_role" NOT NULL,
  	"public_label" varchar NOT NULL,
  	"internal_model" varchar NOT NULL,
  	"ean" varchar,
  	"cost" numeric NOT NULL
  );
  
  CREATE TABLE "power_levels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"tier" numeric NOT NULL,
  	"tier_roman" varchar NOT NULL,
  	"tier_label" varchar NOT NULL,
  	"tier_lead" boolean DEFAULT false,
  	"target_resolution" "enum_power_levels_target_resolution" NOT NULL,
  	"variant" "enum_power_levels_variant",
  	"public_label" varchar NOT NULL,
  	"platform" "enum_power_levels_platform" NOT NULL,
  	"ram_type" "enum_power_levels_ram_type" NOT NULL,
  	"color" "enum_power_levels_color" NOT NULL,
  	"gpu_length_mm" numeric NOT NULL,
  	"requires_aio" boolean DEFAULT false,
  	"upgrade_free_ram_slots" numeric,
  	"upgrade_free_m2_slots" varchar,
  	"upgrade_psu_w" numeric,
  	"upgrade_socket" varchar,
  	"upgrade_socket_note" varchar,
  	"markup_class" "enum_power_levels_markup_class" NOT NULL,
  	"markup_override" numeric,
  	"min_ram_gb" numeric NOT NULL,
  	"min_ssd_gb" numeric NOT NULL,
  	"min_cooler_class" numeric NOT NULL,
  	"min_case_class" numeric NOT NULL,
  	"lead_build_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "builds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"level_id" integer NOT NULL,
  	"case_id" integer NOT NULL,
  	"cooler_id" integer NOT NULL,
  	"ram_id" integer NOT NULL,
  	"ssd_id" integer NOT NULL,
  	"creature_key" varchar NOT NULL,
  	"creature_accusative" varchar NOT NULL,
  	"creature_genitive" varchar NOT NULL,
  	"creature_epithet" varchar NOT NULL,
  	"creature_shell" "enum_builds_creature_shell" NOT NULL,
  	"creature_biome" varchar NOT NULL,
  	"creature_look" varchar NOT NULL,
  	"creature_short" varchar NOT NULL,
  	"creature_motto" varchar NOT NULL,
  	"creature_myth" varchar NOT NULL,
  	"creature_why" varchar NOT NULL,
  	"creature_gift_title" varchar NOT NULL,
  	"creature_gift" varchar NOT NULL,
  	"creature_legend" varchar NOT NULL,
  	"creature_legend_source_title" varchar NOT NULL,
  	"creature_legend_source_url" varchar NOT NULL,
  	"internal_ref" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "builds_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "published_prices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"batch" numeric NOT NULL,
  	"item_type" "enum_published_prices_item_type" NOT NULL,
  	"item_code" varchar NOT NULL,
  	"sell_price" numeric NOT NULL,
  	"cost_at_publish" numeric,
  	"published_at" timestamp(3) with time zone NOT NULL,
  	"published_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "price_history" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"batch" numeric NOT NULL,
  	"item_type" "enum_price_history_item_type" NOT NULL,
  	"item_code" varchar NOT NULL,
  	"sell_price" numeric NOT NULL,
  	"valid_from" timestamp(3) with time zone NOT NULL,
  	"valid_to" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pricing_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"min_margin" numeric NOT NULL,
  	"publish_threshold" numeric NOT NULL,
  	"auto_publish" boolean DEFAULT false,
  	"service_cost" numeric NOT NULL,
  	"case_cooler_buffer" numeric NOT NULL,
  	"white_surcharge" numeric NOT NULL,
  	"rounding_step" numeric NOT NULL,
  	"category_markup_case" numeric NOT NULL,
  	"category_markup_cooler" numeric NOT NULL,
  	"category_markup_ram" numeric NOT NULL,
  	"category_markup_ssd" numeric NOT NULL,
  	"category_markup_service" numeric NOT NULL,
  	"level_markup_by_class_fullhd" numeric NOT NULL,
  	"level_markup_by_class_qhd" numeric NOT NULL,
  	"level_markup_by_class_uhd" numeric NOT NULL,
  	"level_markup_by_class_flagship" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"company_name" varchar NOT NULL,
  	"company_nip" varchar NOT NULL,
  	"company_address" varchar NOT NULL,
  	"salon_address" varchar,
  	"phone" varchar,
  	"email" varchar,
  	"response_time" varchar,
  	"since" varchar,
  	"offer_terms" varchar,
  	"fulfilment" varchar,
  	"next_free_slot" varchar,
  	"payment" varchar,
  	"blik_method" varchar,
  	"delivery" varchar,
  	"courier" varchar,
  	"warranty" varchar,
  	"returns" varchar,
  	"unit_test" varchar,
  	"google_rating" numeric,
  	"google_review_count" numeric,
  	"social_facebook_url" varchar,
  	"social_tiktok_url" varchar,
  	"cookie_banner_enabled" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "options_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "power_levels_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "builds_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "published_prices_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "price_history_id" integer;
  ALTER TABLE "options" ADD CONSTRAINT "options_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "power_levels_monitor_filters" ADD CONSTRAINT "power_levels_monitor_filters_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."power_levels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "power_levels_components" ADD CONSTRAINT "power_levels_components_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."power_levels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "power_levels" ADD CONSTRAINT "power_levels_lead_build_id_builds_id_fk" FOREIGN KEY ("lead_build_id") REFERENCES "public"."builds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "builds" ADD CONSTRAINT "builds_level_id_power_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."power_levels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "builds" ADD CONSTRAINT "builds_case_id_options_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "builds" ADD CONSTRAINT "builds_cooler_id_options_id_fk" FOREIGN KEY ("cooler_id") REFERENCES "public"."options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "builds" ADD CONSTRAINT "builds_ram_id_options_id_fk" FOREIGN KEY ("ram_id") REFERENCES "public"."options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "builds" ADD CONSTRAINT "builds_ssd_id_options_id_fk" FOREIGN KEY ("ssd_id") REFERENCES "public"."options"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "builds_rels" ADD CONSTRAINT "builds_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."builds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "builds_rels" ADD CONSTRAINT "builds_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "published_prices" ADD CONSTRAINT "published_prices_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "options_code_idx" ON "options" USING btree ("code");
  CREATE INDEX "options_image_idx" ON "options" USING btree ("image_id");
  CREATE INDEX "options_updated_at_idx" ON "options" USING btree ("updated_at");
  CREATE INDEX "options_created_at_idx" ON "options" USING btree ("created_at");
  CREATE INDEX "power_levels_monitor_filters_order_idx" ON "power_levels_monitor_filters" USING btree ("order");
  CREATE INDEX "power_levels_monitor_filters_parent_idx" ON "power_levels_monitor_filters" USING btree ("parent_id");
  CREATE INDEX "power_levels_components_order_idx" ON "power_levels_components" USING btree ("_order");
  CREATE INDEX "power_levels_components_parent_id_idx" ON "power_levels_components" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "power_levels_code_idx" ON "power_levels" USING btree ("code");
  CREATE INDEX "power_levels_lead_build_idx" ON "power_levels" USING btree ("lead_build_id");
  CREATE INDEX "power_levels_updated_at_idx" ON "power_levels" USING btree ("updated_at");
  CREATE INDEX "power_levels_created_at_idx" ON "power_levels" USING btree ("created_at");
  CREATE UNIQUE INDEX "builds_slug_idx" ON "builds" USING btree ("slug");
  CREATE INDEX "builds_level_idx" ON "builds" USING btree ("level_id");
  CREATE INDEX "builds_case_idx" ON "builds" USING btree ("case_id");
  CREATE INDEX "builds_cooler_idx" ON "builds" USING btree ("cooler_id");
  CREATE INDEX "builds_ram_idx" ON "builds" USING btree ("ram_id");
  CREATE INDEX "builds_ssd_idx" ON "builds" USING btree ("ssd_id");
  CREATE INDEX "builds_updated_at_idx" ON "builds" USING btree ("updated_at");
  CREATE INDEX "builds_created_at_idx" ON "builds" USING btree ("created_at");
  CREATE INDEX "builds_rels_order_idx" ON "builds_rels" USING btree ("order");
  CREATE INDEX "builds_rels_parent_idx" ON "builds_rels" USING btree ("parent_id");
  CREATE INDEX "builds_rels_path_idx" ON "builds_rels" USING btree ("path");
  CREATE INDEX "builds_rels_media_id_idx" ON "builds_rels" USING btree ("media_id");
  CREATE INDEX "published_prices_batch_idx" ON "published_prices" USING btree ("batch");
  CREATE INDEX "published_prices_published_by_idx" ON "published_prices" USING btree ("published_by_id");
  CREATE INDEX "published_prices_updated_at_idx" ON "published_prices" USING btree ("updated_at");
  CREATE INDEX "published_prices_created_at_idx" ON "published_prices" USING btree ("created_at");
  CREATE UNIQUE INDEX "batch_itemType_itemCode_idx" ON "published_prices" USING btree ("batch","item_type","item_code");
  CREATE INDEX "price_history_item_code_idx" ON "price_history" USING btree ("item_code");
  CREATE INDEX "price_history_updated_at_idx" ON "price_history" USING btree ("updated_at");
  CREATE INDEX "price_history_created_at_idx" ON "price_history" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_options_fk" FOREIGN KEY ("options_id") REFERENCES "public"."options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_power_levels_fk" FOREIGN KEY ("power_levels_id") REFERENCES "public"."power_levels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_builds_fk" FOREIGN KEY ("builds_id") REFERENCES "public"."builds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_published_prices_fk" FOREIGN KEY ("published_prices_id") REFERENCES "public"."published_prices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_price_history_fk" FOREIGN KEY ("price_history_id") REFERENCES "public"."price_history"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_options_id_idx" ON "payload_locked_documents_rels" USING btree ("options_id");
  CREATE INDEX "payload_locked_documents_rels_power_levels_id_idx" ON "payload_locked_documents_rels" USING btree ("power_levels_id");
  CREATE INDEX "payload_locked_documents_rels_builds_id_idx" ON "payload_locked_documents_rels" USING btree ("builds_id");
  CREATE INDEX "payload_locked_documents_rels_published_prices_id_idx" ON "payload_locked_documents_rels" USING btree ("published_prices_id");
  CREATE INDEX "payload_locked_documents_rels_price_history_id_idx" ON "payload_locked_documents_rels" USING btree ("price_history_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Hand-edited: foreign keys first. `DROP TABLE … CASCADE` below already removes them, so the
  // generated order (constraints after tables) failed with "constraint does not exist".
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_options_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_power_levels_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_builds_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_published_prices_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_price_history_fk";
   ALTER TABLE "media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "power_levels_monitor_filters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "power_levels_components" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "power_levels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "builds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "builds_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "published_prices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "price_history" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pricing_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "media" CASCADE;
  DROP TABLE "options" CASCADE;
  DROP TABLE "power_levels_monitor_filters" CASCADE;
  DROP TABLE "power_levels_components" CASCADE;
  DROP TABLE "power_levels" CASCADE;
  DROP TABLE "builds" CASCADE;
  DROP TABLE "builds_rels" CASCADE;
  DROP TABLE "published_prices" CASCADE;
  DROP TABLE "price_history" CASCADE;
  DROP TABLE "pricing_settings" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP INDEX "payload_locked_documents_rels_media_id_idx";
  DROP INDEX "payload_locked_documents_rels_options_id_idx";
  DROP INDEX "payload_locked_documents_rels_power_levels_id_idx";
  DROP INDEX "payload_locked_documents_rels_builds_id_idx";
  DROP INDEX "payload_locked_documents_rels_published_prices_id_idx";
  DROP INDEX "payload_locked_documents_rels_price_history_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "media_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "options_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "power_levels_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "builds_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "published_prices_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "price_history_id";
  DROP TYPE "public"."enum_options_type";
  DROP TYPE "public"."enum_options_aio360";
  DROP TYPE "public"."enum_options_kind";
  DROP TYPE "public"."enum_options_color";
  DROP TYPE "public"."enum_options_ram_type";
  DROP TYPE "public"."enum_power_levels_monitor_filters";
  DROP TYPE "public"."enum_power_levels_components_role";
  DROP TYPE "public"."enum_power_levels_target_resolution";
  DROP TYPE "public"."enum_power_levels_variant";
  DROP TYPE "public"."enum_power_levels_platform";
  DROP TYPE "public"."enum_power_levels_ram_type";
  DROP TYPE "public"."enum_power_levels_color";
  DROP TYPE "public"."enum_power_levels_markup_class";
  DROP TYPE "public"."enum_builds_creature_shell";
  DROP TYPE "public"."enum_published_prices_item_type";
  DROP TYPE "public"."enum_price_history_item_type";`)
}
