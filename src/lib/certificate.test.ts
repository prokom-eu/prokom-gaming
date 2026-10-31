import { describe, expect, it } from 'vitest'

import { certificateView, plDate, type CertificateSource } from './certificate'

const source: CertificateSource = {
  code: 'WMPR-7KQ2-M9XA-B3CD',
  number: 7,
  build: { name: 'Wampir', slug: 'wampir', key: 'wampir', tierRoman: 'V' },
  serial: 'PKG-1',
  testedAt: '2026-11-14T10:00:00.000Z',
  warrantyUntil: '2028-11-14T00:00:00.000Z',
  assembledBy: ' ',
  stressTest: { minutes: 60, errors: 0 },
  temps: { cpuMax: 78, gpuMax: 71 },
  fpsSetup: { resolution: 'qhd', settings: 'wysokie', driver: '576.40' },
  fps: [
    { game: { name: 'Cyberpunk 2077', kind: 'aaa', fpsCap: null }, fps: 96 },
    { game: { name: 'Counter-Strike 2', kind: 'esport', fpsCap: null }, fps: 412 },
  ],
  parts: [
    {
      label: 'Karta graficzna RTX 5070 Ti 16 GB',
      manufacturer: 'Przykład',
      model: 'RTX 5070 Ti 16G',
      serial: 'SN1',
      warrantyUntil: '2029-11-14T00:00:00.000Z',
    },
    {
      label: 'Pamięć 32 GB DDR5',
      manufacturer: null,
      model: null,
      serial: '',
      warrantyUntil: null,
    },
  ],
  stage: 'shipped',
}

describe('certificateView', () => {
  const view = certificateView(source)

  it('titles the page like the board', () => {
    expect(view.title).toBe('Wampir, egzemplarz nr 7')
    expect(view.subtitle).toBe('Egzemplarz nr 7, Moc V')
  })

  it('shows the stress test and temperatures', () => {
    expect(view.stress).toEqual({ minutes: '60 min', result: 'bez błędów', ok: true })
    expect(view.temps).toEqual({ cpu: '78°C', gpu: '71°C' })
  })

  it('reports errors instead of hiding them', () => {
    const failed = certificateView({ ...source, stressTest: { minutes: 60, errors: 2 } })
    expect(failed.stress).toEqual({ minutes: '60 min', result: 'błędy: 2', ok: false })
  })

  it('hides the stress test until it is filled in', () => {
    expect(
      certificateView({ ...source, stressTest: { minutes: null, errors: null } }).stress,
    ).toBeNull()
  })

  it('builds the measurement caption of the board and bars on the shared scale', () => {
    expect(view.fps.caption).toBe('2K, ustawienia wysokie, sterownik 576.40, 14.11.2026')
    expect(view.fps.rows).toEqual([
      { name: 'Cyberpunk 2077', text: '96 FPS', percent: 48 },
      { name: 'Counter-Strike 2', text: '412 FPS', percent: 59 },
    ])
  })

  it('lists parts with maker, serial and warranty when known', () => {
    expect(view.parts[0]).toEqual({
      label: 'Karta graficzna RTX 5070 Ti 16 GB',
      maker: 'Przykład, RTX 5070 Ti 16G',
      details: 'SN SN1, gwarancja do 14.11.2029',
      serial: 'SN1',
    })
    expect(view.parts[1]).toEqual({
      label: 'Pamięć 32 GB DDR5',
      maker: null,
      details: null,
      serial: null,
    })
  })

  it('names the person only when filled in (consent)', () => {
    expect(view.assembledBy).toBeNull()
    expect(certificateView({ ...source, assembledBy: 'Marek' }).assembledBy).toBe('Marek')
  })

  it('shows the order timeline only for a unit with an order', () => {
    expect(view.timeline?.find((s) => s.state === 'now')?.label).toBe('Wysłany')
    expect(certificateView({ ...source, stage: null }).timeline).toBeNull()
  })
})

describe('plDate', () => {
  it('formats in Polish time and tolerates nothing', () => {
    expect(plDate('2026-12-31T23:30:00.000Z')).toBe('01.01.2027')
    expect(plDate(null)).toBeNull()
    expect(plDate('nonsense')).toBeNull()
  })
})
