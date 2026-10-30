import * as migration_20261025_203319_initial from './20261025_203319_initial'
import * as migration_20261025_220132_offer from './20261025_220132_offer'
import * as migration_20261026_213241_jobs from './20261026_213241_jobs'
import * as migration_20261026_221159_games_fps from './20261026_221159_games_fps'
import * as migration_20261026_230923_inquiries from './20261026_230923_inquiries'
import * as migration_20261027_210131_builds_hero_text from './20261027_210131_builds_hero_text'
import * as migration_20261027_225655_faq from './20261027_225655_faq'
import * as migration_20261028_200007_faq_build from './20261028_200007_faq_build'
import * as migration_20261028_224243_games_intro from './20261028_224243_games_intro'
import * as migration_20261030_181905_inquiries_light_color from './20261030_181905_inquiries_light_color'
import * as migration_20261030_201740_legal_globals from './20261030_201740_legal_globals'

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
  {
    up: migration_20261027_225655_faq.up,
    down: migration_20261027_225655_faq.down,
    name: '20261027_225655_faq',
  },
  {
    up: migration_20261028_200007_faq_build.up,
    down: migration_20261028_200007_faq_build.down,
    name: '20261028_200007_faq_build',
  },
  {
    up: migration_20261028_224243_games_intro.up,
    down: migration_20261028_224243_games_intro.down,
    name: '20261028_224243_games_intro',
  },
  {
    up: migration_20261030_181905_inquiries_light_color.up,
    down: migration_20261030_181905_inquiries_light_color.down,
    name: '20261030_181905_inquiries_light_color',
  },
  {
    up: migration_20261030_201740_legal_globals.up,
    down: migration_20261030_201740_legal_globals.down,
    name: '20261030_201740_legal_globals',
  },
]
