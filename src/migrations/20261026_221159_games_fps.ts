import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_games_kind" AS ENUM('esport', 'aaa', 'capped');
  CREATE TYPE "public"."enum_fps_results_resolution" AS ENUM('fullhd', 'qhd', 'uhd');
  CREATE TYPE "public"."enum_fps_results_kind" AS ENUM('p', 'm', 'r', 'e');
  CREATE TABLE "games" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"kind" "enum_games_kind" NOT NULL,
  	"fps_cap" numeric,
  	"popular_rank" numeric NOT NULL,
  	"setting" varchar NOT NULL,
  	"setting_note" varchar,
  	"seo_page" boolean DEFAULT true,
  	"requirements_min" varchar,
  	"requirements_recommended" varchar,
  	"requirements_max" varchar,
  	"requirements_source" varchar,
  	"requirements_checked_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "fps_results" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"build_id" integer NOT NULL,
  	"game_id" integer NOT NULL,
  	"resolution" "enum_fps_results_resolution" NOT NULL,
  	"fps" numeric NOT NULL,
  	"kind" "enum_fps_results_kind" NOT NULL,
  	"source_label" varchar NOT NULL,
  	"source_url" varchar,
  	"setting" varchar NOT NULL,
  	"measured_at" timestamp(3) with time zone,
  	"cpu" varchar,
  	"gpu" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "games_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "fps_results_id" integer;
  ALTER TABLE "fps_results" ADD CONSTRAINT "fps_results_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "fps_results" ADD CONSTRAINT "fps_results_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "games_name_idx" ON "games" USING btree ("name");
  CREATE UNIQUE INDEX "games_slug_idx" ON "games" USING btree ("slug");
  CREATE INDEX "games_updated_at_idx" ON "games" USING btree ("updated_at");
  CREATE INDEX "games_created_at_idx" ON "games" USING btree ("created_at");
  CREATE INDEX "fps_results_build_idx" ON "fps_results" USING btree ("build_id");
  CREATE INDEX "fps_results_game_idx" ON "fps_results" USING btree ("game_id");
  CREATE INDEX "fps_results_updated_at_idx" ON "fps_results" USING btree ("updated_at");
  CREATE INDEX "fps_results_created_at_idx" ON "fps_results" USING btree ("created_at");
  CREATE INDEX "build_game_resolution_idx" ON "fps_results" USING btree ("build_id","game_id","resolution");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_games_fk" FOREIGN KEY ("games_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fps_results_fk" FOREIGN KEY ("fps_results_id") REFERENCES "public"."fps_results"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_games_id_idx" ON "payload_locked_documents_rels" USING btree ("games_id");
  CREATE INDEX "payload_locked_documents_rels_fps_results_id_idx" ON "payload_locked_documents_rels" USING btree ("fps_results_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Locked-document references first: `DROP TABLE … CASCADE` removes these constraints itself, and
  // the generated order then fails with "constraint does not exist" (same fix as in `offer`).
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_games_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_fps_results_fk";
  DROP INDEX "payload_locked_documents_rels_games_id_idx";
  DROP INDEX "payload_locked_documents_rels_fps_results_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "games_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "fps_results_id";
  DROP TABLE "fps_results" CASCADE;
  DROP TABLE "games" CASCADE;
  DROP TYPE "public"."enum_games_kind";
  DROP TYPE "public"."enum_fps_results_resolution";
  DROP TYPE "public"."enum_fps_results_kind";`)
}
