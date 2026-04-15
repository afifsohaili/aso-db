import { Pool } from 'pg'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'

describe('GET /api/tables', async () => {
  // Setup test database
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    // Create test tables
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS test_api;
      DROP TABLE IF EXISTS test_api.test_table1;
      DROP TABLE IF EXISTS test_api.test_table2;
      CREATE TABLE test_api.test_table1 (id SERIAL PRIMARY KEY, name TEXT);
      CREATE TABLE test_api.test_table2 (id SERIAL PRIMARY KEY, value INTEGER);
    `)
  })

  afterAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS test_api.test_table1;
      DROP TABLE IF EXISTS test_api.test_table2;
      DROP SCHEMA IF EXISTS test_api;
    `)
    await pool.end()
  })

  await setupE2E()

  it('returns 200 with tables array', async () => {
    const res = await fetch('/api/tables')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.tables).toBeDefined()
    expect(Array.isArray(body.tables)).toBe(true)
  })

  it('tables contain schema and name properties', async () => {
    const res = await fetch('/api/tables')
    const body = await res.json()

    const testTable = body.tables.find((t: any) =>
      t.schema === 'test_api' && t.name === 'test_table1',
    )
    expect(testTable).toBeDefined()
    expect(testTable.schema).toBe('test_api')
    expect(testTable.name).toBe('test_table1')
  })

  it('excludes system schemas from results', async () => {
    const res = await fetch('/api/tables')
    const body = await res.json()

    const hasSystemSchema = body.tables.some((t: any) =>
      t.schema === 'information_schema'
      || t.schema === 'pg_catalog'
      || t.schema.startsWith('pg_toast'),
    )
    expect(hasSystemSchema).toBe(false)
  })

  it('returns tables ordered by schema, name', async () => {
    const res = await fetch('/api/tables')
    const body = await res.json()

    // Verify ordering
    for (let i = 1; i < body.tables.length; i++) {
      const prev = body.tables[i - 1]
      const curr = body.tables[i]
      const prevKey = `${prev.schema}.${prev.name}`
      const currKey = `${curr.schema}.${curr.name}`
      expect(currKey >= prevKey).toBe(true)
    }
  })
})