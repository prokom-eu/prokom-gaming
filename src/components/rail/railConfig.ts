/**
 * What the side rail lists (NAWIGACJA §4.2, §4.4): the 11 home sections with their anchors and the
 * „Na tej stronie” groups of sub-pages. Labels and ids come from the real sections (the home
 * components carry these ids since B1; the build page sections since B2).
 */

/** 24×24 paths of the board's `ic.*` icons (plansza GamingNawigacja, sekcje 2–3). */
export const RAIL_ICONS = {
  start: 'M4 11l8-7 8 7v9H4zM10 20v-6h4v6',
  warsztat: 'M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2-2z',
  sciezki: 'M12 4v16M12 8c-3 0-5-1-7-3M12 13c3 0 5-1 7-3M12 18c-3 0-5-1-7-3',
  istoty: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  kup: 'M5 7h14M5 12h14M5 17h8M18 15l2 2-4 4',
  gry: 'M7 9h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5 2l-1-1H9l-1 1a3 3 0 0 1-5-2v-1a4 4 0 0 1 4-4zM8 12v3M6.5 13.5h3M15.5 12.5h.01M17.5 14.5h.01',
  metryka: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h4',
  rodzice: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9.5 12l2 2 3.5-4',
  porownaj: 'M6 19V11M12 19V5M18 19v-6',
  wcenie: 'M4 9h16v4H4zM6 13v8h12v-8M12 9v12M12 9c-2-4-6-3-5 0M12 9c2-4 6-3 5 0',
  pytania:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17h.01',
  napisz: 'M4 6h16v12H4zM4 7l8 6 8-6',
  dobierz: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  szukaj: 'M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.2-4.2',
} as const

export type RailIcon = keyof typeof RAIL_ICONS

export type RailSection = { id: string; label: string; icon: RailIcon }
export type HomeSection = RailSection & { roman: string }

/** Home sections I–XI, in page order (NAWIGACJA §4.2). „Teraz w warsztacie” is not in the rail. */
export const HOME_SECTIONS: readonly HomeSection[] = [
  { id: 'start', label: 'Start', roman: 'I', icon: 'start' },
  { id: 'od-czego-zaczynasz', label: 'Od czego zaczynasz', roman: 'II', icon: 'sciezki' },
  { id: 'istoty', label: 'Szesnaście istot', roman: 'III', icon: 'istoty' },
  { id: 'jak-kupic', label: 'Jak kupić', roman: 'IV', icon: 'kup' },
  { id: 'w-co-grasz', label: 'W co grasz?', roman: 'V', icon: 'gry' },
  { id: 'metryka', label: 'Metryka komputera', roman: 'VI', icon: 'metryka' },
  { id: 'dla-rodzicow-sekcja', label: 'Dla rodziców', roman: 'VII', icon: 'rodzice' },
  { id: 'porownaj-istoty', label: 'Porównaj istoty', roman: 'VIII', icon: 'porownaj' },
  { id: 'w-cenie', label: 'W cenie', roman: 'IX', icon: 'wcenie' },
  { id: 'pytania', label: 'Zanim zapytasz', roman: 'X', icon: 'pytania' },
  { id: 'napisz', label: 'Napisz, w co grasz', roman: 'XI', icon: 'napisz' },
]

/**
 * Sections of a build page (`/zestawy/[slug]`), from its components' H2s. Optional ones (tuning,
 * neighbours, questions) are listed only when the page has them — the rail checks the DOM.
 */
export const BUILD_SECTIONS: readonly RailSection[] = [
  { id: 'przeglad', label: 'Przegląd', icon: 'start' },
  { id: 'cena-i-klatki', label: 'Cena i klatki', icon: 'gry' },
  { id: 'wnetrze', label: 'Co jest w środku', icon: 'warsztat' },
  { id: 'dopasuj', label: 'Dopasuj pod siebie', icon: 'dobierz' },
  { id: 'od-zapytania', label: 'Od zapytania do biurka', icon: 'kup' },
  { id: 'gwarancja', label: 'Gwarancja i opieka', icon: 'rodzice' },
  { id: 'inne-istoty', label: 'Inne istoty', icon: 'istoty' },
  { id: 'pytania-o-zestaw', label: 'Pytania', icon: 'pytania' },
]

