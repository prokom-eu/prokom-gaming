import * as migration_20261025_203319_initial from './20261025_203319_initial'
import * as migration_20261025_220132_offer from './20261025_220132_offer'
import * as migration_20261026_213241_jobs from './20261026_213241_jobs'
import * as migration_20261026_221159_games_fps from './20261026_221159_games_fps'
import * as migration_20261026_230923_inquiries from './20261026_230923_inquiries'
import * as migration_20261027_210131_builds_hero_text from './20261027_210131_builds_hero_text'

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
  {
    up: migration_20261026_221159_games_fps.up,
    down: migration_20261026_221159_games_fps.down,
    name: '20261026_221159_games_fps',
  },
  {
    up: migration_20261026_230923_inquiries.up,
    down: migration_20261026_230923_inquiries.down,
    name: '20261026_230923_inquiries',
  },
  {
    up: migration_20261027_210131_builds_hero_text.up,
    down: migration_20261027_210131_builds_hero_text.down,
    name: '20261027_210131_builds_hero_text',
  },
]
