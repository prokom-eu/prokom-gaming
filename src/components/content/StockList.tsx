'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, type CSSProperties } from 'react'

import { Button } from '@/components/ui/Button'
import { zl } from '@/lib/pricing/format'
import type { StockCard } from '@/lib/stock'

import { QuickInquirySheet } from './QuickInquirySheet'

/**
 * Units of `/gotowe` (board Gotowe: `.gt7`): the creature's card scene with the case photo, the
 * badge of the place, parts, state and the unit's price; „Zarezerwuj” opens the sheet that sends
 * an inquiry of type `ready` (the server prices and reserves the unit for 24 hours).
 */
export function StockList({ cards, token }: { cards: StockCard[]; token: string }) {
  const router = useRouter()
  const [picked, setPicked] = useState<StockCard | null>(null)

  return (
    <>
      <ul className="gt__grid">
        {cards.map((card) => (
          <li key={card.id}>
            <article
              className="gt-unit"
              style={{ '--c': `var(--c-${card.slug})` } as CSSProperties}
              aria-labelledby={`gt-${card.id}`}
            >
              <span className="gt-unit__visual">
                <Image
                  src={`/scenes/${card.key}-card.webp`}
                  alt=""
                  width={1680}
                  height={960}
                  sizes="(max-width: 640px) 100vw, 420px"
                />
                {card.photo && (
                  <span className="gt-unit__case">
                    <Image
                      src={card.photo.src}
                      alt={card.photo.alt}
                      fill
                      sizes="(max-width: 640px) 80vw, 340px"
                    />
                  </span>
                )}
                <span className="gt-unit__badge">{card.badge}</span>
              </span>
              <div className="gt-unit__body">
                {/* TODO(krystian): „egzemplarz nr …” of the board comes with units in G14. */}
                <small>{card.location}</small>
                <h2 id={`gt-${card.id}`} className="nm">
                  {card.name}
                </h2>
                {card.specs && <p>{card.specs}</p>}
                <p className="gt-unit__state">{card.conditionNote}</p>
                <div className="gt-unit__buy">
                  <span>
                    <b>{zl(card.price)}</b>
                    <small>cena za ten egzemplarz</small>
                  </span>
                  <Button type="button" onClick={() => setPicked(card)}>
                    Zarezerwuj
                  </Button>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {picked && (
        <QuickInquirySheet
          key={picked.id}
          open
          onClose={() => setPicked(null)}
          title="Zarezerwuj egzemplarz"
          summary={
            <p>
              <b>{picked.name}</b>, {picked.location}: {zl(picked.price)}. Rezerwacja na 24 godziny.
            </p>
          }
          order={{ type: 'ready', stock: picked.id }}
          token={token}
          submitLabel="Zarezerwuj"
          // TODO(krystian): wording after a reservation (not on the board).
          sentText={() =>
            'Egzemplarz jest zarezerwowany dla Ciebie na 24 godziny. Odpiszemy z fakturą pro forma, zwykle w ciągu godziny.'
          }
          onTaken={() => router.refresh()}
        />
      )}
    </>
  )
}
