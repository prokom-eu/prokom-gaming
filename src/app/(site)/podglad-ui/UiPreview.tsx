'use client'

import { useState } from 'react'

import { BottomSheet } from '@/components/BottomSheet'
import { CookieBanner } from '@/components/CookieBanner'
import { HScroll } from '@/components/HScroll'
import { Sigil } from '@/components/Sigil'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Container } from '@/components/ui/Container'
import { Segmented } from '@/components/ui/Segmented'
import { menuCreatures } from '@/lib/site'

const resolutions = [
  { value: 'fullhd', label: 'FullHD' },
  { value: '2k', label: '2K' },
  { value: '4k', label: '4K' },
] as const

type Resolution = (typeof resolutions)[number]['value']

export function UiPreview() {
  const [res, setRes] = useState<Resolution>('fullhd')
  const [white, setWhite] = useState(false)
  const [sheet, setSheet] = useState(false)

  return (
    <Container className="space-y-10 py-16">
      <h1 className="h text-kosc-hi text-5xl">Podgląd komponentów</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Button</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Dobierz komputer</Button>
          <Button variant="ghost">Wszystkie zestawy</Button>
          <Button size="lg">Strona główna</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Chip i Segmented</h2>
        <div className="flex flex-wrap gap-3">
          <Chip pressed={!white} onClick={() => setWhite(false)}>
            Czarna
          </Chip>
          <Chip pressed={white} onClick={() => setWhite(true)}>
            Biała
          </Chip>
        </div>
        <Segmented label="Rozdzielczość" options={resolutions} value={res} onChange={setRes} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Sigil i HScroll</h2>
        <HScroll as="ul" className="m-0 list-none p-0" tabIndex={0} aria-label="Pieczęcie 16 istot">
          {menuCreatures.map((c) => (
            <li key={c.slug} style={{ color: `var(--c-${c.slug})` }}>
              <Sigil id={c.id} size={56} label={c.name} />
            </li>
          ))}
        </HScroll>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">BottomSheet</h2>
        <Button variant="ghost" onClick={() => setSheet(true)} aria-haspopup="dialog">
          Otwórz arkusz
        </Button>
        <BottomSheet
          open={sheet}
          onClose={() => setSheet(false)}
          label="Przykładowy arkusz"
          closeLabel="Zamknij arkusz"
          headerStart={<b>Przykładowy arkusz</b>}
        >
          <p className="text-lead">
            Treść arkusza. Esc, tło, krzyżyk albo przesunięcie w dół zamyka.
          </p>
          <Button onClick={() => setSheet(false)}>Gotowe</Button>
        </BottomSheet>
      </section>

      <CookieBanner enabled />
    </Container>
  )
}
