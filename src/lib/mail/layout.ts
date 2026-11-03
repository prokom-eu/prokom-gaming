import { LOGO_PNG_BASE64, LOGO_PNG_SIZE } from './logo'

/**
 * One look for every PRO-KOM Gaming e-mail: dark like the site (night, bone, gold), the brand
 * mark on top and in the footer.
 *
 * Why this shape:
 * - Dark by design, the same in a light and a dark inbox. Thunderbird's dark reader
 *   (mail/base/content/modules/DarkReader.mjs) strips gradients, gold text and link colours from
 *   every mail unless the root's computed `filter` contains `invert(1)` — so the root carries
 *   `invert(1) invert(1)`: two inversions cancel out, the mail looks the same, Thunderbird
 *   leaves it alone. `color-scheme: dark` and `darkreader-lock` cover other readers.
 * - Table layout with inline styles: Outlook (Word engine) and Gmail ignore much of the CSS.
 *   Gradients and glows are extras on top of solid `bgcolor` fallbacks.
 * - Link text sits in a <span> with its own colour: Thunderbird and Outlook repaint bare links.
 * - The mark is a PNG attached inline (CID): mail programs do not render SVG, Outlook blocks
 *   remote images by default, Gmail drops `data:` URIs. 4 KB, shown at once everywhere.
 * - Every value from a customer goes through `esc` — blocks take plain text, never HTML.
 * - Width 600 px, fluid below; columns marked `stack` fall under each other on a phone.
 */

export const LOGO_CID = 'logo@prokomgaming.pl'

/**
 * Colours from src/styles/tokens.css (ADR-G003). Mail programs know no CSS variables, so the values
 * are copied here; `tokens.mail.test.ts` fails when they drift from the tokens.
 */
export const MAIL_COLORS = {
  page: '#040706', // --smola
  tag: '#07100e', // --noc
  card: '#0a1411',
  panel: '#0e1916', // --mech, a touch lighter for depth
  panelHead: '#122019',
  foot: '#030504', // --foot
  line: '#1e2b26',
  lineStrong: '#2b3a34',
  text: '#ece4d0', // --kosc
  text2: '#cdc3ab', // --kosc2
  muted: '#9a9583', // --mgla
  gold: '#F2C230', // --grom
  gold2: '#FFE08A', // --grom2
  onGold: '#1a1305', // --on-grom
  ok: '#7fd56a', // --src-pk-text
} as const
const C = MAIL_COLORS

/** Accent of each build (tokens `--c-<build>`), by the build's name. */
export const BUILD_ACCENTS: Record<string, string> = {
  skrzat: '#E0A64B',
  licho: '#7CF26B',
  bies: '#C3F25B',
  wodnik: '#7FB6FF',
  strzyga: '#FF4D8D',
  kikimora: '#B26BFF',
  zmora: '#FF6A55',
  rusalka: '#9FE7FF',
  'baba jaga': '#B26BFF',
  bazyliszek: '#59E0C5',
  'pani zimy': '#9FE7FF',
  wilkolak: '#C0C7D1',
  wampir: '#E0322B',
  weles: '#FFB04D',
  zmij: '#FF7A1A',
  perun: '#F2C230',
}

export function buildAccent(name: string | null | undefined): string | undefined {
  if (!name) return undefined
  const key = name
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-_]+/g, ' ')
    .trim()
  return BUILD_ACCENTS[key]
}

const SANS = "'Segoe UI', 'Helvetica Neue', Roboto, Arial, sans-serif"
const SERIF = "Georgia, 'Times New Roman', serif"
const GOLD_LINE = `background:${C.gold};background-image:linear-gradient(90deg,${C.gold} 0%,${C.gold2} 50%,${C.gold} 100%)`
const GOLD_BUTTON = `background:${C.gold};background-image:linear-gradient(180deg,${C.gold2} 0%,${C.gold} 100%)`

