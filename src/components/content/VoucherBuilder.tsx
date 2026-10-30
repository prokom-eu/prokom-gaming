'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'

import { Sigil } from '@/components/Sigil'
import { Button } from '@/components/ui/Button'
import { MAX } from '@/lib/inquiry/rules'
import {
  VOUCHER_AMOUNTS,
  VOUCHER_DESIGN_CHOICES,
  VOUCHER_VALID_MONTHS,
  type VoucherAmount,
  type VoucherDesign,
} from '@/lib/inquiry/types'
import { zl } from '@/lib/pricing/format'

import { QuickInquirySheet } from './QuickInquirySheet'

// Board Bon: the preview shows these until the visitor types their own.
const SAMPLE_WHO = 'Dla Kuby'
const SAMPLE_MSG = 'Niech Perun będzie z Tobą!'

/** Colour token of a look (creature colours, ADR-G003). */
const lookColor = (design: VoucherDesign) => `var(--c-${design})`

/**
 * Gift voucher (spec. §12, board Bon): the header with the live preview of the voucher, the form
 * (amount, look, for whom, dedication) and „Zamów bon” opening the sheet with the contact — an
 * inquiry of type `voucher`. The scene comes from the server page (`scene`).
 */
export function VoucherBuilder({ scene, token }: { scene: ReactNode; token: string }) {
  const [amount, setAmount] = useState<VoucherAmount>(1000)
  const [design, setDesign] = useState<VoucherDesign>('perun')
  const [who, setWho] = useState('')
  const [msg, setMsg] = useState('')
  const [sheet, setSheet] = useState(false)

  const lookLabel = VOUCHER_DESIGN_CHOICES.find((d) => d.value === design)?.label ?? design
  const style = { '--c': lookColor(design) } as CSSProperties

  return (
    <div style={style}>
      <header className="ct-head bn-head" data-scene-top>
        {scene}
        <div className="ct-head__veil" aria-hidden="true" />
        <div className="wrap ct-head__in bn-head__in">
          <div>
            <h1 className="h ct-head__title">Bon podarunkowy PRO-KOM Gaming</h1>
            <p className="ct-head__lead">
              Nie wiesz, którą istotę wybrać? Podaruj bon. Obdarowany sam wybierze komputer, a kwota
              z bonu odliczy się od ceny.
            </p>
          </div>
          <figure className="bn-card" aria-label={`Podgląd bonu: ${zl(amount)}, ${lookLabel}`}>
            <div className="bn-card__in">
              <span className="bn-card__sigil" aria-hidden="true">
                <Sigil id={design} size={64} />
              </span>
              <small>PRO-KOM GAMING</small>
              <b className="nm">{zl(amount)}</b>
              <em className="lore">{who.trim() || SAMPLE_WHO}</em>
              <p>{msg.trim() || SAMPLE_MSG}</p>
              <span className="bn-card__code">
                Kod XXXX-XXXX, ważny {VOUCHER_VALID_MONTHS} miesięcy
              </span>
            </div>
          </figure>
        </div>
      </header>

      <section className="bn" aria-labelledby="bn-form">
        <div className="wrap bn__grid">
          <div>
            <h2 id="bn-form" className="h">
              Złóż bon
            </h2>
            <div className="bn__opt">
              <span id="bn-amount">Kwota</span>
              <div className="bn__amounts" role="group" aria-labelledby="bn-amount">
                {VOUCHER_AMOUNTS.map((v) => (
                  <button
                    key={v.amount}
                    type="button"
                    aria-pressed={v.amount === amount}
                    onClick={() => setAmount(v.amount)}
                  >
                    <b>{zl(v.amount)}</b>
                    <small>{v.note}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="bn__opt">
              <span id="bn-look">Wygląd bonu</span>
              <div className="bn__looks" role="group" aria-labelledby="bn-look">
                {VOUCHER_DESIGN_CHOICES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    aria-pressed={d.value === design}
                    onClick={() => setDesign(d.value)}
                    style={{ '--lc': lookColor(d.value) } as CSSProperties}
                  >
                    <i aria-hidden="true" />
                    <small>{d.label}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="iq-field bn__field">
              <label htmlFor="bn-who">Dla kogo</label>
              <input
                id="bn-who"
                className="iq-in"
                type="text"
                maxLength={MAX.voucherRecipient}
                placeholder="np. Dla Kuby"
                value={who}
                onChange={(e) => setWho(e.target.value)}
              />
            </div>
            <div className="iq-field bn__field">
              <label htmlFor="bn-msg">
                Dedykacja <em>(opcjonalnie)</em>
              </label>
              <input
                id="bn-msg"
                className="iq-in"
                type="text"
                maxLength={MAX.voucherDedication}
                placeholder="np. Wszystkiego najlepszego!"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
              />
            </div>
            <Button type="button" size="lg" className="bn__order" onClick={() => setSheet(true)}>
              Zamów bon
            </Button>
            <p className="bn__note">
              Bon wysyłamy jako PDF do druku albo w eleganckiej kopercie z naszego sklepu. Płatność
              przelewem albo BLIK-iem.
            </p>
          </div>
          <div className="bn__how">
            <h3 className="h">Jak to działa</h3>
            <ol>
              <li>
                <b>Zamawiasz bon</b>
                <span>Wybierasz kwotę i wygląd, wpisujesz dedykację.</span>
              </li>
              <li>
                <b>Płacisz i dostajesz bon</b>
                <span>PDF na e-mail od razu po wpłacie albo koperta w sklepie.</span>
              </li>
              {/* TODO(krystian): the G12 form has no field for the voucher code yet — today the
                  code goes into „Uwagi”; a field (and checking the code) when vouchers start. */}
              <li>
                <b>Obdarowany wybiera komputer</b>
                <span>Wpisuje kod w zapytaniu. Kwota odlicza się od ceny w ofercie.</span>
              </li>
            </ol>
            <dl>
              <div>
                <dt>Ile jest ważny?</dt>
                <dd>{VOUCHER_VALID_MONTHS} miesięcy od zakupu.</dd>
              </div>
              {/* The board's „Można go łączyć z ratami?” is left out: no instalments (decision
                  25.10.2026, CLAUDE.md). TODO(krystian): „Co z resztą, jeśli komputer jest
                  tańszy?” — the board has only „[do decyzji]”; the answer comes with the
                  boss's decision. */}
            </dl>
          </div>
        </div>
      </section>

      <QuickInquirySheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Zamów bon"
        summary={
          <p>
            Bon <b>{zl(amount)}</b>, wygląd {lookLabel}
            {who.trim() ? `, ${who.trim()}` : ''}
          </p>
        }
        order={{
          type: 'voucher',
          voucher: {
            amount,
            design,
            ...(who.trim() ? { recipient: who.trim() } : {}),
            ...(msg.trim() ? { dedication: msg.trim() } : {}),
          },
        }}
        token={token}
        submitLabel="Zamów bon"
        sentText={() =>
          'Zamówienie bonu jest u nas. Odpiszemy z fakturą pro forma, zwykle w ciągu godziny.'
        }
      />
    </div>
  )
}
