import { createRequire } from 'module'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

const require = createRequire(import.meta.url)

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // `import 'server-only'` throws outside Next's server bundle; Next ships the marker itself
      // (no extra dependency). Tests run on the server side, so they get its empty variant.
      'server-only': require.resolve('next/dist/compiled/server-only/empty.js'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