/** „O nas”: its H2 headings carry these ids already. */
export const ABOUT_SECTIONS: readonly RailSection[] = [
  { id: 'ab-history', label: 'Dwadzieścia dwa lata', icon: 'start' },
  { id: 'ab-values', label: 'W co wierzymy', icon: 'rodzice' },
  { id: 'ab-lines', label: 'Nie tylko gaming', icon: 'sciezki' },
  { id: 'ab-company', label: 'Dane firmy', icon: 'metryka' },
  { id: 'ab-final', label: 'Sklep i kontakt', icon: 'napisz' },
]

/** „Komputer do {gry}”: the picks, every power level, requirements and questions. */
export const GAME_SECTIONS: readonly RailSection[] = [
  { id: 'gm-picks', label: 'Polecane zestawy', icon: 'istoty' },
  { id: 'gm-tiers', label: 'Każdy poziom mocy', icon: 'porownaj' },
  { id: 'gm-more', label: 'Wymagania i pytania', icon: 'pytania' },
]

/** „Dla rodziców” (C1): its seven parts. */
export const PARENTS_SECTIONS: readonly RailSection[] = [
  { id: 'start', label: 'Komputer dla dziecka', icon: 'start' },
  { id: 'pytania-rodzica', label: 'Cztery pytania', icon: 'pytania' },
  { id: 'dowody', label: 'Sprawdź nas', icon: 'rodzice' },
  { id: 'zakup', label: 'Jak wygląda zakup', icon: 'kup' },
  { id: 'slowniczek', label: 'Słowniczek', icon: 'metryka' },
  { id: 'pytania', label: 'Pytania rodziców', icon: 'pytania' },
  { id: 'napisz', label: 'Napisz do nas', icon: 'napisz' },
]

export type PageGroup = { title: string; sections: readonly RailSection[] }

/** Where the rail is not shown at all (NAWIGACJA §4): the printable certificate and the account. */
export function railHidden(pathname: string): boolean {
  return /^\/(metryka|konto)(\/|$)/.test(pathname)
}

/**
 * „Na tej stronie” for a path, or `null` (the home page lists its own sections; other pages have
 * no group yet). `names` maps a build slug to its creature name.
 */
export function pageGroup(pathname: string, names: ReadonlyMap<string, string>): PageGroup | null {
  const build = /^\/zestawy\/([a-z0-9-]+)\/?$/.exec(pathname)
  if (build) {
    const name = names.get(build[1])
    if (!name) return null
    return { title: `Na tej stronie · ${name}`, sections: BUILD_SECTIONS }
  }
  if (/^\/dla-rodzicow\/?$/.test(pathname)) {
    return { title: 'Na tej stronie · Dla rodziców', sections: PARENTS_SECTIONS }
  }
  if (/^\/o-nas\/?$/.test(pathname))
    return { title: 'Na tej stronie · O nas', sections: ABOUT_SECTIONS }
  if (/^\/komputer-do\/[a-z0-9-]+\/?$/.test(pathname)) {
    return { title: 'Na tej stronie', sections: GAME_SECTIONS }
  }
  // „Dobór pod grę” (one section), „Pytania” (own group tabs) and guides (own table of contents)
  // have no group (NAWIGACJA §4.4: at least three sections).
  return null
}

/**
 * The active section: the last one whose top edge has passed the reading line (40% of the window
 * height, NAWIGACJA §4.3). `tops` are the sections' top edges in viewport pixels, in page order;
 * `-1` when none has reached the line yet.
 */
export function activeIndex(tops: readonly number[], line: number): number {
  let active = -1
  for (let i = 0; i < tops.length; i++) if (tops[i] <= line) active = i
  return active
}

/** Page scroll progress 0–100 for the „Do góry” ring. */
export function scrollProgress(scrollY: number, scrollHeight: number, viewport: number): number {
  const max = scrollHeight - viewport
  if (max <= 0) return 0
  return Math.round(Math.min(1, Math.max(0, scrollY / max)) * 100)
}

/** Circumference of the ring (r = 10): the dash offset for a progress in %. */
export const RING = 62.8
export const ringOffset = (progress: number) => +(RING * (1 - progress / 100)).toFixed(1)
