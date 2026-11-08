'use client'

import { useState, useTransition } from 'react'

import { Toggle } from '../ui/Toggle'
import { setWeeklySwitch, type WeeklySwitch as Name } from './actions'

const TEXT: Record<Name, { label: string; hint: string }> = {
  weeklyPrices: {
    label: 'Raport tygodniowy w poniedziałek',
    hint: 'podsumowanie zmian i marży na e-mail',
  },
  weeklyTraffic: { label: 'Raport tygodniowy ruchu', hint: 'w poniedziałek razem z raportem cen' },
}

/** One switch of the Monday report (board Ustawienia, P8): saved at once. */
export function WeeklySwitch({ name, initial }: { name: Name; initial: boolean }) {
  const [checked, setChecked] = useState(initial)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <div aria-busy={pending}>
      <Toggle
        id={`pn-${name}`}
        label={TEXT[name].label}
        hint={TEXT[name].hint}
        checked={checked}
        onChange={(e) => {
          const value = e.currentTarget.checked
          setChecked(value)
          setMessage(null)
          start(async () => {
            const result = await setWeeklySwitch(name, value)
            if (!result.ok) {
              setChecked(!value)
              setMessage(result.message)
            }
          })
        }}
      />
      <p className="pn-formstatus" role="status" aria-live="polite">
        {message ?? ''}
      </p>
    </div>
  )
}