const STYLE = `
:root{color-scheme:dark;supported-color-schemes:dark}
html{filter:invert(1) invert(1)}
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0;mso-table-rspace:0}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
a{text-decoration:none}
u+.body a,#MessageViewBody a{color:inherit;text-decoration:none}
@media (max-width:620px){
  .px{padding-left:20px!important;padding-right:20px!important}
  .h1{font-size:30px!important}
  .stack{display:block!important;width:100%!important;max-width:100%!important;box-sizing:border-box}
  .stack-gap{padding:0 0 14px!important;text-align:left!important}
  .btn{display:table!important;margin:0 0 10px!important;width:100%!important}
  .btn td{text-align:center!important}
  .price{font-size:28px!important}
  .stage-l{font-size:9px!important;letter-spacing:-.01em}
  .stage-c{padding:0!important}
  .logo{width:120px!important;height:auto!important}
  .outer{padding-left:8px!important;padding-right:8px!important}
}
`

export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Plain text with line breaks as escaped HTML. */
function lines(value: string): string {
  return (
    esc(value)
      // Numbers like Z-2026-0019 never break at a hyphen.
      .replace(/\b([A-Z]{1,3}-\d{4}-\d{4})\b/g, '<span style="white-space:nowrap">$1</span>')
      .replace(/\r?\n/g, '<br>')
  )
}

/**
 * The mark set in text, for mails that cannot carry an attachment (Payload's account e-mails take
 * HTML only): PRO–KOM with the gold dash, GAMING under a gold rule — the brand book's lockup.
 */
function wordmark(width: number): string {
  const size = Math.round(width * 0.165)
  return `<table ${TABLE} style="border-collapse:separate"><tr><td style="font:900 ${size}px/1 'Arial Black','Segoe UI',Arial,sans-serif;letter-spacing:.01em;color:${C.text};white-space:nowrap">PRO<span style="color:${C.gold}">&ndash;</span>KOM</td></tr>
<tr><td align="right" style="padding-top:${Math.round(size * 0.25)}px"><table ${TABLE} align="right"><tr><td style="border-top:2px solid ${C.gold};padding-top:${Math.round(size * 0.2)}px;font:700 ${Math.max(8, Math.round(size * 0.36))}px/1 ${SANS};letter-spacing:.32em;color:${C.text}">GAMING</td></tr></table></td></tr></table>`
}

/** Only http(s), mailto: and tel: links leave our hands. */
function safeHref(href: string): string {
  return /^(https?:\/\/|mailto:|tel:)/i.test(href) ? esc(href) : '#'
}

/** A link whose colour survives clients that repaint links (the span carries the colour). */
function link(href: string, html: string, color: string, underline = false): string {
  const deco = underline ? 'underline' : 'none'
  return `<a href="${safeHref(href)}" style="color:${color};text-decoration:${deco}"><span style="color:${color};text-decoration:${deco}">${html}</span></a>`
}

export type KeyValue = { label: string; value: string; href?: string; strong?: boolean }

export type MailBlock =
  | { kind: 'paragraph'; text: string; muted?: boolean }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'section'; title: string; rows: KeyValue[]; note?: string }
  | {
      kind: 'card'
      eyebrow: string
      title: string
      subtitle?: string
      /** The build's own colour (see `buildAccent`); gold when absent. */
      accent?: string
      rows?: KeyValue[]
      price?: { label: string; value: string; note?: string }
    }
  | {
      /** The person behind an inquiry, at a glance (team mails only). */
      kind: 'person'
      eyebrow: string
      name: string
      items: KeyValue[]
      aside?: { label: string; value: string; note?: string }
    }
  | { kind: 'steps'; title: string; steps: { title: string; text: string }[] }
  | {
      kind: 'table'
      title?: string
      columns: string[]
      rows: string[][]
      /** Index of a right-aligned column (prices). */
      alignRight?: number[]
      total?: { label: string; value: string; note?: string }
    }
  | { kind: 'stages'; label: string; stages: string[]; current: number }
  | { kind: 'quote'; title: string; text: string }
  | { kind: 'buttons'; buttons: { label: string; href: string; primary?: boolean }[] }
  | { kind: 'callout'; title?: string; text: string; button?: { label: string; href: string } }
  | { kind: 'signature'; lines: string[] }
  | { kind: 'divider' }

