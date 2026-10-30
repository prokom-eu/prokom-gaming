'use client'

import Link from 'next/link'
import type { CSSProperties, Ref } from 'react'

import { Sigil } from '@/components/Sigil'
import { encodeConfig } from '@/lib/configurator'
import { CONSENT_CLAUSE } from '@/lib/inquiry/consent'
import {
  computerText,
  MODES,
  pickBuild,
  reviewOf,
  toggle,
  type FieldErrors,
  type FieldKey,
  type FormData,
  type FormState,
  type Step,
} from '@/lib/inquiry/form'
import { MAX } from '@/lib/inquiry/rules'
import {
  BUDGET_CHOICES,
  CASE_COLOR_CHOICES,
  EXTRA_CHOICES,
  FOR_WHOM_CHOICES,
  INVOICE_CHOICES,
  LIGHTING_CHOICES,
  MONITOR_CHOICES,
  PICKUP_CHOICES,
  PREFERRED_CONTACT_CHOICES,
  REFRESH_CHOICES,
} from '@/lib/inquiry/types'
import { routes } from '@/lib/nav'

import { Options, pickOne } from './Options'

type StepProps = {
  state: FormState
  data: FormData
  errors: FieldErrors
  update: (patch: Partial<FormState>) => void
  set: (next: (state: FormState) => FormState) => void
  headingRef: Ref<HTMLHeadingElement>
}

const errorId = (key: FieldKey) => `iq-err-${key}`

/** `aria-invalid` + `aria-describedby` of a field with a message. */
const invalid = (errors: FieldErrors, key: FieldKey) =>
  errors[key] ? { 'aria-invalid': true, 'aria-describedby': errorId(key) } : {}

function FieldError({ errors, field }: { errors: FieldErrors; field: FieldKey }) {
  const message = errors[field]
  if (!message) return null
  return (
    <span className="iq-err" id={errorId(field)} role="alert">
      {message}
    </span>
  )
}

