/**
 * A readable name of the device for the list in Settings → Powiadomienia („iPhone · Safari”),
 * from the user agent — only the platform and the browser, nothing that identifies a person.
 */
export function deviceLabel(userAgent: string): string {
  const ua = userAgent
  const platform = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'Mac'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'Urządzenie'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Firefox|FxiOS/.test(ua)
          ? 'Firefox'
          : /Chrome|CriOS/.test(ua)
            ? 'Chrome'
            : /Safari/.test(ua)
              ? 'Safari'
              : null
  return browser ? `${platform} · ${browser}` : platform
}

/** iPhone/iPad outside the home-screen app: push works only after „Do ekranu początkowego”. */
export function needsHomeScreen(userAgent: string, standalone: boolean): boolean {
  return /iPhone|iPad/.test(userAgent) && !standalone
}
