import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "legal_terms_summary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"point" varchar NOT NULL
  );
  
  CREATE TABLE "legal_terms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"draft" boolean DEFAULT true,
  	"version" varchar NOT NULL,
  	"effective_date" timestamp(3) with time zone,
  	"content" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "legal_privacy_summary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"point" varchar NOT NULL
  );
  
  CREATE TABLE "legal_privacy" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"draft" boolean DEFAULT true,
  	"version" varchar NOT NULL,
  	"effective_date" timestamp(3) with time zone,
  	"content" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "legal_terms_summary" ADD CONSTRAINT "legal_terms_summary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_terms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_privacy_summary" ADD CONSTRAINT "legal_privacy_summary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_privacy"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "legal_terms_summary_order_idx" ON "legal_terms_summary" USING btree ("_order");
  CREATE INDEX "legal_terms_summary_parent_id_idx" ON "legal_terms_summary" USING btree ("_parent_id");
  CREATE INDEX "legal_privacy_summary_order_idx" ON "legal_privacy_summary" USING btree ("_order");
  CREATE INDEX "legal_privacy_summary_parent_id_idx" ON "legal_privacy_summary" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "legal_terms_summary" CASCADE;
  DROP TABLE "legal_terms" CASCADE;
  DROP TABLE "legal_privacy_summary" CASCADE;
  DROP TABLE "legal_privacy" CASCADE;`)
}
