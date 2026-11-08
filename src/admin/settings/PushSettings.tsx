'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useOptimistic, useState, useSyncExternalStore, useTransition } from 'react'

import { PUSH_KINDS, PUSH_KIND_LABELS, type PushKind } from '../../lib/notify/kinds'
import { Icon } from '../ui/icons'
import { Toggle } from '../ui/Toggle'
import { deviceLabel, needsHomeScreen } from './device'
import {
  deletePushDevice,
  savePushSubscription,
  sendTestPush,
  updatePushKinds,
  type PushResult,
} from './pushActions'

export type PushDevice = {
  id: number
  label: string
  kinds: PushKind[]
  lastOk: string | null
  disabled: boolean
  /** SHA-256 of the endpoint (never the endpoint itself) — matched with this browser's. */
  endpointHash: string
}

type Support = 'checking' | 'ok' | 'unsupported' | 'home-screen'

const noop = () => () => {}
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )

/** VAPID public key (URL-safe base64) as the bytes `pushManager.subscribe` wants. */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}

/** SHA-256 hex of this browser's endpoint, the same as the server's `endpointHash`. */
async function hashOf(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function supportOf(): Support {
  if (typeof window === 'undefined') return 'checking'
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  if (needsHomeScreen(navigator.userAgent, standalone)) return 'home-screen'
  const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  return ok ? 'ok' : 'unsupported'
}

/**
 * Settings → Powiadomienia na telefon (ADR-G010, panel spec §2a pt 12, §13): switch this device
 * on, the list of the user's devices with their kinds, „Usuń” and „Wyślij próbne”, and the
 * iPhone instruction. The service worker only shows pushes (no cache, no offline).
 */
export function PushSettings({
  publicKey,
  devices,
  admin,
}: {
  /** `null` = no VAPID keys on the server: push is off. */
  publicKey: string | null
  devices: PushDevice[]
  admin: string
}) {
  const router = useRouter()
  const ready = useHydrated()
  const support: Support = ready ? supportOf() : 'checking'
  const [current, setCurrent] = useState<string | null>(null)
  const [result, setResult] = useState<PushResult | null>(null)
  const [pending, startTransition] = useTransition()

  // This browser's subscription, if any — to mark „to urządzenie” in the list.
  useEffect(() => {
    if (support !== 'ok') return
    let live = true
    navigator.serviceWorker
      .getRegistration(admin)
      .then((reg) => reg?.pushManager.getSubscription())
      .then(async (sub) => {
        const hash = sub ? await hashOf(sub.endpoint) : null
        if (live) setCurrent(hash)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [support, admin])

  function run(action: () => Promise<PushResult>) {
    if (pending) return
    startTransition(async () => {
      const r = await action()
      setResult(r)
      router.refresh()
    })
  }

  function enable() {
    if (!publicKey || pending) return
    startTransition(async () => {
      // TODO(krystian): texts of this section — no board.
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setResult({
            ok: false,
            message: 'Przeglądarka nie pozwoliła na powiadomienia. Zmień to w ustawieniach strony.',
          })
          return
        }
        await navigator.serviceWorker.register(`${admin}/sw.js`, { scope: admin })
        const reg = await navigator.serviceWorker.ready
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes(publicKey),
          }))
        const json = sub.toJSON()
        const r = await savePushSubscription({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
          label: deviceLabel(navigator.userAgent),
        })
        setResult(r)
        if (r.ok) setCurrent(await hashOf(sub.endpoint))
        router.refresh()
      } catch {
        setResult({ ok: false, message: 'Nie udało się włączyć powiadomień na tym urządzeniu.' })
      }
    })
  }

  function remove(device: PushDevice) {
    run(async () => {
      const r = await deletePushDevice({ id: device.id })
      // This browser: also drop its subscription, so it stops getting pushes at once.
      if (r.ok && device.endpointHash === current) {
        const reg = await navigator.serviceWorker.getRegistration(admin)
        await (await reg?.pushManager.getSubscription())?.unsubscribe()
        setCurrent(null)
      }
      return r
    })
  }

  // The switch moves at once; the server's list takes over after the refresh (or puts it back).
  const [shown, showKinds] = useOptimistic(
    devices,
    (state, change: { id: number; kinds: PushKind[] }) =>
      state.map((d) => (d.id === change.id ? { ...d, kinds: change.kinds } : d)),
  )

  function toggleKind(device: PushDevice, kind: PushKind, on: boolean) {
    if (pending) return
    const kinds = on ? [...device.kinds, kind] : device.kinds.filter((k) => k !== kind)
    startTransition(async () => {
      showKinds({ id: device.id, kinds })
      setResult(await updatePushKinds({ id: device.id, kinds }))
      router.refresh()
    })
  }

  const thisOn = current !== null && devices.some((d) => d.endpointHash === current)

  return (
    <div className="pn-push" data-ready={ready || undefined}>
      {!publicKey ? (
        <p className="pn-push__note">
          Powiadomienia push są wyłączone — na serwerze nie ma kluczy VAPID. Alarmy e-mail działają.
        </p>
      ) : support === 'home-screen' ? (
        <p className="pn-push__note">
          Na iPhonie powiadomienia działają z ikony na ekranie głównym: w Safari wybierz „Udostępnij
          → Do ekranu początkowego”, otwórz panel z ikony i włącz je tutaj.
        </p>
      ) : support === 'unsupported' ? (
        <p className="pn-push__note">Ta przeglądarka nie obsługuje powiadomień push.</p>
      ) : (
        <div className="pn-push__on">
          <button
            type="button"
            className="pn-btn pn-btn--gold"
            disabled={!ready || pending || thisOn}
            onClick={enable}
          >
            <Icon name="bell" size={17} />
            {thisOn ? 'Włączone na tym urządzeniu' : 'Włącz na tym urządzeniu'}
          </button>
        </div>
      )}

      {shown.length > 0 ? (
        <ul className="pn-push__list" aria-label="Urządzenia z powiadomieniami">
          {shown.map((d) => (
            <li key={d.id} className="pn-push__dev">
              <div className="pn-push__hd">
                <div>
                  <b>
                    {d.label}
                    {d.endpointHash === current ? <small> · to urządzenie</small> : null}
                  </b>
                  <small className={d.disabled ? 'pn-push__bad' : undefined}>
                    {d.disabled
                      ? 'wyłączone po błędach — usuń i włącz ponownie'
                      : d.lastOk
                        ? `ostatnie doręczenie: ${d.lastOk}`
                        : 'jeszcze nic nie wysłano'}
                  </small>
                </div>
                <div className="pn-push__acts">
                  <button
                    type="button"
                    className="pn-btn"
                    disabled={!ready || pending || !publicKey}
                    onClick={() => run(() => sendTestPush({ id: d.id }))}
                  >
                    Wyślij próbne
                  </button>
                  <button
                    type="button"
                    className="pn-btn pn-btn--quiet"
                    disabled={!ready || pending}
                    onClick={() => remove(d)}
                    aria-label={`Usuń ${d.label}`}
                  >
                    Usuń
                  </button>
                </div>
              </div>
              <fieldset className="pn-push__kinds">
                <legend className="pn-sr">Rodzaje powiadomień: {d.label}</legend>
                {PUSH_KINDS.map((kind) => (
                  <Toggle
                    key={kind}
                    id={`pn-push-${d.id}-${kind}`}
                    label={PUSH_KIND_LABELS[kind]}
                    checked={d.kinds.includes(kind)}
                    disabled={!ready || pending}
                    onChange={(e) => toggleKind(d, kind, e.target.checked)}
                  />
                ))}
              </fieldset>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="pn-formstatus" role="status" aria-live="polite">
        {pending ? 'Zapisuję…' : (result?.message ?? '')}
      </p>
    </div>
  )
}