export type MailInput = {
  /** Hidden first line shown by inboxes next to the subject. */
  preheader: string
  /** Text in the tag, right side (e.g. „Zapytanie PKG-2026-0047”); the number is set apart. */
  tagLabel: string
  /** Small status pill above the headline (e.g. „Wysłane 2.11.2026, 09:57”). */
  status?: string
  /** Large serif headline; empty for replies that start with „Dzień dobry”. */
  title?: string
  lead?: string
  blocks: MailBlock[]
  footer: MailFooter
  /** The mark in text instead of the attached image (mails sent without attachments). */
  textLogo?: boolean
}

/** The footer: the brand mark, contact you can tap, links, the legal line and why the mail came. */
export type MailFooter = {
  contact: { label: string; value: string; href?: string }[]
  legal: string[]
  links?: { label: string; href: string }[]
  note?: string
}

export type RenderedMail = {
  html: string
  attachments: {
    filename: string
    content: string
    encoding: 'base64'
    cid: string
    contentType: string
  }[]
}

const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"'
const SEP = 'style="border-collapse:separate"'
const row = (style: string, inner: string) => `<tr><td style="${style}">${inner}</td></tr>`
const spacer = (h: number) =>
  `<div style="height:${h}px;line-height:${h}px;font-size:0">&nbsp;</div>`

function eyebrow(text: string, color: string = C.gold): string {
  return `<div style="font:700 11px/1.4 ${SANS};letter-spacing:.2em;text-transform:uppercase;color:${color}">${esc(text)}</div>`
}

function value(kv: KeyValue, color: string = C.text): string {
  return kv.href ? link(kv.href, lines(kv.value), color, true) : lines(kv.value)
}

/** Label | value rows — small uppercase labels, values in bone, hairlines between. */
function keyValueRows(rows: KeyValue[]): string {
  return rows
    .filter((r) => r.value.trim() !== '')
    .map((r, i) => {
      const border = i > 0 ? `border-top:1px solid ${C.line};` : ''
      return `<tr>
<td valign="top" width="38%" style="width:38%;padding:12px 14px 12px 0;${border}font:600 11px/1.9 ${SANS};letter-spacing:.12em;text-transform:uppercase;color:${C.muted}">${esc(r.label)}</td>
<td valign="top" style="padding:12px 0;${border}font:${r.strong ? '700' : '500'} 15px/1.5 ${SANS};color:${C.text};word-break:break-word;overflow-wrap:anywhere">${value(r)}</td>
</tr>`
    })
    .join('')
}

function button(label: string, href: string, primary = true): string {
  const text = primary ? C.onGold : C.text
  return `<table ${TABLE} class="btn" style="display:inline-table;margin:0 10px 10px 0;border-collapse:separate"><tr>
<td bgcolor="${primary ? C.gold : C.panel}" style="${primary ? GOLD_BUTTON : `background:${C.panel}`};border:1px solid ${primary ? C.gold : C.lineStrong};border-radius:12px;mso-padding-alt:14px 26px">
<a href="${safeHref(href)}" style="display:block;padding:14px 26px;font:700 15px/1.2 ${SANS};color:${text};text-decoration:none;white-space:nowrap;letter-spacing:.01em"><span style="color:${text}">${esc(label)}</span></a>
</td></tr></table>`
}

/** A panel with a title strip — every group of facts sits in one. */
function panel(title: string, inner: string, note?: string): string {
  return row(
    'padding:0 0 18px',
    `<table ${TABLE} width="100%" bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.line};border-radius:14px;border-collapse:separate">
<tr><td bgcolor="${C.panelHead}" style="background:${C.panelHead};padding:12px 20px;border-bottom:1px solid ${C.line};border-radius:14px 14px 0 0">
<table ${TABLE}><tr><td valign="middle" style="padding-right:10px"><div style="width:6px;height:6px;border-radius:3px;background:${C.gold};font-size:0;line-height:0">&nbsp;</div></td><td valign="middle">${eyebrow(title)}</td></tr></table></td></tr>
<tr><td style="padding:2px 20px 4px">${inner}${
      note
        ? `<p style="margin:0;padding:0 0 12px;font:13px/1.5 ${SANS};color:${C.muted}">${lines(note)}</p>`
        : ''
    }</td></tr>
</table>`,
  )
}

