import Image from 'next/image'

import { FpsList } from '@/components/FpsList'
import { IconMail } from '@/components/icons'
import { PROMISES } from '@/components/promises'
import { ButtonLink } from '@/components/ui/Button'
import { inquiryHref } from '@/lib/buildPage'
import type { BuildPageData } from '@/lib/buildPage.server'
import { dateText } from '@/lib/home'
import { routes } from '@/lib/nav'
import { zl } from '@/lib/pricing/format'

/**
 * Sections 2–4 of spec. §6 (board Zestaw `.zb`): „Dlaczego {istota}?” with the look, the photo,
 * „Ile klatek w Twojej grze”; on the right the price with the actions, promises and „Na jaki
 * monitor”. The price is the published sum (`lib/pricing/snapshot`), the same as everywhere.
 */
export function BuyBlock({ data, pageUrl }: { data: BuildPageData; pageUrl: string }) {
  const { build } = data
  return (
    <section className="bp-buy" aria-label={`${build.name}: cena i klatki`}>
      <div className="wrap bp-buy__grid">
        <div className="bp-buy__main">
          <div className="bp-why cut">
            <h2 className="bp-why__h">Dlaczego {build.name}?</h2>
            <p className="lore bp-why__t">{build.why}</p>
            <div className="bp-why__look">
              <b>Wygląd</b>
              <p>
                {build.look}. Kolor światła zmienisz przyciskiem na obudowie, ale to jest znak
                rozpoznawczy tej istoty.
              </p>
            </div>
          </div>

          {/* TODO(krystian): real photos of our unit after the photo session (`builds.photos`,
              ADR-G003 §3) — then the board's gallery: przód, wnętrze, w ciemności, film z testu.
              Until then the case photo with its note; the empty tiles stay hidden (decision 28.10). */}
          {build.photo && (
            <figure className="bp-photo">
              <Image src={build.photo.src} alt={build.photo.alt} width={444} height={505} />
              <figcaption>Zdjęcie poglądowe. Tu będzie nasz egzemplarz, przód.</figcaption>
            </figure>
          )}

          <FpsList
            build={build.slug}
            color={`var(--c-${build.slug})`}
            games={data.fps.games}
            table={data.fps.table}
          />
        </div>

        <aside className="bp-side" aria-label="Cena">
          <div className="bp-price cut">
            {build.price !== null && (
              <p className="bp-price__p">
                <b>{zl(build.price)}</b>
                <span>z montażem, Windows 11 i wysyłką</span>
              </p>
            )}
            {data.pricedAt && (
              <p className="bp-price__note">
                Cena z {dateText(data.pricedAt)}, z montażem, testami, Windows 11 i wysyłką. Listę
                części potwierdzimy w ofercie ważnej 48 godzin.
              </p>
            )}
            <ButtonLink
              className="bp-price__ask"
              size="lg"
              href={inquiryHref(build.slug, data.config)}
            >
              Zapytaj o {build.accusative}
            </ButtonLink>
            <div className="bp-price__more">
              <ButtonLink variant="ghost" href={`${routes.configurator}?zestaw=${build.slug}`}>
                Zmień części
              </ButtonLink>
              {/* TODO(G11): the comparison counter in localStorage; until then a plain link. */}
              <ButtonLink variant="ghost" href={`${routes.compare}?z=${build.slug}`}>
                Porównaj
              </ButtonLink>
            </div>
            <p className="bp-price__share">
              <a className="lnk bp-price__parent" href={parentMail(data, pageUrl)}>
                <IconMail size={18} />
                Wyślij rodzicowi ze specyfikacją
              </a>
              {/* TODO(krystian): the label „albo SMS-em” is ours, not from the board. */}
              <a className="bp-price__sms" href={parentSms(data, pageUrl)}>
                albo SMS-em
              </a>
            </p>
            <ul className="bp-price__list">
              {PROMISES.map(({ icon: Icon, text }) => (
                <li key={text}>
                  <Icon size={18} />
                  {text}
                </li>
              ))}
            </ul>
            {data.monitor.length > 0 && (
              <div className="bp-mon">
                <b id="bp-mon">Na jaki monitor</b>
                <ul aria-labelledby="bp-mon">
                  {data.monitor.map((m) => (
                    <li key={m.resolution} className={m.ok ? 'is-ok' : undefined}>
                      <em>{m.label}</em>
                      {m.verdict}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}

/**
 * „Wyślij rodzicowi ze specyfikacją” (spec. §6 pt 3: link + mail/SMS through `mailto:`/`sms:`): a
 * message the visitor sends from their own phone or mail app. The board links to the inquiry form
 * here; the spec wins. TODO(krystian): wording of the subject and the text (working text).
 */
function parentText(data: BuildPageData, pageUrl: string): string {
  const { build } = data
  const spec = [build.cpu, build.gpu, build.ram, build.disk].filter(Boolean).join(', ')
  const price =
    build.price !== null
      ? `
Cena: ${zl(build.price)} z montażem, Windows 11 i wysyłką.`
      : ''
  return `${build.name}, Moc ${build.tierRoman} (${build.tierLabel}).
${spec}.${price}

Szczegóły: ${pageUrl}`
}

function parentMail(data: BuildPageData, pageUrl: string): string {
  const subject = `Komputer do gier ${data.build.name} — PRO-KOM Gaming`
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(parentText(data, pageUrl))}`
}

/** `sms:?&body=` — the form both Android and iOS read. */
function parentSms(data: BuildPageData, pageUrl: string): string {
  return `sms:?&body=${encodeURIComponent(parentText(data, pageUrl))}`
}
