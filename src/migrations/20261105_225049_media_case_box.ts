import fs from 'fs'
import path from 'path'

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { measureCaseBox } from '../lib/caseBoxMeasure'
import { getEnv } from '../lib/env'

/**
 * `media.box`: where the picture really is in each file (runda v2 §3.1, §3.3). New uploads get it
 * from the `beforeChange` hook; this fills it for the files already on disk. A missing or
 * unreadable file is skipped (box stays empty, the page then uses the whole file) — never a
 * failed start.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "box_x" numeric;
  ALTER TABLE "media" ADD COLUMN "box_y" numeric;
  ALTER TABLE "media" ADD COLUMN "box_w" numeric;
  ALTER TABLE "media" ADD COLUMN "box_h" numeric;`)

  const dir = path.resolve(getEnv().MEDIA_DIR)
  const { rows } = await db.execute(sql`SELECT "id", "filename" FROM "media"`)
  let measured = 0
  for (const row of rows as { id: number; filename: string | null }[]) {
    if (!row.filename) continue
    const file = path.join(dir, path.basename(row.filename))
    if (!fs.existsSync(file)) continue
    try {
      const box = await measureCaseBox(file)
      if (!box) continue
      await db.execute(sql`
        UPDATE "media" SET "box_x" = ${box.x}, "box_y" = ${box.y}, "box_w" = ${box.w}, "box_h" = ${box.h}
        WHERE "id" = ${row.id}`)
      measured++
    } catch {
      // Unreadable file: leave the box empty.
    }
  }
  payload.logger.info({ measured, files: rows.length }, 'Media: case boxes measured')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DROP COLUMN "box_x";
  ALTER TABLE "media" DROP COLUMN "box_y";
  ALTER TABLE "media" DROP COLUMN "box_w";
  ALTER TABLE "media" DROP COLUMN "box_h";`)
}
