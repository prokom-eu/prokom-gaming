import { buildCode } from '@/lib/buildPage'
import type { BuildPageData } from '@/lib/buildPage.server'
import { company } from '@/lib/site'

import { InteriorPlan } from './InteriorPlan'

/**
 * Sections 5, 6 and 14 of spec. §6: „Co jest w środku {istoty}” (plan + eight parts), „Miejsce na
 * rozbudowę” and the producer block (GPSR) next to the specification.
 */
export function Interior({ data }: { data: BuildPageData }) {
  const { build, upgrade } = data
  const code = buildCode(build.key, build.tier)
  const items: { value: string; text: string }[] = []
  if (upgrade?.freeRamSlots != null) {
    items.push({ value: String(upgrade.freeRamSlots), text: 'wolne gniazda RAM' })
  }
  if (upgrade?.freeM2Slots) {
    items.push({ value: upgrade.freeM2Slots, text: 'wolne gniazdo na dysk M.2' })
  }
  if (upgrade?.socket) items.push({ value: upgrade.socket, text: upgrade.socketNote ?? '' })
  if (upgrade?.psuW != null) {
    items.push({ value: `${upgrade.psuW}W`, text: 'zasilacz z zapasem na mocniejszą kartę' })
  }

  return (
    <section className="bp-plan" aria-labelledby="bp-plan-h">
      <div className="wrap">
        <div className="bp-sh">
          <h2 id="bp-plan-h" className="h">
            Co jest w środku {build.genitive}
          </h2>
          <p>
            Kliknij część, żeby zobaczyć, gdzie siedzi i co Ci daje. Podajemy klasę części i
            minimum, którego pilnujemy. Obudowę i chłodzenie podajemy z nazwy, resztę z modelem
            dostajesz w ofercie, a po zakupie w metryce z numerami seryjnymi.
          </p>
        </div>

        <InteriorPlan parts={data.interior} air={data.airCooler} code={code} />

        {/* TODO(krystian): confirm with the motherboard model before publishing the cards
            (`power-levels.upgrade`, `_verify` in all 16 levels; [serwis]). */}
        {items.length > 0 && (
          <div className="bp-up">
            <div>
              <h3 className="h">Miejsce na rozbudowę</h3>
              <p>Komputer ma rosnąć razem z Tobą. Tyle zostaje wolne po złożeniu:</p>
            </div>
            <ul>
              {items.map((item) => (
                <li key={item.text}>
                  <b className="nm">{item.value}</b>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* GPSR (spec. §6 pt 14) — not on the board. TODO(krystian): scope with the lawyer, and
            the safety instructions PDF (the link stays hidden until the file exists). */}
        <aside className="bp-gpsr" aria-label="Producent zestawu">
          <b>Producent zestawu:</b> {company.name}, {company.address},{' '}
          <a href={`mailto:${company.email}`}>{company.email}</a>. Identyfikator zestawu: {code}.
        </aside>
      </div>
    </section>
  )
}
