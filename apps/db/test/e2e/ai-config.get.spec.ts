import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'

describe('GET /api/ai/config', async () => {
  await setupE2E({
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
  })

  it('returns enabled: false by default', async () => {
    const res = await $fetch('/api/ai/config')

    expect(res.enabled).toBe(false)
    expect(res.providerUrl).toBeUndefined()
    expect(res.provider).toBeUndefined()
    expect(res.model).toBeUndefined()
    expect(res.maxTokens).toBeUndefined()
  })
})
