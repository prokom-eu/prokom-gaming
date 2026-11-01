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
import * as migration_20261030_202851_guides from './20261030_202851_guides'
import * as migration_20261030_212115_stock_vouchers from './20261030_212115_stock_vouchers'
import * as migration_20261030_231049_g14_orders_units_customers from './20261030_231049_g14_orders_units_customers'
import * as migration_20261031_180205_p1_warn_margin from './20261031_180205_p1_warn_margin'
import * as migration_20261031_193026_p3_inquiry_thread from './20261031_193026_p3_inquiry_thread'
import * as migration_20261031_212944_p4_mail_intake from './20261031_212944_p4_mail_intake'
import * as migration_20261031_222946_p4_push from './20261031_222946_p4_push'
import * as migration_20261031_235857_p6_cost_source from './20261031_235857_p6_cost_source'
import * as migration_20261101_004700_p6_offer_status from './20261101_004700_p6_offer_status'

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
  {
    up: migration_20261030_202851_guides.up,
    down: migration_20261030_202851_guides.down,
    name: '20261030_202851_guides',
  },
  {
    up: migration_20261030_212115_stock_vouchers.up,
    down: migration_20261030_212115_stock_vouchers.down,
    name: '20261030_212115_stock_vouchers',
  },
  {
    up: migration_20261030_231049_g14_orders_units_customers.up,
    down: migration_20261030_231049_g14_orders_units_customers.down,
    name: '20261030_231049_g14_orders_units_customers',
  },
  {
    up: migration_20261031_180205_p1_warn_margin.up,
    down: migration_20261031_180205_p1_warn_margin.down,
    name: '20261031_180205_p1_warn_margin',
  },
  {
    up: migration_20261031_193026_p3_inquiry_thread.up,
    down: migration_20261031_193026_p3_inquiry_thread.down,
    name: '20261031_193026_p3_inquiry_thread',
  },
  {
    up: migration_20261031_212944_p4_mail_intake.up,
    down: migration_20261031_212944_p4_mail_intake.down,
    name: '20261031_212944_p4_mail_intake',
  },
  {
    up: migration_20261031_222946_p4_push.up,
    down: migration_20261031_222946_p4_push.down,
    name: '20261031_222946_p4_push',
  },
  {
    up: migration_20261031_235857_p6_cost_source.up,
    down: migration_20261031_235857_p6_cost_source.down,
    name: '20261031_235857_p6_cost_source',
  },
  {
    up: migration_20261101_004700_p6_offer_status.up,
    down: migration_20261101_004700_p6_offer_status.down,
    name: '20261101_004700_p6_offer_status',
  },
]
