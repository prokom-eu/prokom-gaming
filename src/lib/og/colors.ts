/**
 * Colours of the link previews, from src/styles/tokens.css (ADR-G003). `next/og` (Satori) knows no
 * CSS variables, so the values are copied here; `colors.test.ts` fails when they drift.
 */
export const OG_COLORS = {
  page: '#040706', // --smola
  text: '#ece4d0', // --kosc
  textHi: '#f6efdd', // --kosc-hi
  text2: '#cdc3ab', // --kosc2
  muted: '#9a9583', // --mgla
  gold: '#f2c230', // --grom
  srcPk: '#7fd56a', // --src-pk-text
  srcInd: '#8fb0f5', // --src-ind-text
  srcEst: '#b6bcc4', // --src-est-text
} as const

/** Token of each colour, for the drift test. */
export const OG_COLOR_TOKENS: Record<keyof typeof OG_COLORS, string> = {
  page: 'smola',
  text: 'kosc',
  textHi: 'kosc-hi',
  text2: 'kosc2',
  muted: 'mgla',
  gold: 'grom',
  srcPk: 'src-pk-text',
  srcInd: 'src-ind-text',
  srcEst: 'src-est-text',
}
