import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_inquiries_voucher_design" AS ENUM('perun', 'wampir', 'rusalka', 'skrzat');
  CREATE TYPE "public"."enum_stock_location" AS ENUM('rabka', 'zakopane');
  CREATE TYPE "public"."enum_stock_condition" AS ENUM('new', 'demo', 'returned');
  CREATE TYPE "public"."enum_vouchers_status" AS ENUM('ordered', 'paid', 'issued', 'used');
  CREATE TYPE "public"."enum_vouchers_design" AS ENUM('perun', 'wampir', 'rusalka', 'skrzat');
  CREATE TABLE "stock" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"build_id" integer NOT NULL,
  	"location" "enum_stock_location" NOT NULL,
  	"condition" "enum_stock_condition" NOT NULL,
  	"changes_level" varchar,
  	"changes_case" varchar,
  	"changes_cooler" varchar,
  	"changes_ram" varchar,
  	"changes_ssd" varchar,
  	"condition_note" varchar NOT NULL,
  	"discount" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"reserved_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vouchers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar,
  	"amount" numeric NOT NULL,
  	"status" "enum_vouchers_status" DEFAULT 'ordered' NOT NULL,
  	"design" "enum_vouchers_design" NOT NULL,
  	"recipient" varchar,
  	"dedication" varchar,
  	"valid_until" timestamp(3) with time zone,
  	"inquiry_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "inquiries" ADD COLUMN "voucher_amount" numeric;
  ALTER TABLE "inquiries" ADD COLUMN "voucher_design" "enum_inquiries_voucher_design";
  ALTER TABLE "inquiries" ADD COLUMN "voucher_recipient" varchar;
  ALTER TABLE "inquiries" ADD COLUMN "voucher_dedication" varchar;
  ALTER TABLE "inquiries" ADD COLUMN "stock_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "stock_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vouchers_id" integer;
  ALTER TABLE "stock" ADD CONSTRAINT "stock_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "stock_build_idx" ON "stock" USING btree ("build_id");
  CREATE INDEX "stock_active_idx" ON "stock" USING btree ("active");
  CREATE INDEX "stock_updated_at_idx" ON "stock" USING btree ("updated_at");
  CREATE INDEX "stock_created_at_idx" ON "stock" USING btree ("created_at");
  CREATE UNIQUE INDEX "vouchers_code_idx" ON "vouchers" USING btree ("code");
  CREATE INDEX "vouchers_inquiry_idx" ON "vouchers" USING btree ("inquiry_id");
  CREATE INDEX "vouchers_updated_at_idx" ON "vouchers" USING btree ("updated_at");
  CREATE INDEX "vouchers_created_at_idx" ON "vouchers" USING btree ("created_at");
  ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_stock_id_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stock"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stock"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vouchers_fk" FOREIGN KEY ("vouchers_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "inquiries_stock_idx" ON "inquiries" USING btree ("stock_id");
  CREATE INDEX "payload_locked_documents_rels_stock_id_idx" ON "payload_locked_documents_rels" USING btree ("stock_id");
  CREATE INDEX "payload_locked_documents_rels_vouchers_id_idx" ON "payload_locked_documents_rels" USING btree ("vouchers_id");`)
}

// Foreign keys to the new tables dropped before the tables: `DROP TABLE … CASCADE` would remove
// them first and the generated `DROP CONSTRAINT` would fail (same fix as in `faq` and `guides`).
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "inquiries" DROP CONSTRAINT "inquiries_stock_id_stock_id_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_stock_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vouchers_fk";
  ALTER TABLE "stock" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vouchers" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "stock" CASCADE;
  DROP TABLE "vouchers" CASCADE;
DROP INDEX "inquiries_stock_idx";
  DROP INDEX "payload_locked_documents_rels_stock_id_idx";
  DROP INDEX "payload_locked_documents_rels_vouchers_id_idx";
  ALTER TABLE "inquiries" DROP COLUMN "voucher_amount";
  ALTER TABLE "inquiries" DROP COLUMN "voucher_design";
  ALTER TABLE "inquiries" DROP COLUMN "voucher_recipient";
  ALTER TABLE "inquiries" DROP COLUMN "voucher_dedication";
  ALTER TABLE "inquiries" DROP COLUMN "stock_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "stock_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "vouchers_id";
  DROP TYPE "public"."enum_inquiries_voucher_design";
  DROP TYPE "public"."enum_stock_location";
  DROP TYPE "public"."enum_stock_condition";
  DROP TYPE "public"."enum_vouchers_status";
  DROP TYPE "public"."enum_vouchers_design";`)
}