function Heading({
  headingRef,
  children,
}: {
  headingRef: Ref<HTMLHeadingElement>
  children: string
}) {
  // Focused on every step change, so a screen reader hears where it is.
  return (
    <h2 className="h iq-step__h" ref={headingRef} tabIndex={-1}>
      {children}
    </h2>
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Komputer
// ---------------------------------------------------------------------------------------------

export function StepComputer({ state, data, errors, update, set, headingRef }: StepProps) {
  const fromConfigurator = state.mode === 'build' && state.config !== null
  const tuned =
    state.mode === 'build' &&
    !state.config &&
    state.build !== null &&
    (Object.keys(state.changes).length > 0 || state.light !== null)
  return (
    <div className="iq-step">
      <Heading headingRef={headingRef}>Od czego zaczynasz?</Heading>
      <div className="iq-modes" role="group" aria-label="Od czego zaczynasz?">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            className="iq-mode"
            aria-pressed={state.mode === m.value}
            onClick={() => update({ mode: m.value })}
          >
            <b>{m.title}</b>
            <span>{m.text}</span>
          </button>
        ))}
      </div>

      {state.mode === 'build' && (
        <div className="iq-block">
          <h3 id="iq-h-build">Który komputer?</h3>
          <p className="iq-hint">
            Możesz zmienić zdanie. W ofercie podpowiemy, czy to dobry wybór do Twoich gier.
          </p>
          {fromConfigurator && state.config && (
            <p className="iq-picked">
              {/* Not on the board: the configuration from the configurator has no sigil to press. */}
              Z konfiguratora: {computerText(state, data)}.{' '}
              <Link className="lnk" href={`${routes.configurator}?k=${encodeConfig(state.config)}`}>
                Zmień w konfiguratorze
              </Link>
            </p>
          )}
          {tuned && <p className="iq-picked">Wybrano: {computerText(state, data)}.</p>}
          <div
            className="iq-builds"
            role="group"
            aria-labelledby="iq-h-build"
            aria-describedby={errors.computer ? errorId('computer') : undefined}
          >
            {data.builds.map((b) => (
              <button
                key={b.slug}
                type="button"
                className="iq-build"
                style={{ '--c': `var(--c-${b.key})` } as CSSProperties}
                aria-pressed={!state.config && state.build === b.slug}
                onClick={() => set((s) => pickBuild(s, b.slug))}
              >
                <span className="iq-build__sg">
                  <Sigil id={b.key} size={44} />
                </span>
                <b>{b.name}</b>
                <small>{`${b.power}, ${b.realm}`}</small>
              </button>
            ))}
          </div>
          <FieldError errors={errors} field="computer" />
        </div>
      )}

      {state.mode === 'advice' && (
        <div className="iq-block">
          <h3 id="iq-h-who">Dla kogo jest komputer?</h3>
          <Options
            labelledBy="iq-h-who"
            choices={FOR_WHOM_CHOICES}
            value={state.forWhom}
            onChange={(v) => update({ forWhom: pickOne(state.forWhom, v) })}
          />
          <h3 id="iq-h-budget">Ile chcesz wydać?</h3>
          <p className="iq-hint">
            Orientacyjnie. Dobierzemy najlepszy zestaw w tej kwocie, a jeśli coś warto dołożyć,
            powiemy dlaczego.
          </p>
          <Options
            labelledBy="iq-h-budget"
            choices={BUDGET_CHOICES}
            value={state.budget}
            onChange={(v) => update({ budget: pickOne(state.budget, v) })}
          />
        </div>
      )}

      {state.mode === 'list' && (
        <div className="iq-block">
          <div className="iq-field">
            <label htmlFor="iq-f-list">
              Twoja lista części albo link <em>(z naszego konfiguratora trafi tu sama)</em>
            </label>
            <textarea
              id="iq-f-list"
              className="iq-in"
              rows={5}
              maxLength={MAX.customList}
              placeholder="Na przykład: Ryzen 7 9800X3D, RTX 5070 Ti, 32 GB DDR5, biała obudowa…"
              value={state.customList}
              onChange={(e) => update({ customList: e.target.value })}
              {...invalid(errors, 'customList')}
            />
            <FieldError errors={errors} field="customList" />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// 2. Gry i wygląd
// ---------------------------------------------------------------------------------------------

export function StepGames({ state, data, update, headingRef }: StepProps) {
  return (
    <div className="iq-step">
      <Heading headingRef={headingRef}>W co grasz i na czym?</Heading>
      <div className="iq-block">
        <h3 id="iq-h-games">
          Gry <em>(zaznacz kilka)</em>
        </h3>
        <Options
          labelledBy="iq-h-games"
          choices={data.games.map((g) => ({ value: g.slug, label: g.name }))}
          value={state.games}
          onChange={(v) => update({ games: toggle(state.games, v) })}
        />
        <div className="iq-field iq-field--mt">
          <label htmlFor="iq-f-other-games">
            Inne gry albo programy <em>(opcjonalnie)</em>
          </label>
          <input
            id="iq-f-other-games"
            className="iq-in"
            type="text"
            maxLength={MAX.otherGames}
            placeholder="np. Escape from Tarkov, montaż w DaVinci"
            value={state.otherGames}
            onChange={(e) => update({ otherGames: e.target.value })}
          />
        </div>
      </div>
      <div className="iq-block iq-two">
        <div>
          <h3 id="iq-h-monitor">Monitor</h3>
          <Options
            labelledBy="iq-h-monitor"
            choices={MONITOR_CHOICES}
            value={state.monitor}
            onChange={(v) => update({ monitor: pickOne(state.monitor, v) })}
          />
        </div>
        <div>
          <h3 id="iq-h-refresh">Odświeżanie</h3>
          <Options
            labelledBy="iq-h-refresh"
            choices={REFRESH_CHOICES}
            value={state.refresh}
            onChange={(v) => update({ refresh: pickOne(state.refresh, v) })}
          />
        </div>
      </div>
      <div className="iq-block iq-two">
        <div>
          <h3 id="iq-h-case">Obudowa</h3>
          <Options
            labelledBy="iq-h-case"
            choices={CASE_COLOR_CHOICES}
            value={state.caseColor}
            onChange={(v) => update({ caseColor: pickOne(state.caseColor, v) })}
          />
        </div>
        <div>
          <h3 id="iq-h-light">Podświetlenie</h3>
          <Options
            labelledBy="iq-h-light"
            choices={LIGHTING_CHOICES}
            value={state.lighting}
            onChange={(v) => update({ lighting: pickOne(state.lighting, v) })}
          />
        </div>
      </div>
      <div className="iq-block">
        <h3 id="iq-h-extras">
          Potrzebujesz też <em>(wycenimy osobno)</em>
        </h3>
        <Options
          labelledBy="iq-h-extras"
          choices={EXTRA_CHOICES}
          value={state.extras}
          onChange={(v) => update({ extras: toggle(state.extras, v) })}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// 3. Kontakt
// ---------------------------------------------------------------------------------------------

/** The clause with its last words as the link to the privacy policy. */
function ConsentText() {
  const tail = 'polityce prywatności'
  const [head] = CONSENT_CLAUSE.text.split(tail)
  return (
    <>
      {head}
      <Link href={routes.privacy}>{tail}</Link>.
    </>
  )
}

export function StepContact({ state, errors, update, headingRef }: StepProps) {
  return (
    <div className="iq-step">
      <Heading headingRef={headingRef}>Gdzie wysłać ofertę?</Heading>
      <div className="iq-block iq-two">
        <div className="iq-field">
          <label htmlFor="iq-f-name">Imię</label>
          <input
            id="iq-f-name"
            className="iq-in"
            type="text"
            autoComplete="given-name"
            maxLength={MAX.name}
            placeholder="Jak się do Ciebie zwracać?"
            value={state.name}
            onChange={(e) => update({ name: e.target.value })}
            {...invalid(errors, 'name')}
          />
          <FieldError errors={errors} field="name" />
        </div>
        <div className="iq-field">
          <label htmlFor="iq-f-email">E-mail</label>
          <input
            id="iq-f-email"
            className="iq-in"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={MAX.email}
            placeholder="tu wyślemy ofertę"
            value={state.email}
            onChange={(e) => update({ email: e.target.value })}
            {...invalid(errors, 'email')}
          />
          <FieldError errors={errors} field="email" />
        </div>
      </div>
      <div className="iq-block iq-two">
        <div className="iq-field">
          <label htmlFor="iq-f-phone">
            Telefon {state.preferredContact !== 'phone' && <em>(opcjonalnie)</em>}
          </label>
          <input
            id="iq-f-phone"
            className="iq-in"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={MAX.phone}
            placeholder="jeśli wolisz rozmowę"
            value={state.phone}
            onChange={(e) => update({ phone: e.target.value })}
            {...invalid(errors, 'phone')}
          />
          <FieldError errors={errors} field="phone" />
        </div>
        <div className="iq-field">
          <span id="iq-h-pref">Jak wolisz dostać odpowiedź?</span>
          <Options
            labelledBy="iq-h-pref"
            choices={PREFERRED_CONTACT_CHOICES}
            value={state.preferredContact}
            optional={false}
            onChange={(v) => update({ preferredContact: v })}
          />
        </div>
      </div>
      <div className="iq-block">
        <h3 id="iq-h-pickup">Odbiór</h3>
        <Options
          labelledBy="iq-h-pickup"
          choices={PICKUP_CHOICES}
          value={state.pickup}
          optional={false}
          onChange={(v) => update({ pickup: v })}
        />
      </div>
      <div className="iq-block">
        <h3 id="iq-h-invoice">Faktura</h3>
        <Options
          labelledBy="iq-h-invoice"
          choices={INVOICE_CHOICES}
          value={state.invoice}
          optional={false}
          onChange={(v) => update({ invoice: v })}
        />
        {state.invoice === 'company' && (
          <div className="iq-field iq-field--mt">
            <label htmlFor="iq-f-nip">NIP firmy</label>
            <input
              id="iq-f-nip"
              className="iq-in"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={MAX.nip}
              placeholder="10 cyfr"
              value={state.nip}
              onChange={(e) => update({ nip: e.target.value })}
              {...invalid(errors, 'nip')}
            />
            <FieldError errors={errors} field="nip" />
          </div>
        )}
      </div>
      <div className="iq-block">
        <div className="iq-field">
          <label htmlFor="iq-f-message">
            Coś jeszcze? <em>(opcjonalnie)</em>
          </label>
          <textarea
            id="iq-f-message"
            className="iq-in"
            rows={3}
            maxLength={MAX.message}
            placeholder="Termin, na kiedy potrzebujesz komputera, albo pytanie"
            value={state.message}
            onChange={(e) => update({ message: e.target.value })}
          />
        </div>
      </div>
      <div className="iq-block">
        <label className="iq-check">
          <input
            type="checkbox"
            checked={state.consent}
            onChange={(e) => update({ consent: e.target.checked })}
            {...invalid(errors, 'consent')}
          />
          <i aria-hidden />
          <span>
            <ConsentText />
          </span>
        </label>
        <FieldError errors={errors} field="consent" />
        <label className="iq-check iq-check--mt">
          <input
            type="checkbox"
            checked={state.marketingConsent}
            onChange={(e) => update({ marketingConsent: e.target.checked })}
          />
          <i aria-hidden />
          {/* TODO(krystian): wording with the lawyer — spec. §10 asks for it, the board has none. */}
          <span>
            Chcę dostawać od PRO-KOM Gaming informacje o nowościach i promocjach (zgoda dobrowolna,
            możesz ją wycofać w każdej chwili).
          </span>
        </label>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// 4. Sprawdź i wyślij
// ---------------------------------------------------------------------------------------------

export function StepReview({
  state,
  data,
  headingRef,
  onEdit,
}: Pick<StepProps, 'state' | 'data' | 'headingRef'> & { onEdit: (step: Step) => void }) {
  return (
    <div className="iq-step">
      <Heading headingRef={headingRef}>Sprawdź i wyślij</Heading>
      <dl className="iq-review">
        {reviewOf(state, data).map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
            <button
              type="button"
              className="lnk iq-review__edit"
              aria-label={`Zmień: ${row.label}`}
              onClick={() => onEdit(row.step)}
            >
              Zmień
            </button>
          </div>
        ))}
      </dl>
      <p className="iq-hint iq-hint--after">
        Po wysłaniu dostaniesz kopię zapytania na e-mail. Oferta przyjdzie zwykle w ciągu godziny,
        codziennie od 8 do 22. Zapytania wysłane w nocy czytamy rano.
      </p>
    </div>
  )
}
