import { Pool } from 'pg'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'

describe('Query Page', async () => {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS query_page_test;
      CREATE TABLE IF NOT EXISTS query_page_test.sample (
        id SERIAL PRIMARY KEY,
        name TEXT
      );
      DELETE FROM query_page_test.sample;
      INSERT INTO query_page_test.sample (name) VALUES ('alice'), ('bob');
    `)
  })

  afterAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS query_page_test.sample;
      DROP SCHEMA IF EXISTS query_page_test;
    `)
    await pool.end()
  })

  await setupE2E()

  it('/query loads successfully', async () => {
    const res = await fetch('/query')
    expect(res.status).toBe(200)

    const html = await res.text()
    expect(html).toContain('Run All')
    expect(html).toContain('Results')
  })

  it('executes a query and returns results', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: {
        sql: `SELECT * FROM query_page_test.sample WHERE name = 'alice'`,
      },
    })

    expect(res.results).toHaveLength(1)
    expect(res.results[0].success).toBe(true)
    expect(res.results[0].rowCount).toBe(1)
  })

  it('saves a query and lists it', async () => {
    const created = await $fetch('/api/query/saved', {
      method: 'POST',
      body: {
        title: 'Page Test Query',
        sqlContent: `SELECT 1`,
      },
    })

    expect(created.title).toBe('Page Test Query')

    const list = await $fetch('/api/query/saved')
    expect(list.savedQueries.some((q: any) => q.id === created.id)).toBe(true)
  })

  it('reads and writes session', async () => {
    const written = await $fetch('/api/query/session', {
      method: 'PUT',
      body: { sqlContent: 'SELECT session_from_page' },
    })
    expect(written.session.sqlContent).toBe('SELECT session_from_page')

    const read = await $fetch('/api/query/session')
    expect(read.session.sqlContent).toBe('SELECT session_from_page')
  })
})
