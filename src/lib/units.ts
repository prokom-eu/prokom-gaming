import { randomInt } from 'node:crypto'

// Unit codes for the certificate (ADR-G005): random, at least 12 characters, impossible to guess.
// The code is the only key to `/metryka/<code>`, printed on the case sticker as a QR code.

/** No 0/O, 1/I/L and no lower case: people retype the code from a sticker. */
export const UNIT_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/** 4 groups of 4 = 16 characters ≈ 79 bits of entropy (31^16). */
export const UNIT_CODE_GROUPS = 4
export const UNIT_CODE_GROUP_LENGTH = 4

/** `7KQ2-M9XA-…` from `crypto.randomInt` (uniform, no modulo bias). */
export function generateUnitCode(random: (max: number) => number = randomInt): string {
  const groups: string[] = []
  for (let g = 0; g < UNIT_CODE_GROUPS; g++) {
    let group = ''
    for (let i = 0; i < UNIT_CODE_GROUP_LENGTH; i++) {
      group += UNIT_CODE_ALPHABET[random(UNIT_CODE_ALPHABET.length)]
    }
    groups.push(group)
  }
  return groups.join('-')
}

const CODE_PATTERN = new RegExp(
  `^[${UNIT_CODE_ALPHABET}]{${UNIT_CODE_GROUP_LENGTH}}(-[${UNIT_CODE_ALPHABET}]{${UNIT_CODE_GROUP_LENGTH}}){${UNIT_CODE_GROUPS - 1}}$`,
)

/**
 * What a person typed (spaces, lower case, missing dashes) → the canonical code, or `null` when it
 * cannot be one. Lookups always use the canonical form.
 */
export function normalizeUnitCode(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const compact = input.toUpperCase().replace(/[\s-]/g, '')
  if (compact.length !== UNIT_CODE_GROUPS * UNIT_CODE_GROUP_LENGTH) return null
  const groups = compact.match(new RegExp(`.{${UNIT_CODE_GROUP_LENGTH}}`, 'g')) ?? []
  const code = groups.join('-')
  return CODE_PATTERN.test(code) ? code : null
}