function block(b: MailBlock): string {
  switch (b.kind) {
    case 'paragraph':
      return row(
        'padding:0 0 16px',
        `<p style="margin:0;font:16px/1.7 ${SANS};color:${b.muted ? C.muted : C.text2}">${lines(b.text)}</p>`,
      )
    case 'list':
      return row(
        'padding:0 0 18px',
        `<table ${TABLE} width="100%">${b.items
          .map(
            (item) =>
              `<tr><td valign="top" width="18" style="width:18px;padding:9px 0 0"><div style="width:6px;height:6px;border-radius:3px;background:${C.gold};font-size:0;line-height:0">&nbsp;</div></td><td valign="top" style="padding:2px 0;font:15px/1.6 ${SANS};color:${C.text}">${lines(item)}</td></tr>`,
          )
          .join('')}</table>`,
      )
    case 'heading':
      return row('padding:6px 0 12px', eyebrow(b.text))
    case 'section':
      return panel(b.title, `<table ${TABLE} width="100%">${keyValueRows(b.rows)}</table>`, b.note)
    case 'card': {
      const accent = b.accent ?? C.gold
      const rows =
        b.rows && b.rows.length > 0
          ? `<tr><td style="padding:4px 22px 6px"><table ${TABLE} width="100%">${keyValueRows(b.rows)}</table></td></tr>`
          : ''
      const price = b.price
        ? `<tr><td bgcolor="${C.panelHead}" style="background:${C.panelHead};padding:18px 22px;border-top:1px solid ${C.line};border-radius:0 0 16px 16px">
<table ${TABLE} width="100%"><tr>
<td valign="bottom" style="font:600 11px/1.6 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.muted}">${esc(b.price.label)}${b.price.note ? `<div style="font:12px/1.5 ${SANS};letter-spacing:0;text-transform:none;color:${C.muted}">${esc(b.price.note)}</div>` : ''}</td>
<td class="price" valign="bottom" align="right" style="font:800 32px/1 ${SANS};color:${C.gold};white-space:nowrap;letter-spacing:-.02em">${esc(b.price.value)}</td>
</tr></table></td></tr>`
        : ''
      const headRadius = rows || price ? '16px 16px 0 0' : '16px'
      return row(
        'padding:0 0 26px',
        `<table ${TABLE} width="100%" bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.lineStrong};border-radius:16px;border-collapse:separate">
<tr><td bgcolor="${C.tag}" style="background:${C.tag};background-image:radial-gradient(90% 160% at 100% 0%,${accent}33 0%,${accent}00 60%);padding:22px 22px 20px;border-radius:${headRadius};border-bottom:2px solid ${accent}">
${eyebrow(b.eyebrow, C.muted)}
<div style="padding-top:8px;font:700 30px/1.1 ${SERIF};color:${accent};letter-spacing:.01em">${esc(b.title)}</div>
${b.subtitle ? `<div style="padding-top:8px;font:500 14px/1.45 ${SANS};color:${C.text2}">${esc(b.subtitle)}</div>` : ''}
</td></tr>
${rows}
${price}
</table>`,
      )
    }
    case 'person': {
      const items = b.items.filter((i) => i.value.trim() !== '')
      const cells = items.map(
        (i) =>
          `<td class="stack" valign="top" width="50%" style="width:50%;padding:0 14px 16px 0">
<div style="font:600 10px/1.5 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.muted}">${esc(i.label)}</div>
<div style="padding-top:3px;font:600 15px/1.4 ${SANS};color:${C.text};word-break:break-word;overflow-wrap:anywhere">${value(i)}</div></td>`,
      )
      const grid: string[] = []
      for (let i = 0; i < cells.length; i += 2)
        grid.push(`<tr>${cells[i]}${cells[i + 1] ?? '<td class="stack"></td>'}</tr>`)
      return row(
        'padding:0 0 18px',
        `<table ${TABLE} width="100%" bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.lineStrong};border-radius:16px;border-collapse:separate">
<tr><td style="padding:20px 22px 16px;border-bottom:1px solid ${C.line}">
<table ${TABLE} width="100%"><tr>
<td class="stack stack-gap" valign="middle">${eyebrow(b.eyebrow)}<div style="padding-top:6px;font:700 28px/1.15 ${SERIF};color:${C.text}">${esc(b.name)}</div></td>
${
  b.aside
    ? `<td class="stack stack-gap" valign="middle" align="right" style="text-align:right;padding-left:14px;white-space:nowrap">
<div style="font:600 10px/1.5 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.muted}">${esc(b.aside.label)}</div>
<div class="price" style="padding-top:2px;font:800 30px/1.1 ${SANS};color:${C.gold};letter-spacing:-.02em">${esc(b.aside.value)}</div>
${b.aside.note ? `<div style="font:12px/1.4 ${SANS};color:${C.muted}">${esc(b.aside.note)}</div>` : ''}</td>`
    : ''
}
</tr></table></td></tr>
<tr><td style="padding:18px 22px 4px"><table ${TABLE} width="100%">${grid.join('')}</table></td></tr>
</table>`,
      )
    }
    case 'steps': {
      const last = b.steps.length - 1
      return row(
        'padding:6px 0 24px',
        `${eyebrow(b.title)}${spacer(16)}<table ${TABLE} width="100%">${b.steps
          .map((s, i) => {
            const first = i === 0
            const rail =
              i < last
                ? `background-image:linear-gradient(${C.lineStrong},${C.lineStrong});background-repeat:no-repeat;background-position:15px 36px;background-size:2px 100%;`
                : ''
            return `<tr>
<td valign="top" width="48" style="width:48px;padding:0 16px 0 0;${rail}">
<table ${TABLE} ${SEP}><tr><td align="center" valign="middle" width="32" height="32" bgcolor="${first ? C.gold : C.panel}" style="width:32px;height:32px;border-radius:16px;${first ? GOLD_BUTTON : `background:${C.panel}`};border:1px solid ${first ? C.gold : C.lineStrong};font:700 14px/32px ${SANS};color:${first ? C.onGold : C.gold}">${i + 1}</td></tr></table></td>
<td valign="top" style="padding:5px 0 22px"><div style="font:700 16px/1.4 ${SANS};color:${C.text}">${esc(s.title)}</div><div style="padding-top:3px;font:14px/1.6 ${SANS};color:${C.muted}">${lines(s.text)}</div></td>
</tr>`
          })
          .join('')}</table>`,
      )
    }
    case 'table': {
      const right = new Set(b.alignRight ?? [])
      const head = b.columns
        .map(
          (col, i) =>
            `<th bgcolor="${C.panelHead}" align="${right.has(i) ? 'right' : 'left'}" style="background:${C.panelHead};padding:12px 14px;font:700 10px/1.4 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:${C.gold};border-bottom:1px solid ${C.line}${i === 0 ? ';border-radius:14px 0 0 0' : i === b.columns.length - 1 ? ';border-radius:0 14px 0 0' : ''}">${esc(col)}</th>`,
        )
        .join('')
      const body = b.rows
        .map(
          (cells, r) =>
            `<tr>${cells
              .map(
                (v, i) =>
                  `<td valign="top" align="${right.has(i) ? 'right' : 'left'}" style="padding:12px 14px;${r > 0 ? `border-top:1px solid ${C.line};` : ''}font:${i === 0 ? '600 11px/1.9' : '500 14px/1.5'} ${SANS};${i === 0 ? 'letter-spacing:.1em;text-transform:uppercase;' : ''}color:${i === 0 ? C.muted : C.text}${right.has(i) ? ';white-space:nowrap' : ''}">${lines(v)}</td>`,
              )
              .join('')}</tr>`,
        )
        .join('')
      const total = b.total
        ? `<tr><td colspan="${b.columns.length}" bgcolor="${C.tag}" style="background:${C.tag};padding:18px 14px;border-top:2px solid ${C.gold};border-radius:0 0 14px 14px">
<table ${TABLE} width="100%"><tr>
<td valign="bottom" style="font:600 11px/1.6 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.muted}">${esc(b.total.label)}${b.total.note ? `<div style="font:12px/1.5 ${SANS};letter-spacing:0;text-transform:none">${esc(b.total.note)}</div>` : ''}</td>
<td class="price" valign="bottom" align="right" style="font:800 30px/1 ${SANS};color:${C.gold};white-space:nowrap;letter-spacing:-.02em">${esc(b.total.value)}</td>
</tr></table></td></tr>`
        : ''
      return row(
        'padding:0 0 24px',
        `${b.title ? `${eyebrow(b.title)}${spacer(12)}` : ''}<table ${TABLE} width="100%" bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.lineStrong};border-radius:14px;border-collapse:separate">
<tr>${head}</tr>${body}${total}</table>`,
      )
    }
    case 'stages': {
      const total = b.stages.length
      const cells = b.stages
        .map((name, i) => {
          const done = i < b.current
          const now = i === b.current
          return `<td class="stage-c" align="center" valign="top" width="${Math.floor(100 / total)}%" style="padding:0 2px">
<div style="height:4px;line-height:4px;font-size:0;border-radius:2px;${done || now ? GOLD_LINE : `background:${C.lineStrong}`}">&nbsp;</div>
<table ${TABLE} align="center" style="margin:12px auto 8px;border-collapse:separate"><tr><td align="center" width="28" height="28" style="width:28px;height:28px;border-radius:14px;${done ? `background:${C.gold};` : now ? `border:2px solid ${C.gold};` : `border:1px solid ${C.lineStrong};`}font:700 12px/28px ${SANS};color:${done ? C.onGold : now ? C.gold : C.muted}">${done ? '&#10003;' : i + 1}</td></tr></table>
<div class="stage-l" style="font:${now ? '700' : '500'} 11px/1.3 ${SANS};color:${now ? C.text : C.muted}">${esc(name)}</div>
</td>`
        })
        .join('')
      return row(
        'padding:0 0 24px',
        `<table ${TABLE} width="100%" bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.lineStrong};border-radius:16px;border-collapse:separate"><tr><td style="padding:20px 12px 18px">
<div style="padding:0 6px 14px">${eyebrow(b.label)}</div>
<table ${TABLE} width="100%"><tr>${cells}</tr></table></td></tr></table>`,
      )
    }
    case 'quote':
      return row(
        'padding:0 0 18px',
        `<table ${TABLE} width="100%" bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.line};border-left:3px solid ${C.gold};border-radius:4px 14px 14px 4px;border-collapse:separate"><tr><td style="padding:16px 20px 18px">
${eyebrow(b.title)}
<div style="padding-top:10px;font:italic 16px/1.65 ${SERIF};color:${C.text}">&bdquo;${lines(b.text)}&rdquo;</div></td></tr></table>`,
      )
    case 'buttons':
      return row(
        'padding:4px 0 16px',
        b.buttons.map((x) => button(x.label, x.href, x.primary ?? false)).join(''),
      )
    case 'callout':
      return row(
        'padding:0 0 24px',
        `<table ${TABLE} width="100%" bgcolor="${C.panel}" style="background:${C.panel};background-image:radial-gradient(80% 140% at 100% 50%,${C.gold}1f 0%,${C.gold}00 65%);border:1px solid ${C.lineStrong};border-radius:16px;border-collapse:separate"><tr>
<td class="stack" valign="middle" style="padding:20px 22px">
${b.title ? `<div style="font:700 16px/1.45 ${SANS};color:${C.text}">${esc(b.title)}</div>` : ''}
<div style="padding-top:3px;font:14px/1.6 ${SANS};color:${C.muted};word-break:break-word;overflow-wrap:anywhere">${lines(b.text)}</div></td>
${b.button ? `<td class="stack" valign="middle" align="right" style="padding:20px 12px 10px 22px;white-space:nowrap">${button(b.button.label, b.button.href, true)}</td>` : ''}
</tr></table>`,
      )
    case 'signature':
      return row(
        'padding:12px 0 26px',
        `<div style="height:1px;line-height:1px;font-size:0;background:${C.line};margin-bottom:20px">&nbsp;</div>
<table ${TABLE}><tr>
<td valign="middle" style="padding-right:18px;border-right:2px solid ${C.gold}"><img src="cid:${LOGO_CID}" width="112" alt="PRO-KOM Gaming" style="display:block;width:112px;height:auto;border:0"></td>
<td valign="middle" style="padding-left:18px">${b.lines
          .map((l, i) =>
            i === 0
              ? `<div style="font:700 15px/1.5 ${SANS};color:${C.text}">${esc(l)}</div>`
              : `<div style="font:13px/1.55 ${SANS};color:${C.muted}">${esc(l)}</div>`,
          )
          .join('')}</td>
</tr></table>`,
      )
    case 'divider':
      return row(
        'padding:4px 0 22px',
        `<div style="height:1px;line-height:1px;font-size:0;background:${C.line}">&nbsp;</div>`,
      )
  }
}

