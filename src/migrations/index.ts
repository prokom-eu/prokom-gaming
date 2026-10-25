import * as migration_20261025_203319_initial from './20261025_203319_initial'
import * as migration_20261025_220132_offer from './20261025_220132_offer'

export const migrations = [
  {
    up: migration_20261025_203319_initial.up,
    down: migration_20261025_203319_initial.down,
    name: '20261025_203319_initial',
  },
  {
    up: migration_20261025_220132_offer.up,
    down: migration_20261025_220132_offer.down,
    name: '20261025_220132_offer',
  },
]
