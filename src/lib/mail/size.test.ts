import { describe, expect, it } from 'vitest'

import { notificationEmail, type InquiryForEmail } from '../inquiry/emails'

/** Gmail clips a mail above ~102 KB of HTML („Wiadomość została przycięta”). */
const GMAIL_CLIP = 102 * 1024

describe('mail size', () => {
  it('the fullest notification stays below Gmail’s clipping limit', () => {
    const long = 'Długi tekst klienta z wieloma szczegółami. '.repeat(60)
    const inquiry: InquiryForEmail = {
      number: 'PKG-2026-0047',
      type: 'custom_list',
      computer: {
        buildName: 'Wilkołak',
        config: { level: 'P14', case: 'LB500', cooler: 'PL3LX', ram: 'R32', ssd: 'NM2' },
        labels: { level: 'RTX 5070', case: 'Lancool', cooler: 'PA120', ram: '32 GB', ssd: '2 TB' },
        price: 9890,
        publishedAt: '2026-10-25T10:00:00.000Z',
      },
      games: Array.from({ length: 20 }, (_, i) => `Gra ${i}`),
      otherGames: long,
      extras: ['monitor', 'office'],
      customList: long,
      name: 'Jan Kowalski',
      email: 'jan@example.test',
      phone: '+48 600 100 200',
      message: long,
      source: { url: 'https://prokomgaming.pl/zapytanie', utmSource: 'tiktok' },
      consent: { clauseVersion: '2026-10-27', acceptedAt: '2026-11-02T08:57:00.000Z' },
      marketingConsent: true,
    }
    const { html } = notificationEmail(inquiry, { to: 'g@example.test', panelUrl: 'https://x.pl' })
    expect(Buffer.byteLength(html ?? '', 'utf8')).toBeLessThan(GMAIL_CLIP)
  })
})