function tagLabel(label: string): string {
  const m = /^(.*?)\s+([A-Z]+-[\d-]+)$/.exec(label)
  if (!m) return `<div style="font:700 14px/1.3 ${SANS};color:${C.text}">${esc(label)}</div>`
  return `<div style="font:600 10px/1.4 ${SANS};letter-spacing:.2em;text-transform:uppercase;color:${C.muted}">${esc(m[1])}</div>
<div style="padding-top:3px;font:700 15px/1.3 ${SANS};color:${C.text};white-space:nowrap;letter-spacing:.04em">${esc(m[2])}</div>`
}

function hero(input: MailInput): string {
  const status = input.status
    ? `<table ${TABLE} style="margin:0 0 18px;border-collapse:separate"><tr><td bgcolor="${C.panel}" style="border:1px solid ${C.lineStrong};border-radius:999px;padding:6px 14px 6px 12px;background:${C.panel}">
<table ${TABLE}><tr><td valign="middle" style="padding-right:8px"><div style="width:8px;height:8px;border-radius:4px;background:${C.ok};font-size:0;line-height:0">&nbsp;</div></td>
<td valign="middle" style="font:600 12px/1.3 ${SANS};letter-spacing:.04em;color:${C.text2}">${esc(input.status)}</td></tr></table></td></tr></table>`
    : ''
  if (!input.title && !input.lead && !status) return ''
  return `<tr><td class="px" style="padding:30px 32px 30px">
${status}
${input.title ? `<h1 class="h1" style="margin:0;font:700 36px/1.1 ${SERIF};color:${C.text};letter-spacing:-.01em">${esc(input.title)}</h1>` : ''}
${input.lead ? `<p style="margin:14px 0 0;font:16px/1.7 ${SANS};color:${C.text2}">${lines(input.lead)}</p>` : ''}
</td></tr>`
}

