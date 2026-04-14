import { describe, expect, it } from 'vitest'
import { fetch, setup } from '@nuxt/test-utils/e2e'

describe('query database migrations', async () => {
  await setup({
    host: process.env.TEST_HOST,
    nuxtConfig: {
      runtimeConfig: {
        databaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
      },
    },
  })

  it('creates query_sessions table and returns default session', async () => {
    const res = await fetch('/api/query/session')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.session).toBeDefined()
    expect(body.session.id).toBe(1)
    expect(body.session.sqlContent).toBe('')
  })
})
