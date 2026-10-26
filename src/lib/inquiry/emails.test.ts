import { describe, expect, it } from 'vitest'

import { confirmationEmail, notificationEmail, type InquiryForEmail } from './emails'

const inquiry: InquiryForEmail = {
  number: 'PKG-2026-0007',
  type: 'build',
  computer: {
    buildName: 'Wampir',
    config: { level: 'P13', case: 'LB500', cooler: 'PL3LX', ram: 'R32', ssd: 'NM1' },
    labels: {
      level: 'RTX 5070 Ti · Ryzen 7',
      case: 'Lian Li Lancool 207',
      cooler: 'Peerless Assassin',
      ram: '32 GB DDR5',
      ssd: '1 TB NVMe',
    },
    price: 14540,
    publishedAt: '2026-10-25T10:00:00.000Z',
  },
  games: ['Counter-Strike 2', 'Cyberpunk 2077'],
  otherGames: 'Blender',
  monitor: 'qhd',
  refresh: '144',
  caseColor: 'white',
  lighting: 'subtle',
  extras: ['monitor', 'office'],
  name: 'Jan',
  email: 'jan@example.test',
  phone: '+48 600 100 200',
  preferredContact: 'phone',
  pickup: 'rabka',
  invoice: 'company',
  nip: '7352511447',
  message: 'Proszę o kontakt po 16.',
  source: { url: 'https://prokomgaming.pl/zapytanie?zestaw=wampir', utmSource: 'tiktok' },
  consent: { clauseVersion: '2026-10-27', acceptedAt: '2026-10-27T11:00:00.000Z' },
  marketingConsent: false,
}

describe('notificationEmail', () => {
  const mail = notificationEmail(inquiry, {
    to: 'gaming@example.test',
    panelUrl: 'http://localhost:3100/admin/collections/inquiries/7',
  })

  it('subject: number, type and build; Reply-To: the customer', () => {
    expect(mail.subject).toBe('Zapytanie PKG-2026-0007 — Gotowy zestaw — Wampir')
    expect(mail.to).toBe('gaming@example.test')
    expect(mail.replyTo).toBe('jan@example.test')
  })

  it('has every field with labels from the form, codes next to public names, the panel link', () => {
    for (const line of [
      'Zestaw: Wampir',
      '- Poziom mocy: RTX 5070 Ti · Ryzen 7 (P13)',
      '- Pamięć: 32 GB DDR5 (R32)',
      'Cena: 14 540 zł brutto (cena z dnia 25.10.2026)',
      'Gry: Counter-Strike 2, Cyberpunk 2077',
      'Monitor: 2K, 144 Hz',
      'Obudowa: Biała',
      'Podświetlenie: Stonowane',
      'Potrzebujesz też: Monitor, Pakiet Office',
      'Telefon: +48 600 100 200',
      'Odpowiedź: Telefon',
      'Odbiór: Sklep w Rabce-Zdroju',
      'Faktura: Na firmę',
      'NIP: 7352511447',
      'Proszę o kontakt po 16.',
      'utm_source: tiktok',
      'Zgoda marketingowa: nie',
      'Zapytanie w panelu: http://localhost:3100/admin/collections/inquiries/7',
    ]) {
      expect(mail.text).toContain(line)
    }
  })

  it('keeps header values on one line', () => {
    const evil = notificationEmail(
      {
        ...inquiry,
        computer: { ...inquiry.computer!, buildName: 'Wampir\r\nBcc: x@example.test' },
      },
      { to: 'g@example.test', panelUrl: 'x' },
    )
    expect(evil.subject).not.toMatch(/[\r\n]/)
  })

  it('an inquiry without a computer has no configuration block', () => {
    const advice = notificationEmail(
      { ...inquiry, type: 'advice', computer: null, forWhom: 'child', budget: 'unsure' },
      { to: 'g@example.test', panelUrl: 'x' },
    )
    expect(advice.subject).toBe('Zapytanie PKG-2026-0007 — Pomóżcie mi dobrać')
    expect(advice.text).toContain('Dla kogo: Dla dziecka')
    expect(advice.text).toContain('Budżet: Nie wiem, doradźcie')
    expect(advice.text).not.toContain('Cena:')
  })
})

describe('confirmationEmail', () => {
  const mail = confirmationEmail(inquiry, {
    responseTime: 'zwykle w godzinę, codziennie 8–22',
    replyTo: 'gaming@example.test',
  })

  it('goes to the customer with the number, the computer and the price; replies to Gaming', () => {
    expect(mail.to).toBe('jan@example.test')
    expect(mail.replyTo).toBe('gaming@example.test')
    expect(mail.subject).toBe('Otrzymaliśmy Twoje zapytanie PKG-2026-0007 — PRO-KOM Gaming')
    expect(mail.text).toContain('Odpiszemy zwykle w godzinę, codziennie 8–22.')
    expect(mail.text).toContain('- Poziom mocy: RTX 5070 Ti · Ryzen 7\n')
    // Thousands separator of `pl-PL` is a non-breaking space.
    expect(mail.text).toContain('Cena: 14 540 zł brutto')
  })

  it('does not repeat what the person wrote or their contact details, nor item codes', () => {
    for (const text of ['Proszę o kontakt', '+48 600 100 200', '7352511447', 'Blender', '(P13)']) {
      expect(mail.text).not.toContain(text)
    }
  })

  it('works without a response time in the settings', () => {
    const plain = confirmationEmail(inquiry, { responseTime: null, replyTo: null })
    expect(plain.text).toContain('Odpiszemy najszybciej, jak się da.')
    expect(plain).not.toHaveProperty('replyTo')
  })
})
