import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_guides_recommended_creature" AS ENUM('skrzat', 'licho', 'bies', 'wodnik', 'strzyga', 'kikimora', 'zmora', 'rusalka', 'baba-jaga', 'bazyliszek', 'pani-zimy', 'wilkolak', 'wampir', 'weles', 'zmij', 'perun');
  CREATE TYPE "public"."enum_guides_category" AS ENUM('parents', 'hardware', 'games', 'after');
  CREATE TYPE "public"."enum_guides_creature" AS ENUM('skrzat', 'licho', 'bies', 'wodnik', 'strzyga', 'kikimora', 'zmora', 'rusalka', 'baba-jaga', 'bazyliszek', 'pani-zimy', 'wilkolak', 'wampir', 'weles', 'zmij', 'perun');
  CREATE TYPE "public"."enum_guides_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__guides_v_version_recommended_creature" AS ENUM('skrzat', 'licho', 'bies', 'wodnik', 'strzyga', 'kikimora', 'zmora', 'rusalka', 'baba-jaga', 'bazyliszek', 'pani-zimy', 'wilkolak', 'wampir', 'weles', 'zmij', 'perun');
  CREATE TYPE "public"."enum__guides_v_version_category" AS ENUM('parents', 'hardware', 'games', 'after');
  CREATE TYPE "public"."enum__guides_v_version_creature" AS ENUM('skrzat', 'licho', 'bies', 'wodnik', 'strzyga', 'kikimora', 'zmora', 'rusalka', 'baba-jaga', 'bazyliszek', 'pani-zimy', 'wilkolak', 'wampir', 'weles', 'zmij', 'perun');
  CREATE TYPE "public"."enum__guides_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "guides_recommended" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"creature" "enum_guides_recommended_creature",
  	"note" varchar
  );
  
  CREATE TABLE "guides" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"category" "enum_guides_category",
  	"lead" varchar,
  	"content" jsonb,
  	"reading_time" numeric,
  	"creature" "enum_guides_creature",
  	"author" varchar DEFAULT 'Zespół PRO-KOM Gaming',
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_guides_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_guides_v_version_recommended" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"creature" "enum__guides_v_version_recommended_creature",
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_guides_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_category" "enum__guides_v_version_category",
  	"version_lead" varchar,
  	"version_content" jsonb,
  	"version_reading_time" numeric,
  	"version_creature" "enum__guides_v_version_creature",
  	"version_author" varchar DEFAULT 'Zespół PRO-KOM Gaming',
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__guides_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "guides_id" integer;
  ALTER TABLE "guides_recommended" ADD CONSTRAINT "guides_recommended_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v_version_recommended" ADD CONSTRAINT "_guides_v_version_recommended_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v" ADD CONSTRAINT "_guides_v_parent_id_guides_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."guides"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "guides_recommended_order_idx" ON "guides_recommended" USING btree ("_order");
  CREATE INDEX "guides_recommended_parent_id_idx" ON "guides_recommended" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "guides_slug_idx" ON "guides" USING btree ("slug");
  CREATE INDEX "guides_updated_at_idx" ON "guides" USING btree ("updated_at");
  CREATE INDEX "guides_created_at_idx" ON "guides" USING btree ("created_at");
  CREATE INDEX "guides__status_idx" ON "guides" USING btree ("_status");
  CREATE INDEX "_guides_v_version_recommended_order_idx" ON "_guides_v_version_recommended" USING btree ("_order");
  CREATE INDEX "_guides_v_version_recommended_parent_id_idx" ON "_guides_v_version_recommended" USING btree ("_parent_id");
  CREATE INDEX "_guides_v_parent_idx" ON "_guides_v" USING btree ("parent_id");
  CREATE INDEX "_guides_v_version_version_slug_idx" ON "_guides_v" USING btree ("version_slug");
  CREATE INDEX "_guides_v_version_version_updated_at_idx" ON "_guides_v" USING btree ("version_updated_at");
  CREATE INDEX "_guides_v_version_version_created_at_idx" ON "_guides_v" USING btree ("version_created_at");
  CREATE INDEX "_guides_v_version_version__status_idx" ON "_guides_v" USING btree ("version__status");
  CREATE INDEX "_guides_v_created_at_idx" ON "_guides_v" USING btree ("created_at");
  CREATE INDEX "_guides_v_updated_at_idx" ON "_guides_v" USING btree ("updated_at");
  CREATE INDEX "_guides_v_latest_idx" ON "_guides_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_guides_fk" FOREIGN KEY ("guides_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_guides_id_idx" ON "payload_locked_documents_rels" USING btree ("guides_id");`)
}

// Foreign key of the lock table dropped before the table: `DROP TABLE … CASCADE` would remove it
// first and the generated `DROP CONSTRAINT` would fail (same fix as in `faq` and `offer`).
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_guides_fk";
  ALTER TABLE "guides_recommended" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "guides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_guides_v_version_recommended" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_guides_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "guides_recommended" CASCADE;
  DROP TABLE "guides" CASCADE;
  DROP TABLE "_guides_v_version_recommended" CASCADE;
  DROP TABLE "_guides_v" CASCADE;
  DROP INDEX "payload_locked_documents_rels_guides_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "guides_id";
  DROP TYPE "public"."enum_guides_recommended_creature";
  DROP TYPE "public"."enum_guides_category";
  DROP TYPE "public"."enum_guides_creature";
  DROP TYPE "public"."enum_guides_status";
  DROP TYPE "public"."enum__guides_v_version_recommended_creature";
  DROP TYPE "public"."enum__guides_v_version_category";
  DROP TYPE "public"."enum__guides_v_version_creature";
  DROP TYPE "public"."enum__guides_v_version_status";`)
}
