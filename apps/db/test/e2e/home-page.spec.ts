import { Pool } from 'pg'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'

describe('Home Page', async () => {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS home_page_test;
      CREATE TABLE IF NOT EXISTS home_page_test.sample_table (
        id SERIAL PRIMARY KEY,
        name TEXT
      );
    `)
  })

  afterAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS home_page_test.sample_table;
      DROP SCHEMA IF EXISTS home_page_test;
    `)
    await pool.end()
  })

  await setupE2E()

  it('/home loads successfully', async () => {
    const res = await fetch('/home')
    expect(res.status).toBe(200)

    const html = await res.text()
    expect(html).toContain('Database Home')
    expect(html).toContain('Query')
    expect(html).toContain('Home')
  })

  it('/ redirects to /home', async () => {
    const res = await fetch('/')
    expect(res.status).toBe(200)

    const html = await res.text()
    expect(html).toContain('Database Home')
  })
})
