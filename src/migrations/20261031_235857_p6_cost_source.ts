import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { partKey } from '../lib/pricing/partKey'

// P6: cost source of options and parts (ADR-G007 §1), `partKey` of parts and `price-sources`.
// Existing costs are the shop prices of the seed → `market`. `costUpdatedAt` stays empty for
// existing rows (the date of the last change is unknown). `down` deletes every offer link.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_options_cost_source" AS ENUM('market', 'invoice');
  CREATE TYPE "public"."enum_power_levels_components_cost_source" AS ENUM('market', 'invoice');
  CREATE TYPE "public"."enum_price_sources_item_type" AS ENUM('option', 'component');
  CREATE TYPE "public"."enum_price_sources_component_role" AS ENUM('cpu', 'gpu', 'mobo', 'psu');
  CREATE TABLE "price_sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_type" "enum_price_sources_item_type" NOT NULL,
  	"item_code" varchar NOT NULL,
  	"component_role" "enum_price_sources_component_role",
  	"url" varchar NOT NULL,
  	"shop" varchar,
  	"active" boolean DEFAULT true,
  	"proposed_by_claude" boolean DEFAULT false,
  	"last_ok" timestamp(3) with time zone,
  	"last_error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "options" ADD COLUMN "cost_source" "enum_options_cost_source" DEFAULT 'market' NOT NULL;
  ALTER TABLE "options" ADD COLUMN "cost_note" varchar;
  ALTER TABLE "options" ADD COLUMN "cost_updated_at" timestamp(3) with time zone;
  ALTER TABLE "power_levels_components" ADD COLUMN "cost_source" "enum_power_levels_components_cost_source" DEFAULT 'market' NOT NULL;
  ALTER TABLE "power_levels_components" ADD COLUMN "cost_note" varchar;
  ALTER TABLE "power_levels_components" ADD COLUMN "cost_updated_at" timestamp(3) with time zone;
  ALTER TABLE "power_levels_components" ADD COLUMN "part_key" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "price_sources_id" integer;
  CREATE INDEX "price_sources_item_code_idx" ON "price_sources" USING btree ("item_code");
  CREATE INDEX "price_sources_updated_at_idx" ON "price_sources" USING btree ("updated_at");
  CREATE INDEX "price_sources_created_at_idx" ON "price_sources" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_price_sources_fk" FOREIGN KEY ("price_sources_id") REFERENCES "public"."price_sources"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "power_levels_components_part_key_idx" ON "power_levels_components" USING btree ("part_key");
  CREATE INDEX "payload_locked_documents_rels_price_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("price_sources_id");`)

  // Same model in several levels = one key (computed in code: the same function as the hook).
  const parts = await db.execute(
    sql`SELECT "id", "role", "internal_model" FROM "power_levels_components"`,
  )
  for (const row of parts.rows as { id: string; role: string; internal_model: string }[]) {
    await db.execute(
      sql`UPDATE "power_levels_components" SET "part_key" = ${partKey(row.role, row.internal_model)} WHERE "id" = ${row.id}`,
    )
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_price_sources_fk";
  ALTER TABLE "price_sources" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "price_sources" CASCADE;
  
  DROP INDEX "power_levels_components_part_key_idx";
  DROP INDEX "payload_locked_documents_rels_price_sources_id_idx";
  ALTER TABLE "options" DROP COLUMN "cost_source";
  ALTER TABLE "options" DROP COLUMN "cost_note";
  ALTER TABLE "options" DROP COLUMN "cost_updated_at";
  ALTER TABLE "power_levels_components" DROP COLUMN "cost_source";
  ALTER TABLE "power_levels_components" DROP COLUMN "cost_note";
  ALTER TABLE "power_levels_components" DROP COLUMN "cost_updated_at";
  ALTER TABLE "power_levels_components" DROP COLUMN "part_key";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "price_sources_id";
  DROP TYPE "public"."enum_options_cost_source";
  DROP TYPE "public"."enum_power_levels_components_cost_source";
  DROP TYPE "public"."enum_price_sources_item_type";
  DROP TYPE "public"."enum_price_sources_component_role";`)
}
