import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import pg from 'pg'

describe('POST /api/query/execute', async () => {
  const pool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  await setup({
    host: process.env.TEST_HOST,
    nuxtConfig: {
      runtimeConfig: {
        databaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
      },
    },
  })

  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_query_execute (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      )
    `)
    await pool.query(`DELETE FROM test_query_execute`)
  })

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS test_query_execute`)
    await pool.end()
  })

  it('executes a single SELECT and returns result', async () => {
    await pool.query(`INSERT INTO test_query_execute (name) VALUES ('Alice')`)

    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: `SELECT * FROM test_query_execute WHERE name = 'Alice'` },
    })

    expect(res.results).toHaveLength(1)
    expect(res.results[0].success).toBe(true)
    expect(res.results[0].columns).toContain('id')
    expect(res.results[0].columns).toContain('name')
    expect(res.results[0].rows).toHaveLength(1)
    expect(res.results[0].rows[0].name).toBe('Alice')
  })

  it('executes multiple SELECTs in one request', async () => {
    await pool.query(`INSERT INTO test_query_execute (name) VALUES ('Bob')`)

    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: `SELECT * FROM test_query_execute WHERE name = 'Alice'; SELECT * FROM test_query_execute WHERE name = 'Bob'` },
    })

    expect(res.results).toHaveLength(2)
    expect(res.results[0].success).toBe(true)
    expect(res.results[1].success).toBe(true)
    expect(res.results[0].rows[0].name).toBe('Alice')
    expect(res.results[1].rows[0].name).toBe('Bob')
  })

  it('executes mixed DML and SELECT', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: {
        sql: `
          INSERT INTO test_query_execute (name) VALUES ('mixed_test');
          UPDATE test_query_execute SET name = 'updated' WHERE name = 'mixed_test';
          SELECT * FROM test_query_execute WHERE name = 'updated';
          DELETE FROM test_query_execute WHERE name = 'updated';
        `,
      },
    })

    expect(res.results).toHaveLength(4)
    expect(res.results[0].success).toBe(true)
    expect(res.results[1].success).toBe(true)
    expect(res.results[2].success).toBe(true)
    expect(res.results[3].success).toBe(true)
    expect(res.results[2].rows[0].name).toBe('updated')
  })

  it('runs only selected SQL when selectedSql is provided', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: {
        sql: `SELECT 1 as a; SELECT 2 as b;`,
        selectedSql: `SELECT 2 as b`,
      },
    })

    expect(res.results).toHaveLength(1)
    expect(res.results[0].success).toBe(true)
    expect(res.results[0].rows[0].b).toBe(2)
  })

  it('captures syntax errors in result without failing the request', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: 'SELECT * FROM non_existent_table_xyz_12345' },
    })

    expect(res.results).toHaveLength(1)
    expect(res.results[0].success).toBe(false)
    expect(res.results[0].errorMessage).toBeDefined()
  })

  it('continues executing after a failing statement', async () => {
    const res = await $fetch('/api/query/execute', {
      method: 'POST',
      body: { sql: `SELECT * FROM non_existent_table_xyz_12345; SELECT 1 as ok;` },
    })

    expect(res.results).toHaveLength(2)
    expect(res.results[0].success).toBe(false)
    expect(res.results[1].success).toBe(true)
    expect(res.results[1].rows[0].ok).toBe(1)
  })

  it('rejects empty sql with 400', async () => {
    try {
      await $fetch('/api/query/execute', {
        method: 'POST',
        body: { sql: '' },
      })
      expect.fail('Should have thrown')
    }
    catch (err: any) {
      expect(err.statusCode).toBe(400)
    }
  })
})
