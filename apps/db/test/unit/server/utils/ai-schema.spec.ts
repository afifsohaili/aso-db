import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildSchemaContext, extractTableNames } from '../../../../server/utils/ai-schema'

const { Pool } = pg

describe('extractTableNames', () => {
  it('extracts FROM table', () => {
    const names = extractTableNames('SELECT * FROM users')
    expect(names).toContain('users')
  })

  it('extracts JOIN table', () => {
    const names = extractTableNames('SELECT * FROM users JOIN orders ON users.id = orders.user_id')
    expect(names).toContain('users')
    expect(names).toContain('orders')
  })

  it('extracts INSERT INTO table', () => {
    const names = extractTableNames('INSERT INTO users (name) VALUES (\'John\')')
    expect(names).toContain('users')
  })

  it('extracts UPDATE table', () => {
    const names = extractTableNames('UPDATE users SET name = \'Jane\' WHERE id = 1')
    expect(names).toContain('users')
  })

  it('returns empty for invalid SQL', () => {
    const names = extractTableNames('INVALID SQL HERE')
    expect(names.length).toBe(0)
  })
})

describe('buildSchemaContext', () => {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_test_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_test_orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES ai_test_users(id),
        total DECIMAL(10,2),
        status VARCHAR(50),
        created_at TIMESTAMP
      )
    `)
  })

  afterAll(async () => {
    await pool.query('DROP TABLE IF EXISTS ai_test_orders CASCADE')
    await pool.query('DROP TABLE IF EXISTS ai_test_users CASCADE')
    await pool.end()
  })

  it('includes referenced tables first', async () => {
    const context = await buildSchemaContext(
      pool,
      'SELECT * FROM ai_test_users',
      1500,
    )

    expect(context).toContain('ai_test_users')
    expect(context).toContain('id:pk')
    expect(context).toContain('email:uk')
  })

  it('includes FK relationships', async () => {
    const context = await buildSchemaContext(
      pool,
      'SELECT * FROM ai_test_users',
      1500,
    )

    // ai_test_orders references ai_test_users, so it should appear
    expect(context).toContain('ai_test_orders')
    expect(context).toContain('fk→ai_test_users.id')
  })

  it('respects token budget', async () => {
    const context = await buildSchemaContext(
      pool,
      'SELECT 1',
      50,
    )

    // With a small token budget, only a few tables should fit
    expect(context.length).toBeLessThan(200)
  })

  it('formats compactly', async () => {
    const context = await buildSchemaContext(
      pool,
      'SELECT * FROM ai_test_users',
      1500,
    )

    // Check compact format: table:col:flags,col (no types)
    expect(context).toMatch(/^\w+:[\w,→fk:]+/m)
  })
})
