import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'
import pg from 'pg'

describe('POST /api/query/execute read-only guard', async () => {
  const pool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  await setupE2E()

  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_readonly_guard (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      )
    `)
  })

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS test_readonly_guard`)
    await pool.end()
  })

  it('blocks INSERT in read-only mode', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: `INSERT INTO test_readonly_guard (name) VALUES ('blocked')` },
    })

    expect(res.results).toHaveLength(1)
    expect(res.results[0].success).toBe(false)
    expect(res.results[0].errorMessage).toMatch(/read.only/i)
  })

  it('blocks UPDATE in read-only mode', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: `UPDATE test_readonly_guard SET name = 'x' WHERE id = 1` },
    })

    expect(res.results[0].success).toBe(false)
    expect(res.results[0].errorMessage).toMatch(/read.only/i)
  })

  it('blocks DELETE in read-only mode', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: `DELETE FROM test_readonly_guard WHERE id = 1` },
    })

    expect(res.results[0].success).toBe(false)
    expect(res.results[0].errorMessage).toMatch(/read.only/i)
  })

  it('blocks CREATE in read-only mode', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: `CREATE TABLE test_readonly_tmp (id INT)` },
    })

    expect(res.results[0].success).toBe(false)
    expect(res.results[0].errorMessage).toMatch(/read.only/i)
  })

  it('blocks DROP in read-only mode', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: `DROP TABLE IF EXISTS test_readonly_tmp` },
    })

    expect(res.results[0].success).toBe(false)
    expect(res.results[0].errorMessage).toMatch(/read.only/i)
  })

  it('blocks EXPLAIN ANALYZE in read-only mode', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: `EXPLAIN ANALYZE SELECT * FROM test_readonly_guard` },
    })

    expect(res.results[0].success).toBe(false)
    expect(res.results[0].errorMessage).toMatch(/read.only/i)
  })

  it('allows plain EXPLAIN in read-only mode', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: `EXPLAIN SELECT * FROM test_readonly_guard` },
    })

    expect(res.results[0].success).toBe(true)
  })

  it('allows SELECT in read-only mode', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: `SELECT * FROM test_readonly_guard` },
    })

    expect(res.results[0].success).toBe(true)
  })
})
