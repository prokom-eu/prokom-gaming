// localStorage that never throws: private mode, blocked storage or a full quota must not break
// the page (spec. §3). Readers get a fallback value instead.

export const storageKeys = {
  /** Builds picked for comparison, max 3 (G11 defines the contents). */
  compare: 'pkg:compare',
  /** Items in the inquiry (G12 defines the contents). */
  inquiry: 'pkg:inquiry',
  /** Cookie banner answer. */
  consent: 'pkg:consent',
} as const

export function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/** Length of a JSON array stored under `key`; 0 for anything else. */
export function readCount(key: string, max = Infinity): number {
  const raw = readItem(key)
  if (!raw) return 0
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? Math.min(value.length, max) : 0
  } catch {
    return 0
  }
}

// `storage` events reach only other tabs; writers in this tab call notifyStorage() instead.
const LOCAL_EVENT = 'pkg:storage'

export function notifyStorage(): void {
  window.dispatchEvent(new Event(LOCAL_EVENT))
}

/** Subscribe to changes from this and other tabs (for useSyncExternalStore). */
export function subscribeStorage(onChange: () => void): () => void {
  window.addEventListener('storage', onChange)
  window.addEventListener(LOCAL_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(LOCAL_EVENT, onChange)
  }
}
