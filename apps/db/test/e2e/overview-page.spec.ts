import { Pool } from 'pg'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'

describe('Overview Page', async () => {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS overview_page_test;
      CREATE TABLE IF NOT EXISTS overview_page_test.sample_table (
        id SERIAL PRIMARY KEY,
        name TEXT
      );
    `)
  })

  afterAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS overview_page_test.sample_table;
      DROP SCHEMA IF EXISTS overview_page_test;
    `)
    await pool.end()
  })

  await setupE2E()

  it('/overview loads successfully', async () => {
    const res = await fetch('/overview')
    expect(res.status).toBe(200)

    const html = await res.text()
    expect(html).toContain('Database Overview')
    expect(html).toContain('Query')
    expect(html).toContain('Overview')
  })
})
