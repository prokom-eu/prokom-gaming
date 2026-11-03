import { DEFAULT_SITE_URL, mailFooter, originOf } from '../mail/brand'
import { renderMail, type KeyValue, type MailBlock, type RenderedMail } from '../mail/layout'

/**
 * The HTML of a team alert (SLA, margin, mail intake, price report, budget, weekly report): the
 * jobs write plain text, this lays it out in the brand look. Nothing is added to the words:
 * - „Etykieta: https://…” lines become buttons (the first one gold) — „Raport”, „Zapytanie w panelu”;
 * - a paragraph of „Klucz: wartość” lines becomes a table, „- …” / „• …” lines a list;
 * - everything else stays a paragraph.
 * Pure — the notify job sends it next to the text.
 */

const LINK_LINE = /^([^:\n]{1,40}):\s*(https?:\/\/\S+)\s*$/
const KEY_VALUE = /^([^:\n]{1,40}):\s+(.+)$/
const BULLET = /^\s*[-•–]\s+/

export function alertHtml(input: {
  subject: string
  text: string
  siteUrl?: string
}): RenderedMail {
  const siteUrl = input.siteUrl ? originOf(input.siteUrl) : DEFAULT_SITE_URL
  const links: { label: string; href: string }[] = []
  const blocks: MailBlock[] = []

  const paragraphs = input.text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
  for (const paragraph of paragraphs) {
    const kept: string[] = []
    for (const line of paragraph.split('\n')) {
      const link = LINK_LINE.exec(line.trim())
      if (link?.[1] && link[2]) links.push({ label: link[1].trim(), href: link[2] })
      else kept.push(line)
    }
    const lines = kept.map((l) => l.trimEnd()).filter((l) => l.trim() !== '')
    if (lines.length === 0) continue

    const bullets = lines.filter((l) => BULLET.test(l))
    if (bullets.length === lines.length) {
      blocks.push({ kind: 'list', items: lines.map((l) => l.replace(BULLET, '')) })
    } else if (
      bullets.length > 0 &&
      bullets.length === lines.length - 1 &&
      !BULLET.test(lines[0] ?? '')
    ) {
      // „Sprawdzanie znalazło…:” followed by the points.
      blocks.push({ kind: 'paragraph', text: lines[0] ?? '' })
      blocks.push({ kind: 'list', items: lines.slice(1).map((l) => l.replace(BULLET, '')) })
    } else if (lines.length > 1 && lines.every((l) => KEY_VALUE.test(l))) {
      const rows: KeyValue[] = lines.map((l) => {
        const [, label = '', value = ''] = KEY_VALUE.exec(l) ?? []
        return { label: label.trim(), value: value.trim() }
      })
      blocks.push({ kind: 'section', title: 'Szczegóły', rows })
    } else {
      blocks.push({ kind: 'paragraph', text: lines.join('\n') })
    }
  }

  if (links.length > 0) {
    blocks.push({
      kind: 'buttons',
      buttons: links.map((l, i) => ({ label: `${l.label} →`, href: l.href, primary: i === 0 })),
    })
  }

  return renderMail({
    preheader: paragraphs[0]?.replace(/\s+/g, ' ').slice(0, 140) ?? '',
    tagLabel: 'Powiadomienie z panelu',
    title: input.subject,
    blocks,
    footer: mailFooter(siteUrl, 'Powiadomienie wewnętrzne PRO-KOM Gaming — nie przekazuj dalej.'),
  })
}
