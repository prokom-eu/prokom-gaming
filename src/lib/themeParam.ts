/**
 * `?motyw=jasny|ciemny|auto` arrives on links from the other PRO-KOM lines (ADR-028 in prokom-web,
 * MOTYW-PASEK-LINII §3.3). Gaming has only the dark theme (§5), so it stores nothing — it only
 * takes the parameter out of the address bar, whatever its value.
 */
export const THEME_PARAM = 'motyw'

/**
 * The same address without the theme parameter (path, other parameters and hash kept), or `null`
 * when there is nothing to remove. `href` is absolute (`window.location.href`); the result is
 * relative to the origin, ready for `history.replaceState`.
 */
export function withoutThemeParam(href: string): string | null {
  const url = new URL(href)
  if (!url.searchParams.has(THEME_PARAM)) return null
  url.searchParams.delete(THEME_PARAM)
  return `${url.pathname}${url.search}${url.hash}`
}
