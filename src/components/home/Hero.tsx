'use client'

import Image from 'next/image'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
} from 'react'

import { IconClock, IconRosette, IconShield, IconShop } from '@/components/icons'
import { ButtonLink } from '@/components/ui/Button'
import { HERO_DEFAULT, HERO_INTERVAL_MS, rotationOf, type HeroData } from '@/lib/home'

import { HeroCard } from './HeroCard'
import { Pedestal } from './Pedestal'
import { TierStrip } from './TierStrip'

/** Autoswitch and parallax only here (ADR-G003 §5): desktop width, a mouse, motion allowed. */
const DESKTOP = '(min-width: 1024px)'
const MOUSE = '(hover: hover) and (pointer: fine)'
const CALM = '(prefers-reduced-motion: reduce)'
/** The next creature of the rotation is fetched this long before it shows. */
const PRELOAD_AFTER_MS = 3000

const matches = (query: string) => typeof window !== 'undefined' && window.matchMedia(query).matches

/**
 * Home hero (spec. §4 pt 1, ADR-G003 §5, board Main `.hero6`). Only the first creature's scene and
 * photo load with the page; another one is fetched when it is picked (or shortly before the
 * automatic switch), then stays mounted, hidden, for a cheap return.
 */
export function Hero({ data }: { data: HeroData }) {
  const builds = useMemo(() => new Map(data.builds.map((b) => [b.slug, b])), [data.builds])
  const rotation = useMemo(() => rotationOf(data), [data])
  const first = builds.has(HERO_DEFAULT) ? HERO_DEFAULT : (data.builds[0]?.slug ?? '')

  const [active, setActive] = useState(first)
  const [mounted, setMounted] = useState<string[]>([first])
  // Number of switches: the first paint has no entry animation (it would delay LCP).
  const [switches, setSwitches] = useState(0)
  const [stopped, setStopped] = useState(false)

  const section = useRef<HTMLElement>(null)
  const activeRef = useRef(first)
  const hover = useRef(false)
  const focus = useRef(false)
  const frame = useRef(0)

  const mount = useCallback((slug: string) => {
    setMounted((list) => (list.includes(slug) ? list : [...list, slug]))
  }, [])

  const show = useCallback(
    (slug: string) => {
      if (slug === activeRef.current || !builds.has(slug)) return
      activeRef.current = slug
      mount(slug)
      setActive(slug)
      setSwitches((n) => n + 1)
    },
    [builds, mount],
  )

  // A pick by hand stops the automatic switch for good (board Main), not just pauses it.
  const pick = useCallback(
    (slug: string) => {
      setStopped(true)
      show(slug)
    },
    [show],
  )

  const nextInRotation = useCallback(() => {
    const index = rotation.indexOf(activeRef.current)
    return rotation[(index + 1) % rotation.length]
  }, [rotation])

  // Every 7 s on desktop; skipped while the cursor or focus is in the hero or the tab is hidden.
  useEffect(() => {
    if (stopped || rotation.length < 2) return
    const timer = window.setInterval(() => {
      if (!matches(DESKTOP) || matches(CALM)) return
      if (document.hidden || hover.current || focus.current) return
      const next = nextInRotation()
      if (next) show(next)
    }, HERO_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [stopped, rotation.length, nextInRotation, show])

  // Fetch the next creature's scene and photo shortly before its turn.
  useEffect(() => {
    if (stopped || !matches(DESKTOP) || matches(CALM)) return
    const timer = window.setTimeout(() => {
      const next = nextInRotation()
      if (next) mount(next)
    }, PRELOAD_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [active, stopped, nextInRotation, mount])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const onMouseMove = (event: MouseEvent<HTMLElement>) => {
    const el = section.current
    if (!el || !matches(DESKTOP) || !matches(MOUSE) || matches(CALM)) return
    const { clientX, clientY } = event
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const box = el.getBoundingClientRect()
      el.style.setProperty('--mx', ((clientX - box.left) / box.width - 0.5).toFixed(3))
      el.style.setProperty('--my', ((clientY - box.top) / box.height - 0.5).toFixed(3))
    })
  }

  const onMouseLeave = () => {
    hover.current = false
    cancelAnimationFrame(frame.current)
    section.current?.style.setProperty('--mx', '0')
    section.current?.style.setProperty('--my', '0')
  }

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) focus.current = false
  }

  const build = builds.get(active)
  if (!build) return null
  const siblings = data.builds.filter((b) => b.tier === build.tier)
  const animationKey = switches > 0 ? `${active}-${switches}` : null

  return (
    <section
      ref={section}
      className="hero"
      data-scene-top
      data-material={build.material}
      style={
        {
          '--c': `var(--c-${build.slug})`,
          '--fs': build.nameSize,
        } as CSSProperties
      }
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      onFocus={() => (focus.current = true)}
      onBlur={onBlur}
    >
      <div className="hero__frame">
        <div className="hero__scenes" aria-hidden="true">
          {mounted.map((slug) => {
            const b = builds.get(slug)
            if (!b) return null
            return (
              <div key={slug} className="hero__scene" data-on={slug === active}>
                <Image
                  src={`/scenes/${b.key}-hero.webp`}
                  alt=""
                  fill
                  sizes="(max-width: 1023px) 450vw, 300vw"
                  loading={slug === first ? 'eager' : 'lazy'}
                />
              </div>
            )
          })}
        </div>
        <div className="hero__veil" aria-hidden="true" />
        <div className="hero__fgs" aria-hidden="true">
          {mounted.map((slug) => {
            const b = builds.get(slug)
            if (!b) return null
            return (
              <div key={slug} className="hero__fg" data-on={slug === active}>
                <Image src={`/scenes/${b.key}-fg.webp`} alt="" fill sizes="125vw" />
              </div>
            )
          })}
        </div>
        <div className="hero__edge" aria-hidden="true" />

        <div
          key={`title-${animationKey}`}
          className={animationKey ? 'hero__title is-new' : 'hero__title'}
          aria-hidden="true"
        >
          <span className="hero__realm">
            <b>Moc {build.tierRoman}</b>
            <i>{build.tierLabel}</i>
          </span>
          <span className="hero__epithet">
            <span className="hero__flourish" />
            {build.epithet}
            <span className="hero__flourish hero__flourish--r" />
          </span>
          <span className="hero__name">{build.name}</span>
        </div>

        <div className="hero__stage" aria-hidden="true">
          <span className="hero__halo" />
          <Pedestal />
          {mounted.map((slug) => {
            const b = builds.get(slug)
            if (!b?.photo) return null
            return (
              <div
                key={slug}
                className="hero__photo"
                data-on={slug === active}
                data-new={slug === active && animationKey !== null}
                style={{ ['--c' as string]: `var(--c-${b.slug})` }}
              >
                <Image
                  src={b.photo.src}
                  alt=""
                  fill
                  sizes="(max-width: 1023px) 80vw, 36vw"
                  loading={slug === first ? 'eager' : 'lazy'}
                  // The photo is the LCP element on a phone (Lighthouse, G7); the scene is backdrop.
                  fetchPriority={slug === first ? 'high' : undefined}
                />
              </div>
            )
          })}
        </div>

        <div className="hero__copy">
          <p className="hero__kicker">
            <IconRosette size={20} />
            <span>Rabka-Zdrój, od 2004 roku</span>
          </p>
          <h1>Komputery do gier. Sprawdzone w&nbsp;grach.</h1>
          <p className="hero__lead">
            Składamy je ręcznie w Rabce-Zdroju i zanim do Ciebie trafią, mierzymy klatki w grach, w
            które grasz. Każdy nosi imię istoty ze słowiańskich podań: im wyżej, tym potężniejsza.
          </p>
          <div className="hero__cta">
            <ButtonLink href="/konfigurator" size="lg">
              Dobierz komputer
            </ButtonLink>
            <ButtonLink href="/zestawy" variant="ghost" size="lg">
              Zobacz wszystkie zestawy
            </ButtonLink>
          </div>
          <ul className="hero__trust">
            <li>
              <IconClock size={17} />
              <span>Odpowiedź w godzinę, 8–22</span>
            </li>
            <li>
              <IconShield size={17} />
              <span>2 lata gwarancji</span>
            </li>
            <li>
              <IconShop size={17} />
              <span>Sklepy w Rabce i Zakopanem</span>
            </li>
          </ul>
        </div>

        <HeroCard
          build={build}
          siblings={siblings}
          pricedAt={data.pricedAt}
          animationKey={animationKey}
          onPick={pick}
        />

        <TierStrip tiers={data.tiers} builds={builds} activeTier={build.tier} onPick={pick} />
      </div>
    </section>
  )
}