function footer(f: MailFooter): string {
  const contact = f.contact
    .map(
      (c) => `<tr>
<td valign="top" style="padding:4px 16px 4px 0;font:700 10px/1.9 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.gold};white-space:nowrap">${esc(c.label)}</td>
<td valign="top" style="padding:4px 0;font:14px/1.5 ${SANS};color:${C.text}">${
        c.href ? link(c.href, esc(c.value), C.text) : esc(c.value)
      }</td></tr>`,
    )
    .join('')
  const links =
    f.links && f.links.length > 0
      ? `<tr><td style="padding:22px 0 0;font:600 13px/1.9 ${SANS}">${f.links
          .map(
            (l) => `<span style="white-space:nowrap">${link(l.href, esc(l.label), C.gold)}</span>`,
          )
          .join(`<span style="color:${C.lineStrong}">&nbsp;&nbsp;/&nbsp;</span> `)}</td></tr>`
      : ''
  return `<tr><td style="font-size:0;line-height:0;height:2px;${GOLD_LINE}">&nbsp;</td></tr>
<tr><td class="px" bgcolor="${C.foot}" style="background:${C.foot};padding:32px 32px 28px;border:1px solid ${C.line};border-top:0;border-radius:0 0 20px 20px">
<table ${TABLE} width="100%">
<tr><td>
<table ${TABLE} width="100%"><tr>
<td class="stack stack-gap" valign="top" width="200" style="width:200px;padding:2px 24px 0 0">
<img src="cid:${LOGO_CID}" width="150" alt="PRO-KOM Gaming" style="display:block;width:150px;height:auto;border:0">
<div style="padding-top:14px;font:13px/1.6 ${SANS};color:${C.muted}">Komputery do gier<br>składane w Rabce-Zdroju</div></td>
<td class="stack" valign="top"><table ${TABLE}>${contact}</table></td>
</tr></table>
</td></tr>
${links}
<tr><td style="padding:20px 0 0"><div style="height:1px;line-height:1px;font-size:0;background:${C.line}">&nbsp;</div></td></tr>
<tr><td style="padding:16px 0 0;font:12px/1.7 ${SANS};color:${C.muted}">${f.legal.map(esc).join('<br>')}${
    f.note
      ? `<div style="padding-top:10px;font-size:11px;line-height:1.6">${esc(f.note)}</div>`
      : ''
  }</td></tr>
</table>
</td></tr>`
}

