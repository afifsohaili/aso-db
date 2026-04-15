import { describe, expect, it } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'

describe('query database migrations', async () => {
  await setupE2E()

  it('creates query_sessions table and returns default session', async () => {
    const res = await fetch('/api/query/session')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.session).toBeDefined()
    expect(body.session.id).toBe(1)
    expect(body.session.sqlContent).toBe('')
  })
})
