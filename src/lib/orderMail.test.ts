import { describe, expect, it } from 'vitest'

import { buildStageMail, DEFAULT_STAGE_TEMPLATE } from './orderMail'

const base = {
  to: 'bartek@example.com',
  orderNumber: 'Z-2026-0012',
  stage: 'test' as const,
  buildName: 'Skrzat',
  signature: 'Krystian · PRO-KOM Gaming',
}

describe('buildStageMail', () => {
  it('fills the spec §4 template when the database has none', () => {
    const mail = buildStageMail({ ...base, template: null })
    expect(mail.text).toBe(
      'Dzień dobry,\n\nTwój komputer Skrzat (zamówienie Z-2026-0012) jest teraz na etapie: Testy.\n\nKrystian · PRO-KOM Gaming',
    )
    expect(mail.subject).toBe('[Z-2026-0012] Twój komputer: Testy')
    expect(mail.to).toBe('bartek@example.com')
  })

  it('uses the template from the panel', () => {
    const mail = buildStageMail({ ...base, template: 'Etap {etap} dla {nr_zam}. {podpis}' })
    expect(mail.text).toBe('Etap Testy dla Z-2026-0012. Krystian · PRO-KOM Gaming')
  })

  it('never leaves a placeholder for the customer', () => {
    const mail = buildStageMail({ ...base, buildName: null, signature: null, template: null })
    expect(mail.text).not.toMatch(/\{/)
    expect(mail.text).toContain('Twój komputer (zamówienie Z-2026-0012)')
  })

  it('escapes the HTML version', () => {
    const mail = buildStageMail({ ...base, template: `${DEFAULT_STAGE_TEMPLATE} <b>` })
    expect(mail.html).toContain('&lt;b&gt;')
  })
})
