import Image from 'next/image'
import Link from 'next/link'

import { Sigil } from '@/components/Sigil'
import { SourceLabel } from '@/components/SourceLabel'
import { RESOLUTION_LABELS } from '@/lib/fps'
import { COMPARE_RESOLUTION, gainText, type CompareData } from '@/lib/home'

/**
 * "Baba Jaga czy Wampir?" (spec. §4 pt 10, board Main `.cmp`): a preview of the comparator — three
 * creatures with their stored FPS. Without numbers only the text and the button stay.
 */
export function CompareTeaser({ data }: { data: CompareData | null }) {
  return (
    <section className="hm-sec hm-cmp" aria-labelledby="cmp-title">
      <div className="wrap hm-cmp__grid">
        <div>
          <h2 id="cmp-title" className="h">
            Baba Jaga czy Wampir?
          </h2>
          <p className="hm-lead">
            Postaw do trzech istot obok siebie. Wybierz grę i monitor, a zobaczysz, ile klatek
            kupujesz za każdą dopłatę. Porównanie wyślesz rodzicowi albo koledze jednym linkiem.
          </p>
          <div className="hm-cta">
            <Link className="btn" href="/porownaj">
              Otwórz porównywarkę
            </Link>
          </div>
        </div>
        {data && (
          <figure className="hm-cmp__chart">
            <ul>
              {data.cards.map((card) => (
                <li key={card.slug} style={{ ['--c' as string]: `var(--c-${card.slug})` }}>
                  <span className="hm-cmp__photo" aria-hidden="true">
                    {card.photo && <Image src={card.photo.src} alt="" width={150} height={171} />}
                  </span>
                  <span className="hm-cmp__sigil" aria-hidden="true">
                    <Sigil id={card.key} ring={false} size={30} />
                  </span>
                  <strong className="nm">{card.name}</strong>
                  <span className="hm-cmp__tier">
                    Moc {card.tierRoman}, {card.tierLabel}
                  </span>
                  <span className="hm-cmp__bar" aria-hidden="true">
                    <s style={{ height: `${card.percent}%` }} />
                  </span>
                  <b>{card.fps} FPS</b>
                  <em>{card.gain !== null && gainText(card.gain)}</em>
                  <SourceLabel kind={card.kind} />
                </li>
              ))}
            </ul>
            <figcaption>
              {data.game}, {RESOLUTION_LABELS[COMPARE_RESOLUTION]}
              {data.setting && `, ${data.setting}`}.
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  )
}
