import { Pool } from 'pg'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { fetch, setup } from '@nuxt/test-utils/e2e'

describe('GET /api/tables/:schema/:name', async () => {
  // Setup test database
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    // Create test table with data
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS test_api_detail;
      DROP TABLE IF EXISTS test_api_detail.paginated_table;
      CREATE TABLE test_api_detail.paginated_table (
        id SERIAL PRIMARY KEY,
        name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      INSERT INTO test_api_detail.paginated_table (name) 
      SELECT 'row_' || generate_series(1, 100);
    `)
  })

  afterAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS test_api_detail.paginated_table;
      DROP SCHEMA IF EXISTS test_api_detail;
    `)
    await pool.end()
  })

  await setup({
    host: process.env.TEST_HOST,
    nuxtConfig: {
      runtimeConfig: {
        databaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
      },
    },
  })

  it('returns records, totalCount, and columns', async () => {
    const res = await fetch('/api/tables/test_api_detail/paginated_table')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.records).toBeDefined()
    expect(Array.isArray(body.records)).toBe(true)
    expect(body.totalCount).toBe(100)
    expect(body.columns).toContain('id')
    expect(body.columns).toContain('name')
    expect(body.columns).toContain('created_at')
  })

  it('supports pagination with page and limit query params', async () => {
    // Page 1, limit 10
    const page1Res = await fetch('/api/tables/test_api_detail/paginated_table?page=1&limit=10')
    const page1 = await page1Res.json()
    expect(page1.records).toHaveLength(10)
    expect(page1.totalCount).toBe(100)

    // Page 2, limit 10
    const page2Res = await fetch('/api/tables/test_api_detail/paginated_table?page=2&limit=10')
    const page2 = await page2Res.json()
    expect(page2.records).toHaveLength(10)

    // First record of page 2 should have id=11 (assuming ordered by id)
    expect(page2.records[0].id).toBe(11)
  })

  it('returns default limit of 50 when not specified', async () => {
    const res = await fetch('/api/tables/test_api_detail/paginated_table')
    const body = await res.json()
    expect(body.records).toHaveLength(50)
  })

  it('returns 400 for invalid schema/table names', async () => {
    const res = await fetch('/api/tables/invalid;schema/table')
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent table', async () => {
    const res = await fetch('/api/tables/test_api_detail/nonexistent')
    expect(res.status).toBe(404)
  })

  it('handles empty tables correctly', async () => {
    await pool.query('CREATE TABLE IF NOT EXISTS test_api_detail.empty_table (col1 TEXT)')

    const res = await fetch('/api/tables/test_api_detail/empty_table')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.records).toHaveLength(0)
    expect(body.totalCount).toBe(0)
    expect(body.columns).toContain('col1')

    await pool.query('DROP TABLE test_api_detail.empty_table')
  })
})