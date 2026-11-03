import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it } from 'vitest'

import { confirmationEmail, notificationEmail, type InquiryForEmail } from '../inquiry/emails'
import { LOGO_CID } from './layout'

/**
 * Not a check — writes every e-mail to HTML for a look in a browser and a real send to the
 * inbox (Thunderbird, Gmail, Outlook). Runs only with MAIL_PREVIEW=<folder>:
 *   MAIL_PREVIEW=../mail-preview pnpm exec vitest run src/lib/mail/preview.test.ts
 * For each mail: <name>.html (logo inline as data: URI, for the browser) and <name>.cid.html +
 * <name>.subject.txt (as sent, logo by CID).
 */
const out = process.env.MAIL_PREVIEW

const sample: InquiryForEmail = {
  number: 'PKG-2026-0047',
  type: 'build',
  computer: {
    buildName: 'Wilkołak',
    config: { level: 'P14', case: 'LB500', cooler: 'PL3LX', ram: 'R32', ssd: 'NM2' },
    labels: {
      level: 'RTX 5070 · Ryzen 7 7800X3D',
      case: 'Lian Li Lancool 207',
      cooler: 'Thermalright Peerless Assassin 120',
      ram: '32 GB DDR5 6000',
      ssd: '2 TB NVMe Gen4',
    },
    price: 9890,
    publishedAt: '2026-10-25T10:00:00.000Z',
  },
  lightColor: undefined,
  forWhom: 'self',
  budget: undefined,
  games: ['Counter-Strike 2', 'Cyberpunk 2077', 'Baldur’s Gate 3'],
  otherGames: 'Blender, OBS do streamów',
  monitor: 'qhd',
  refresh: '144',
  caseColor: 'white',
  lighting: 'subtle',
  extras: ['monitor', 'office'],
  name: 'Jan Kowalski',
  email: 'jan.kowalski@example.test',
  phone: '+48 600 100 200',
  preferredContact: 'phone',
  pickup: 'courier',
  invoice: 'company',
  nip: '7352511447',
  message: 'Dzień dobry, czy da się dołożyć drugi dysk 1 TB? Najlepiej kontakt po 16.\nDzięki!',
  source: {
    url: 'https://prokomgaming.pl/zestawy/wilkolak',
    utmSource: 'tiktok',
    utmMedium: 'social',
  },
  consent: { clauseVersion: '2026-10-27', acceptedAt: '2026-11-02T08:57:00.000Z' },
  marketingConsent: false,
}

type Rendered = { subject: string; html?: string; attachments?: { content: string; cid: string }[] }

function write(name: string, mail: Rendered) {
  if (!out || !mail.html) return
  mkdirSync(out, { recursive: true })
  const logo = mail.attachments?.find((a) => a.cid === LOGO_CID)?.content ?? ''
  writeFileSync(join(out, `${name}.cid.html`), mail.html)
  writeFileSync(join(out, `${name}.subject.txt`), mail.subject)
  writeFileSync(
    join(out, `${name}.html`),
    mail.html.replaceAll(`cid:${LOGO_CID}`, `data:image/png;base64,${logo}`),
  )
}

describe.runIf(out)('mail preview', () => {
  it('writes every e-mail', () => {
    write(
      'a-potwierdzenie',
      confirmationEmail(sample, {
        responseTime: 'w ciągu godziny (codziennie 8–22)',
        replyTo: 'kontakt@prokomgaming.pl',
        siteUrl: 'https://prokomgaming.pl',
      }),
    )
    write(
      'powiadomienie',
      notificationEmail(sample, {
        to: 'kontakt@prokomgaming.pl',
        panelUrl: 'https://prokomgaming.pl/admin/zapytania/PKG-2026-0047',
      }),
    )
  })
})
