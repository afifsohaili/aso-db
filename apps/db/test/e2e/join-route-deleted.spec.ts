import { describe, expect, it } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'

describe('join route deleted', async () => {
  await setupE2E()

  it('returns 404 for old /join/ route', async () => {
    const res = await fetch('/join/public/parents/public/children')
    expect(res.status).toBe(404)
  })
})
