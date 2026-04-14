import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import pg from 'pg'

const { Pool } = pg

describe('server/utils/tables', () => {
  // Use a test database connection - adjust these credentials as needed
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    // Create test tables
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS test_schema;
      DROP TABLE IF EXISTS test_schema.test_table;
      CREATE TABLE test_schema.test_table (
        id SERIAL PRIMARY KEY,
        name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      INSERT INTO test_schema.test_table (name) VALUES ('row1'), ('row2'), ('row3');
    `)
  })

  afterAll(async () => {
    // Cleanup
    await pool.query(`
      DROP TABLE IF EXISTS test_schema.test_table;
      DROP SCHEMA IF EXISTS test_schema;
    `)
    await pool.end()
  })

  describe('listTables', () => {
    it('should return array of TableInfo with schema and name', async () => {
      const { listTables } = await import('../../../../server/utils/db')
      const tables = await listTables(pool)

      const testTable = tables.find(t => t.schema === 'test_schema' && t.name === 'test_table')
      expect(testTable).toBeDefined()
    })

    it('should exclude system schemas', async () => {
      const { listTables } = await import('../../../../server/utils/db')
      const tables = await listTables(pool)

      const hasSystemSchema = tables.some(t =>
        t.schema === 'information_schema'
        || t.schema === 'pg_catalog'
        || t.schema.startsWith('pg_toast')
        || t.schema.startsWith('pg_temp_'),
      )
      expect(hasSystemSchema).toBe(false)
    })

    it('should return tables ordered by schema, name', async () => {
      const { listTables } = await import('../../../../server/utils/db')
      const tables = await listTables(pool)

      // Verify ordering - each table should be >= previous in sort order
      for (let i = 1; i < tables.length; i++) {
        const prev = tables[i - 1]
        const curr = tables[i]
        const prevKey = `${prev.schema}.${prev.name}`
        const currKey = `${curr.schema}.${curr.name}`
        expect(currKey >= prevKey).toBe(true)
      }
    })
  })

  describe('fetchTableRecords', () => {
    it('should return records, totalCount, and columns', async () => {
      const { fetchTableRecords } = await import('../../../../server/utils/tables')
      const result = await fetchTableRecords(pool, {
        schema: 'test_schema',
        tableName: 'test_table',
        page: 1,
        limit: 10,
      })

      expect(result.records).toHaveLength(3)
      expect(result.totalCount).toBe(3)
      expect(result.columns).toContain('id')
      expect(result.columns).toContain('name')
      expect(result.columns).toContain('created_at')
    })

    it('should support pagination with page and limit', async () => {
      const { fetchTableRecords } = await import('../../../../server/utils/tables')

      // Page 1, limit 2
      const page1 = await fetchTableRecords(pool, {
        schema: 'test_schema',
        tableName: 'test_table',
        page: 1,
        limit: 2,
      })
      expect(page1.records).toHaveLength(2)

      // Page 2, limit 2
      const page2 = await fetchTableRecords(pool, {
        schema: 'test_schema',
        tableName: 'test_table',
        page: 2,
        limit: 2,
      })
      expect(page2.records).toHaveLength(1)

      // Page 3 should be empty
      const page3 = await fetchTableRecords(pool, {
        schema: 'test_schema',
        tableName: 'test_table',
        page: 3,
        limit: 2,
      })
      expect(page3.records).toHaveLength(0)
    })

    it('should return columns from information_schema for empty tables', async () => {
      // Create empty table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS test_schema.empty_table (col1 TEXT, col2 INTEGER);
      `)

      const { fetchTableRecords } = await import('../../../../server/utils/tables')
      const result = await fetchTableRecords(pool, {
        schema: 'test_schema',
        tableName: 'empty_table',
        page: 1,
        limit: 10,
      })

      expect(result.records).toHaveLength(0)
      expect(result.columns).toEqual(['col1', 'col2'])

      // Cleanup
      await pool.query('DROP TABLE test_schema.empty_table')
    })

    it('should throw error for non-existent table', async () => {
      const { fetchTableRecords } = await import('../../../../server/utils/tables')

      await expect(fetchTableRecords(pool, {
        schema: 'nonexistent',
        tableName: 'nonexistent',
        page: 1,
        limit: 10,
      })).rejects.toThrow()
    })
  })
})