import { Pool } from 'pg'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'

describe('Join View Page', async () => {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS join_test;

      CREATE TABLE IF NOT EXISTS join_test.parents (
        id SERIAL PRIMARY KEY,
        name TEXT
      );

      CREATE TABLE IF NOT EXISTS join_test.children (
        id SERIAL PRIMARY KEY,
        parent_id INTEGER REFERENCES join_test.parents(id),
        child_name TEXT
      );

      INSERT INTO join_test.parents (name) VALUES ('Alice'), ('Bob');
      INSERT INTO join_test.children (parent_id, child_name) VALUES (1, 'Child A1'), (1, 'Child A2'), (2, 'Child B1');
    `)
  })

  afterAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS join_test.children;
      DROP TABLE IF EXISTS join_test.parents;
      DROP SCHEMA IF EXISTS join_test;
    `)
    await pool.end()
  })

  await setupE2E()

  it('renders join view page', { timeout: 15000 }, async () => {
    const res = await fetch('/join/join_test/parents/join_test/children')
    expect(res.status).toBe(200)

    const html = await res.text()
    expect(html).toContain('parents')
    expect(html).toContain('children')
    expect(html).toContain('Back')
    expect(html).toContain('JOIN')
  })

  it('displays joined data', { timeout: 15000 }, async () => {
    const res = await fetch('/join/join_test/parents/join_test/children')
    const html = await res.text()

    // Should show parent names and child names in the joined result
    expect(html).toContain('Alice')
    expect(html).toContain('Bob')
    expect(html).toContain('Child A1')
    expect(html).toContain('Child A2')
    expect(html).toContain('Child B1')
  })
})
