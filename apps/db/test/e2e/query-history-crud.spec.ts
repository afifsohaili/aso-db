import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'
import pg from 'pg'

describe('Query history and saved queries APIs', async () => {
  const pool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  await setupE2E()

  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_history_apis (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      )
    `)
    await pool.query(`DELETE FROM test_history_apis`)
  })

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS test_history_apis`)
    await pool.end()
  })

  it('saves a query and lists saved queries', async () => {
    const created = await $fetch('/api/query/saved', {
      method: 'POST',
      body: { title: 'My Test Query', sqlContent: 'SELECT 1' },
    })

    expect(created.title).toBe('My Test Query')
    expect(created.sqlContent).toBe('SELECT 1')
    expect(created.id).toBeDefined()

    const list = await $fetch('/api/query/saved')
    expect(list.savedQueries.some((q: any) => q.id === created.id)).toBe(true)
  })

  it('updates a saved query', async () => {
    const created = await $fetch('/api/query/saved', {
      method: 'POST',
      body: { title: 'Before', sqlContent: 'SELECT 1' },
    })

    const updated = await $fetch(`/api/query/saved/${created.id}`, {
      method: 'PUT',
      body: { title: 'After', sqlContent: 'SELECT 2' },
    })

    expect(updated.title).toBe('After')
    expect(updated.sqlContent).toBe('SELECT 2')
  })

  it('deletes a saved query', async () => {
    const created = await $fetch('/api/query/saved', {
      method: 'POST',
      body: { title: 'To Delete', sqlContent: 'SELECT 1' },
    })

    await $fetch(`/api/query/saved/${created.id}`, { method: 'DELETE' })

    try {
      await $fetch(`/api/query/saved/${created.id}`, {
        method: 'PUT',
        body: { title: 'X', sqlContent: 'SELECT 1' },
      })
      expect.fail('Should have thrown 404')
    }
    catch (err: any) {
      expect(err.statusCode).toBe(404)
    }
  })

  it('stars a history entry', async () => {
    await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: `SELECT 999 as star_test` },
    })

    const history = await $fetch('/api/query/history')
    expect(history.history.length).toBeGreaterThan(0)

    const entry = history.history.find((h: any) => h.sqlContent.includes('SELECT 999'))
    expect(entry).toBeDefined()

    const starred = await $fetch(`/api/query/history/${entry.id}/star`, { method: 'POST' })

    expect(starred.savedQuery.title).toContain('SELECT 999')
    expect(starred.savedQuery.sqlContent).toBe(entry.sqlContent)

    const list = await $fetch('/api/query/saved')
    expect(list.savedQueries.some((q: any) => q.id === starred.savedQuery.id)).toBe(true)
  })

  it('reads and writes the session', async () => {
    const written = await $fetch('/api/query/session', {
      method: 'PUT',
      body: { sqlContent: 'SELECT session_test' },
    })

    expect(written.session.sqlContent).toBe('SELECT session_test')

    const read = await $fetch('/api/query/session')
    expect(read.session.sqlContent).toBe('SELECT session_test')
  })

  it('returns 400 for invalid star id', async () => {
    try {
      await $fetch('/api/query/history/invalid/star', { method: 'POST' })
      expect.fail('Should have thrown')
    }
    catch (err: any) {
      expect(err.statusCode).toBe(400)
    }
  })

  it('returns 404 for starring non-existent history', async () => {
    try {
      await $fetch('/api/query/history/999999/star', { method: 'POST' })
      expect.fail('Should have thrown')
    }
    catch (err: any) {
      expect(err.statusCode).toBe(404)
    }
  })
})
