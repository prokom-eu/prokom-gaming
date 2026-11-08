'use client'

import { useState, useTransition } from 'react'

import { Toggle } from '../ui/Toggle'
import { setOrderSwitch, type SwitchName } from './actions'

/**
 * Section „Zamówienia i klienci” of /admin/ustawienia (board Ustawienia): each switch saves at
 * once. The board's „Zaproszenie do konta klienta po wpłacie” has no feature behind it yet — not
 * shown (STAN).
 */
export function OrderSwitches({ initial }: { initial: Record<SwitchName, boolean> }) {
  const [values, setValues] = useState(initial)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const flip = (name: SwitchName, value: boolean) => {
    const before = values[name]
    setValues((v) => ({ ...v, [name]: value }))
    setMessage(null)
    start(async () => {
      const result = await setOrderSwitch(name, value)
      if (!result.ok) {
        setValues((v) => ({ ...v, [name]: before }))
        setMessage(result.message)
      }
    })
  }

  return (
    <div aria-busy={pending}>
      <Toggle
        id="pn-stage-email"
        label="E-mail do klienta przy zmianie etapu"
        hint="opłacone, montaż, testy, wysłane"
        checked={values.stageEmail}
        onChange={(e) => flip('stageEmail', e.currentTarget.checked)}
      />
      <Toggle
        id="pn-workshop-strip"
        label="Pokazuj zamówienia na tablicy warsztatu"
        hint="na stronie tylko nazwa zestawu i etap, bez danych klienta"
        checked={values.workshopStrip}
        onChange={(e) => flip('workshopStrip', e.currentTarget.checked)}
      />
      <p className="pn-formstatus" role="status" aria-live="polite">
        {message ?? ''}
      </p>
      <p className="pn-note">
        Zapytania bez zamówienia usuwamy po 24 miesiącach od ostatniego kontaktu.
      </p>
    </div>
  )
}
