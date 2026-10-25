import * as migration_20261025_203319_initial from './20261025_203319_initial'

export const migrations = [
  {
    up: migration_20261025_203319_initial.up,
    down: migration_20261025_203319_initial.down,
    name: '20261025_203319_initial',
  },
]