export function renderMail(input: MailInput): RenderedMail {
  const { width, height } = LOGO_PNG_SIZE
  const shown = 156
  const html = `<!doctype html>
<html lang="pl" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<meta name="darkreader-lock">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<title>${esc(input.tagLabel)}</title>
<style>${STYLE}</style>
</head>
<body class="body" bgcolor="${C.page}" style="margin:0;padding:0;background:${C.page};width:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.page};mso-hide:all">${esc(input.preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table ${TABLE} width="100%" bgcolor="${C.page}" style="background:${C.page}">
<tr><td class="outer" align="center" style="padding:28px 12px 36px">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table ${TABLE} width="600" style="width:100%;max-width:600px;border-collapse:separate">
<tr><td bgcolor="${C.tag}" style="background:${C.tag};background-image:radial-gradient(110% 120% at 100% 0%,rgba(242,194,48,.16) 0%,rgba(242,194,48,0) 55%);border:1px solid ${C.line};border-bottom:0;border-radius:20px 20px 0 0">
<table ${TABLE} width="100%">
<tr><td class="px" style="padding:24px 32px 22px;border-bottom:1px solid ${C.line}">
<table ${TABLE} width="100%"><tr>
<td valign="middle"><img src="cid:${LOGO_CID}" width="${shown}" height="${Math.round((shown * height) / width)}" alt="PRO-KOM Gaming" class="logo" style="display:block;width:${shown}px;height:auto;border:0"></td>
<td valign="middle" align="right" style="padding-left:12px;text-align:right">${tagLabel(input.tagLabel)}</td>
</tr></table>
</td></tr>
${hero(input)}
</table>
</td></tr>
<tr><td style="font-size:0;line-height:0;height:2px;${GOLD_LINE}">&nbsp;</td></tr>
<tr><td class="px" bgcolor="${C.card}" style="background:${C.card};padding:30px 32px 10px;border-left:1px solid ${C.line};border-right:1px solid ${C.line}">
<table ${TABLE} width="100%">
${input.blocks.map(block).join('\n')}
</table>
</td></tr>
${footer(input.footer)}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`
  if (input.textLogo) {
    return {
      html: html.replace(/<img src="cid:[^"]+" width="(\d+)"[^>]*>/g, (_, w: string) =>
        wordmark(Number(w)),
      ),
      attachments: [],
    }
  }
  return {
    html,
    attachments: [
      {
        filename: 'prokom-gaming.png',
        content: LOGO_PNG_BASE64,
        encoding: 'base64',
        cid: LOGO_CID,
        contentType: 'image/png',
      },
    ],
  }
}
