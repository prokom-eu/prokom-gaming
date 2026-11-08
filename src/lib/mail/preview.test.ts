import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it } from 'vitest'

import { confirmationEmail, notificationEmail, type InquiryForEmail } from '../inquiry/emails'
import { resetEmailHtml, verifyEmailHtml } from '../account/emails'
import { acceptanceMail } from '../inquiry/acceptance'
import { replyHtml } from '../inquiry/replyHtml'
import { alertHtml } from '../notify/alertMail'
import { buildStageMail } from '../orderMail'
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
    const signature = 'Krystian · PRO-KOM Gaming\nRabka-Zdrój, ul. Orkana 16B · +48 883 200 151'
    const brand = {
      number: 'PKG-2026-0047',
      signature,
      siteUrl: 'https://prokomgaming.pl',
      replyAddress: 'kontakt@prokomgaming.pl',
    }
    write('b-odpowiedz', {
      subject: 'Re: [PKG-2026-0047] Wilkołak',
      ...replyHtml({
        ...brand,
        body: `Dzień dobry,

dziękuję za zapytanie PKG-2026-0047. Wilkołaka składamy w Rabce-Zdroju w 5–10 dni roboczych od wpłaty; przed wysyłką każdy egzemplarz przechodzi test i pomiar klatek w Twoich grach. Odbiór osobisty w Rabce-Zdroju jest możliwy.

Za chwilę wyślę ofertę z imienną listą części, ważną 48 godzin.

${signature}`,
      }),
    })
    const parts = [
      { role: 'Procesor', model: 'AMD Ryzen 7 7800X3D' },
      { role: 'Karta graficzna', model: 'MSI GeForce RTX 5070 Ventus 2X OC 12G' },
      { role: 'Płyta główna', model: 'MSI B650 Gaming Plus WiFi' },
      { role: 'Zasilacz', model: 'Corsair RM750e 750 W 80+ Gold' },
      { role: 'Pamięć RAM', model: 'Kingston Fury Beast 32 GB (2×16) DDR5 6000 CL30' },
      { role: 'Dysk', model: 'Samsung 990 EVO Plus 2 TB NVMe' },
      { role: 'Obudowa', model: 'Lian Li Lancool 207 biała' },
      { role: 'Chłodzenie', model: 'Thermalright Peerless Assassin 120 SE' },
    ]
    write('b-oferta', {
      subject: 'Re: [PKG-2026-0047] Wilkołak',
      ...replyHtml({
        ...brand,
        body: `Dzień dobry,

przesyłam ofertę PKG-2026-0047: Wilkołak, 9 890 zł z montażem, testami, Windows 11 i wysyłką. Oferta ważna 48 godzin.

Skład:
${parts.map((p) => `• ${p.model}`).join('\n')}

Płatność przelewem albo BLIK po pro formie. Gwarancja 2 lata, kurier odbiera od Ciebie.

${signature}`,
        offer: {
          topic: 'Wilkołak',
          buildName: 'Wilkołak',
          parts,
          price: '9 890 zł',
          leadTime: '5–10 dni roboczych',
        },
      }),
    })
    for (const [name, stage] of [
      ['c-etap-montaz', 'assembly'],
      ['c-etap-wyslane', 'shipped'],
    ] as const) {
      write(
        name,
        buildStageMail({
          to: 'jan.kowalski@example.test',
          orderNumber: 'Z-2026-0019',
          stage,
          buildName: 'Wilkołak',
          signature,
          template: null,
          trackingNumber: stage === 'shipped' ? '6234 5678 9012 3456' : null,
          siteUrl: 'https://prokomgaming.pl',
        }),
      )
    }
    write('d-konto-weryfikacja', {
      subject: 'Potwierdź adres e-mail — konto PRO-KOM Gaming',
      html: verifyEmailHtml({
        name: 'Jan',
        link: 'https://prokomgaming.pl/konto/potwierdz?token=abc',
      }),
    })
    write('d-konto-haslo', {
      subject: 'Nowe hasło do konta PRO-KOM Gaming',
      html: resetEmailHtml({ name: 'Jan', link: 'https://prokomgaming.pl/konto/haslo?token=abc' }),
    })
    write('e-alert-ceny', {
      subject: 'Raport cen: zmiany wymagające uwagi',
      ...alertHtml({
        subject: 'Raport cen: zmiany wymagające uwagi',
        text: [
          'Sprawdzanie cen znalazło zmiany wymagające uwagi:',
          '',
          '- MSI GeForce RTX 5070 Ventus 2X: +180 zł u dostawcy (marża Wilkołaka spada do 9%)',
          '- AMD Ryzen 7 7800X3D: brak w magazynie u 2 z 3 dostawców',
          '',
          'Raport: https://prokomgaming.pl/admin/raporty-cen/7',
          'Nic nie zmieniło się na stronie — nowe ceny zatwierdzasz w panelu.',
        ].join('\n'),
        siteUrl: 'https://prokomgaming.pl',
      }),
    })
    write(
      'b-akceptacja',
      acceptanceMail({
        to: 'jan.kowalski@example.test',
        number: 'PKG-2026-0047',
        topic: 'Wilkołak',
        buildName: 'Wilkołak',
        leadTime: '5–10 dni roboczych od wpłaty',
        siteUrl: 'https://prokomgaming.pl',
        messageId: '<a@prokomgaming.pl>',
        previousIds: [],
      }),
    )
  })
})
