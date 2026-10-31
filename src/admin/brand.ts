/**
 * Panel app identity for the phone (ADR-G010 §2, panel spec §2a pt 11): the manifest, the viewport
 * theme colour and the icons. The colour is `--p-bg` of panel-tokens.css — a manifest and a
 * <meta> cannot read CSS variables, so it is repeated here once.
 */
export const PANEL_APP = {
  name: 'PRO-KOM Panel',
  shortName: 'PRO-KOM Panel',
  themeColor: '#080c0b',
  /** Generated once by `scripts/admin-icons.mjs` (monogram "PK"). */
  icons: {
    any192: '/admin-assets/icon-192.png',
    any512: '/admin-assets/icon-512.png',
    maskable512: '/admin-assets/icon-maskable-512.png',
    apple180: '/admin-assets/apple-touch-icon.png',
  },
} as const
