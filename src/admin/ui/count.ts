/** Counters stay narrow: "99+" (the exact number is on the screen behind the link). */
export const shortCount = (n: number): string => (n > 99 ? '99+' : String(n))
