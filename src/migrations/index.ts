import * as migration_20261025_203319_initial from './20261025_203319_initial'
import * as migration_20261025_220132_offer from './20261025_220132_offer'
import * as migration_20261026_213241_jobs from './20261026_213241_jobs'

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
  {
    up: migration_20261026_213241_jobs.up,
    down: migration_20261026_213241_jobs.down,
    name: '20261026_213241_jobs',
  },
]
