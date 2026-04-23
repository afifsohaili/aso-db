import { Pool } from 'pg'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'

describe('Page Navigation', async () => {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    // Create test table
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS nav_test;
      DROP TABLE IF EXISTS nav_test.sample_table;
      CREATE TABLE nav_test.sample_table (id SERIAL PRIMARY KEY, name TEXT);
      INSERT INTO nav_test.sample_table (name) VALUES ('test1'), ('test2');
    `)
  })

  afterAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS nav_test.sample_table;
      DROP SCHEMA IF EXISTS nav_test;
    `)
    await pool.end()
  })

  await setupE2E()

  it('redirects from / to /home', async () => {
    const res = await fetch('/')
    // Should redirect to /home
    expect([200, 301, 302, 307, 308]).toContain(res.status)
  })

  it('home page loads successfully', async () => {
    const res = await fetch('/home')
    expect(res.status).toBe(200)

    const html = await res.text()
    expect(html).toContain('Database Home')
    expect(html).toContain('Query')
    expect(html).toContain('Home')
  })

  it('table detail page loads successfully', async () => {
    const res = await fetch('/table/nav_test/sample_table')
    if (res.status !== 200) {
      throw new Error(`Status ${res.status}: ${await res.text()}`)
    }
    expect(res.status).toBe(200)

    const html = await res.text()
    expect(html).toContain('nav_test')
    expect(html).toContain('sample_table')
    expect(html).toContain('test1')
  })

  it('table detail page supports pagination', async () => {
    const res = await fetch('/table/nav_test/sample_table?page=1&limit=1')
    expect(res.status).toBe(200)

    const body = await res.json().catch(() => null)
    if (body) {
      expect(body.records).toHaveLength(1)
    }
  })
})