import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import type { CSSProperties } from 'react'

import {
  DeleteSavedButton,
  LogoutButton,
  ProfileForm,
  TicketForm,
} from '@/components/account/forms'
import { Timeline } from '@/components/account/Timeline'
import { IconShield } from '@/components/icons'
import { Sigil } from '@/components/Sigil'
import { ButtonLink } from '@/components/ui/Button'
import { loadAccount, type AccountComputer } from '@/lib/account/account.server'
import { customerSession } from '@/lib/account/session.server'
import { routes } from '@/lib/nav'

import '@/components/inquiry/inquiry.css'
import '@/components/account/certificate.css'
import '@/components/account/account.css'

export const metadata: Metadata = {
  title: 'Moje konto',
  robots: { index: false, follow: false },
}

/**
 * Customer account (spec. §15, boards Konto / Konto-telefon). Signed-in, verified customers only;
 * everything read as the customer, so the access rules decide what is shown (ADR-G005).
 * Left out on purpose: „Faktura” (no invoices in the system) and „Ulubione zestawy” (nothing on
 * the site adds favourites yet — „Pomysły na później”).
 */
export default async function AccountPage() {
  await connection()
  const session = await customerSession()
  if (!session) redirect(routes.accountLogin)
  const account = await loadAccount(session)

  return (
    <section className="kt">
      <div className="wrap kt__grid">
        <aside className="kt-menu" aria-label="Konto">
          <p className="kt-menu__who">Zalogowano jako {account.email}</p>
          <nav>
            <a href="#komputery" aria-current="true">
              Moje komputery<em>{account.computers.length}</em>
            </a>
            <a href="#zgloszenia">
              Zgłoszenia<em>{account.tickets.length}</em>
            </a>
            <a href="#konfiguracje">
              Zapisane konfiguracje<em>{account.configs.length}</em>
            </a>
            <a href="#dane">Dane i zgody</a>
            <LogoutButton />
          </nav>
        </aside>

        <div>
          <h1 className="h kt__title">Cześć, {account.name}</h1>
          <p className="kt__lead">
            Tu widzisz, gdzie jest Twój komputer, jego metrykę i gwarancje. Problem? Jedno
            kliknięcie i jesteśmy.
          </p>

          <div id="komputery">
            {account.computers.length === 0 ? (
              // TODO(krystian): text of the empty account — no board for it.
              <p className="kt-empty">
                Nie widzimy jeszcze komputera na adres {account.email}. Gdy przyjmiesz naszą ofertę,
                zamówienie pojawi się tutaj samo.
              </p>
            ) : (
              account.computers.map((pc, i) => <Computer key={`${pc.slug}-${i}`} pc={pc} />)
            )}
          </div>

          <div className="kt-two">
            <Warranties computers={account.computers} />
            <div className="kt-box cut" id="zgloszenia">
              <h2 className="h">Zgłoś problem</h2>
              <p className="kt-box__note">
                Numer seryjny i model mamy już z metryki. Opisz w dwóch zdaniach, co się dzieje.
                Najpierw spróbujemy pomóc zdalnie, a jeśli trzeba, kurier odbierze komputer na nasz
                koszt.
              </p>
              {account.units.length > 0 ? (
                <TicketForm units={account.units} />
              ) : (
                // TODO(krystian): text — a report needs a unit with a certificate.
                <p className="kt-empty">
                  Zgłoszenie wyślesz, gdy Twój komputer dostanie metrykę. Do tego czasu napisz do
                  nas przez <a href={routes.contact}>kontakt</a>.
                </p>
              )}
              {account.tickets.length === 0 ? (
                <p className="kt-box__note">Historia zgłoszeń: pusto. Tak ma być.</p>
              ) : (
                <ul className="kt-history" aria-label="Historia zgłoszeń">
                  {account.tickets.map((t) => (
                    <li key={t.id}>
                      <b>{t.category}</b> · {t.unitLabel} · {t.createdAt} · {t.status}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="kt-sec" id="konfiguracje">
            <h2 className="h">Zapisane konfiguracje</h2>
            {account.configs.length === 0 ? (
              // TODO(krystian): text — no board for the empty list.
              <p className="kt-empty">
                Nic tu jeszcze nie ma. W <a href={routes.configurator}>konfiguratorze</a> kliknij
                „Zapisz na koncie”.
              </p>
            ) : (
              <div className="kt-saved">
                {account.configs.map((c) => (
                  <div className="kt-saved__item" key={c.id}>
                    {c.photo && <Image src={c.photo.src} alt="" width={52} height={64} />}
                    <span>
                      <b>{c.label}</b>
                      <small>{c.details}</small>
                    </span>
                    <a href={c.href}>Otwórz</a>
                    <DeleteSavedButton id={c.id} label={c.label} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="kt-sec" id="dane">
            <h2 className="h">Dane i zgody</h2>
            <ProfileForm name={account.name} phone={account.phone} />
            <p className="kt-box__note">
              E-mail konta: {account.email} — po nim łączymy Twoje zamówienia.
              {account.consentAt && ` Regulamin konta zaakceptowany ${account.consentAt}.`}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Computer({ pc }: { pc: AccountComputer }) {
  const ids = [
    pc.unit?.number ? `Egzemplarz nr ${pc.unit.number}` : null,
    pc.orderNumber ? `zamówienie ${pc.orderNumber}` : null,
  ]
    .filter(Boolean)
    .join(', ')
  const certificate = pc.unit?.published && pc.unit.code
  return (
    <article className="kt-pc cut" style={{ '--c': `var(--c-${pc.slug})` } as CSSProperties}>
      <div className="kt-pc__photo">
        {pc.photo ? (
          <Image src={pc.photo.src} alt={pc.photo.alt} width={170} height={194} />
        ) : (
          <Sigil id={pc.key} size={120} />
        )}
      </div>
      <div>
        <small>Twój komputer{pc.tierRoman ? `, Moc ${pc.tierRoman}` : ''}</small>
        <strong className="nm kt-pc__name">{pc.name}</strong>
        {ids && <span className="kt-pc__ids">{ids}</span>}
        <Timeline steps={pc.timeline} label={`Etap zamówienia ${pc.name}`} />
        <p className="kt-pc__now">
          Teraz: <b>{pc.now}</b>
          {pc.dueDate && ` Wysyłka planowana na ${pc.dueDate}.`}
        </p>
        <div className="kt-pc__actions">
          {certificate && (
            <ButtonLink href={`${routes.certificate}/${pc.unit!.code}`}>Zobacz metrykę</ButtonLink>
          )}
          {pc.unit && (
            <ButtonLink variant="ghost" href="#zgloszenia">
              Zgłoś problem
            </ButtonLink>
          )}
        </div>
      </div>
    </article>
  )
}

function Warranties({ computers }: { computers: readonly AccountComputer[] }) {
  const units = computers.flatMap((pc) => (pc.unit ? [{ name: pc.name, unit: pc.unit }] : []))
  return (
    <div className="kt-box cut">
      <h2 className="h">Gwarancje</h2>
      {units.length === 0 ? (
        <p className="kt-box__note">
          PRO-KOM na cały komputer: 24 miesiące od odbioru. Daty pojawią się tu razem z metryką.
        </p>
      ) : (
        units.map(({ name, unit }) => (
          <div key={unit.id}>
            <p className="kt-gw">
              <IconShield size={18} />
              <span>
                PRO-KOM na cały komputer{units.length > 1 ? ` (${name})` : ''}:{' '}
                <b>24 miesiące{unit.warrantyUntil ? `, do ${unit.warrantyUntil}` : ''}</b>
              </span>
            </p>
            {unit.parts.some((p) => p.warrantyUntil) && (
              <dl>
                {unit.parts
                  .filter((p) => p.warrantyUntil)
                  .map((p) => (
                    <div key={p.label}>
                      <dt>{p.label}</dt>
                      <dd>
                        producent do {p.warrantyUntil}
                        {p.serial && <small>SN {p.serial}</small>}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>
        ))
      )}
    </div>
  )
}
