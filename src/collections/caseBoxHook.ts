import type { CollectionBeforeChangeHook } from 'payload'

import { measureCaseBox } from '../lib/caseBoxMeasure'
import { errorFields } from '../lib/logger'

/**
 * `media`: a new or replaced file — measure where the picture really is (box of the
 * non-transparent pixels), so the hero and the cards place the case itself, not the file with its
 * margins (runda v2 §3.1, §3.3). Saving only `alt` keeps the stored box.
 */
export const stampCaseBox: CollectionBeforeChangeHook = async ({ data, req }) => {
  const file = req.file
  if (!file) return data
  try {
    const box = await measureCaseBox(file.tempFilePath ?? file.data)
    return { ...data, box: box ?? { x: null, y: null, w: null, h: null } }
  } catch (error) {
    // A file sharp cannot read still uploads; the page then treats the whole file as the case.
    req.payload.logger.warn({ ...errorFields(error) }, 'Media: case box not measured')
    return data
  }
}
