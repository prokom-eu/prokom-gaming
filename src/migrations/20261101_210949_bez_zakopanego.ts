import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// No salon in Zakopane (Krystian, 01.11.2026): `zakopane` leaves the pickup and stock location
// enums, and the signature gets the Gaming phone. Rows that still use `zakopane` are moved first,
// otherwise the cast to the new type fails: an inquiry loses only its pickup choice (optional
// field, the message stays), a stock unit stands in Rabka. A signature still equal to the old
// default gets the new one; an edited signature stays as it is.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "inquiries" SET "pickup" = NULL WHERE "pickup" = 'zakopane';
  UPDATE "stock" SET "location" = 'rabka' WHERE "location" = 'zakopane';
  ALTER TABLE "inquiries" ALTER COLUMN "pickup" SET DATA TYPE text;
  DROP TYPE "public"."enum_inquiries_pickup";
  CREATE TYPE "public"."enum_inquiries_pickup" AS ENUM('courier', 'rabka');
  ALTER TABLE "inquiries" ALTER COLUMN "pickup" SET DATA TYPE "public"."enum_inquiries_pickup" USING "pickup"::"public"."enum_inquiries_pickup";
  ALTER TABLE "stock" ALTER COLUMN "location" SET DATA TYPE text;
  DROP TYPE "public"."enum_stock_location";
  CREATE TYPE "public"."enum_stock_location" AS ENUM('rabka');
  ALTER TABLE "stock" ALTER COLUMN "location" SET DATA TYPE "public"."enum_stock_location" USING "location"::"public"."enum_stock_location";
  ALTER TABLE "mail_settings" ALTER COLUMN "signature" SET DEFAULT 'Krystian · PRO-KOM Gaming
Rabka-Zdrój, ul. Orkana 16B · +48 883 200 151';
  UPDATE "mail_settings" SET "signature" = 'Krystian · PRO-KOM Gaming
Rabka-Zdrój, ul. Orkana 16B · +48 883 200 151'
    WHERE "signature" = 'Krystian · PRO-KOM Gaming
Rabka-Zdrój, ul. Orkana 16B · +48 18 267 65 11';`)
}

// `down` brings back the enum values and the old default only: rows moved by `up` (pickup cleared,
// stock moved to Rabka) stay as they are — the old values cannot be told apart any more.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TYPE "public"."enum_inquiries_pickup" ADD VALUE 'zakopane';
  ALTER TYPE "public"."enum_stock_location" ADD VALUE 'zakopane';
  ALTER TABLE "mail_settings" ALTER COLUMN "signature" SET DEFAULT 'Krystian · PRO-KOM Gaming
Rabka-Zdrój, ul. Orkana 16B · +48 18 267 65 11';`)
}
