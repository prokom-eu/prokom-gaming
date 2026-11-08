import type { InputHTMLAttributes } from 'react'

/**
 * On/off row (settings): a real checkbox (switch) with a visible label and a hint. Works in a
 * plain form (`name`) or controlled (`checked` + `onChange` from a client component).
 */
export function Toggle({
  label,
  hint,
  id,
  ...input
}: { label: string; hint?: string; id: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'id'
>) {
  return (
    <div className="pn-togrow">
      <div>
        <label htmlFor={id}>
          <b>{label}</b>
        </label>
        {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
      </div>
      <span className="pn-tog">
        <input
          {...input}
          id={id}
          type="checkbox"
          role="switch"
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <span aria-hidden="true" />
      </span>
    </div>
  )
}
