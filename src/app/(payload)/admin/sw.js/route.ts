import config from '@payload-config'

import { PANEL_APP } from '../../../../admin/brand'

/**
 * Service worker of the panel (ADR-G010 pt 3): ONLY shows push notifications and opens the right
 * screen when one is tapped. No `fetch` handler — nothing of the panel (prices, personal data) is
 * ever cached on the phone, and the panel never works offline. Served from a route handler (a
 * static segment wins over Payload's `admin/[[...segments]]`); `Service-Worker-Allowed` lets the
 * file at /admin/sw.js take the scope /admin (its default would be /admin/ only).
 */
function script(admin: string, icon: string): string {
  return `'use strict'
const ADMIN = ${JSON.stringify(admin)}
const ICON = ${JSON.stringify(icon)}

function inAdmin(path) {
  return path === ADMIN || path.startsWith(ADMIN + '/')
}

// Only our own screens open from a notification.
function screen(value) {
  try {
    const url = new URL(typeof value === 'string' ? value : ADMIN, self.location.origin)
    const inPanel = inAdmin(url.pathname)
    return url.origin === self.location.origin && inPanel ? url.href : new URL(ADMIN, self.location.origin).href
  } catch (e) {
    return new URL(ADMIN, self.location.origin).href
  }
}

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = {}
  }
  const title = typeof data.title === 'string' ? data.title : 'PRO-KOM Panel'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === 'string' ? data.body : '',
      tag: typeof data.tag === 'string' ? data.tag : undefined,
      icon: ICON,
      badge: ICON,
      lang: 'pl',
      data: { url: screen(data.url) },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = screen(event.notification.data && event.notification.data.url)
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if (inAdmin(new URL(client.url).pathname)) {
          await client.focus()
          // An uncontrolled window refuses navigate(): open a new one instead.
          return client.navigate(url).catch(() => self.clients.openWindow(url))
        }
      }
      return self.clients.openWindow(url)
    })(),
  )
})
`
}

export async function GET() {
  const admin = (await config).routes.admin
  return new Response(script(admin, PANEL_APP.icons.any192), {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Service-Worker-Allowed': admin,
      // Always the newest file: the browser checks it on every registration.
      'Cache-Control': 'no-cache',
    },
  })
}
