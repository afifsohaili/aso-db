import { setup } from '@nuxt/test-utils/e2e'
import type { TestOptions } from '@nuxt/test-utils'

export async function setupE2E(options?: Partial<TestOptions>) {
  return setup({
    host: process.env.TEST_HOST,
    nuxtConfig: {
      runtimeConfig: {
        databaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
      },
      nitro: {
        database: {
          default: {
            connector: 'sqlite',
            options: { name: ':memory:' },
          },
        },
      },
    },
    ...options,
  })
}
