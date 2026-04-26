import { Pool } from 'pg'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'

describe('GET /api/schema', async () => {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    // Create test tables with columns
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS test_schema;
      DROP TABLE IF EXISTS test_schema.test_users;
      DROP TABLE IF EXISTS test_schema.test_orders;
      CREATE TABLE test_schema.test_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name TEXT
      );
      CREATE TABLE test_schema.test_orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        total DECIMAL(10,2)
      );
    `)
  })

  afterAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS test_schema.test_users;
      DROP TABLE IF EXISTS test_schema.test_orders;
      DROP SCHEMA IF EXISTS test_schema;
    `)
    await pool.end()
  })

  await setupE2E()

  it('returns 200 with tables array containing columns', async () => {
    const res = await fetch('/api/schema')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.tables).toBeDefined()
    expect(Array.isArray(body.tables)).toBe(true)

    // Should include our test tables
    const usersTable = body.tables.find((t: any) =>
      t.schema === 'test_schema' && t.name === 'test_users',
    )
    expect(usersTable).toBeDefined()
    expect(usersTable.columns).toBeDefined()
    expect(Array.isArray(usersTable.columns)).toBe(true)
    expect(usersTable.columns).toContain('id')
    expect(usersTable.columns).toContain('email')
    expect(usersTable.columns).toContain('name')

    const ordersTable = body.tables.find((t: any) =>
      t.schema === 'test_schema' && t.name === 'test_orders',
    )
    expect(ordersTable).toBeDefined()
    expect(ordersTable.columns).toContain('id')
    expect(ordersTable.columns).toContain('user_id')
    expect(ordersTable.columns).toContain('total')
  })

  it('excludes system schemas', async () => {
    const res = await fetch('/api/schema')
    const body = await res.json()

    const hasSystemSchema = body.tables.some((t: any) =>
      t.schema === 'information_schema'
      || t.schema === 'pg_catalog'
      || t.schema.startsWith('pg_toast'),
    )
    expect(hasSystemSchema).toBe(false)
  })

  it('returns tables ordered by schema, name', async () => {
    const res = await fetch('/api/schema')
    const body = await res.json()

    for (let i = 1; i < body.tables.length; i++) {
      const prev = body.tables[i - 1]
      const curr = body.tables[i]
      const prevKey = `${prev.schema}.${prev.name}`
      const currKey = `${curr.schema}.${curr.name}`
      expect(currKey >= prevKey).toBe(true)
    }
  })

  it('caches schema and returns on second request', async () => {
    // First request populates cache
    const res1 = await fetch('/api/schema')
    expect(res1.status).toBe(200)

    // Second request should hit cache
    const res2 = await fetch('/api/schema')
    expect(res2.status).toBe(200)

    const body2 = await res2.json()
    const usersTable = body2.tables.find((t: any) =>
      t.schema === 'test_schema' && t.name === 'test_users',
    )
    expect(usersTable).toBeDefined()
    expect(usersTable.columns).toContain('email')
  })
})
