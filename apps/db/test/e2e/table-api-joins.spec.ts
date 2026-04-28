import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'
import { Pool } from 'pg'

describe('table api with joins', async () => {
  const started = await setupE2E()
  let pool: Pool

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/asodb_test' })

    // Create test schema with FK relationships
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS joins_test;
      DROP TABLE IF EXISTS joins_test.children CASCADE;
      DROP TABLE IF EXISTS joins_test.parents CASCADE;

      CREATE TABLE joins_test.parents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      );

      CREATE TABLE joins_test.children (
        id SERIAL PRIMARY KEY,
        parent_id INT REFERENCES joins_test.parents(id),
        name VARCHAR(255) NOT NULL
      );

      INSERT INTO joins_test.parents (name) VALUES ('Alice'), ('Bob');
      INSERT INTO joins_test.children (parent_id, name) VALUES (1, 'Child A1'), (1, 'Child A2'), (2, 'Child B1');
    `)
  })

  afterAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS joins_test.children CASCADE;
      DROP TABLE IF EXISTS joins_test.parents CASCADE;
      DROP SCHEMA IF EXISTS joins_test CASCADE;
    `)
    await pool.end()
  })

  it('returns joined data with ?joins= query param', { timeout: 15000 }, async () => {
    const res = await fetch('/api/tables/joins_test/parents?joins=children')
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.records).toBeDefined()
    expect(json.columns).toBeDefined()
    expect(json.totalCount).toBe(2)

    // Columns should be prefixed
    expect(json.columns).toContain('parents.id')
    expect(json.columns).toContain('parents.name')
    expect(json.columns).toContain('children.id')
    expect(json.columns).toContain('children.name')
    expect(json.columns).toContain('children.parent_id')
  })

  it('returns 400 for nonexistent join table', { timeout: 15000 }, async () => {
    const res = await fetch('/api/tables/joins_test/parents?joins=nonexistent')
    expect(res.status).toBe(400)
  })

  it('returns 400 for more than 3 joins (4 tables total)', { timeout: 15000 }, async () => {
    const res = await fetch('/api/tables/joins_test/parents?joins=children,extra1,extra2,extra3')
    expect(res.status).toBe(400)
  })

  it('sorts by base table column with joins', { timeout: 15000 }, async () => {
    const res = await fetch('/api/tables/joins_test/parents?joins=children&sort=parents.name&order=asc')
    expect(res.status).toBe(200)

    const json = await res.json()
    // Alice has 2 children, Bob has 1 → 3 rows total
    expect(json.records).toHaveLength(3)
    expect(json.records[0]['parents.name']).toBe('Alice')
    expect(json.records[1]['parents.name']).toBe('Alice')
    expect(json.records[2]['parents.name']).toBe('Bob')
  })

  it('sorts by base table column with joins (descending)', { timeout: 15000 }, async () => {
    const res = await fetch('/api/tables/joins_test/parents?joins=children&sort=parents.name&order=desc')
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.records).toHaveLength(3)
    expect(json.records[0]['parents.name']).toBe('Bob')
    expect(json.records[1]['parents.name']).toBe('Alice')
    expect(json.records[2]['parents.name']).toBe('Alice')
  })

  it('sorts by plain column name defaults to base table with joins', { timeout: 15000 }, async () => {
    const res = await fetch('/api/tables/joins_test/parents?joins=children&sort=name&order=asc')
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.records).toHaveLength(3)
    expect(json.records[0]['parents.name']).toBe('Alice')
  })
})
