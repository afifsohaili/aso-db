import { Pool } from 'pg'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'

describe('Relations API', async () => {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    // Create test schema with tables and foreign keys
    // orders.user_id -> users(id)
    // profiles.user_id -> users(id)
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS relations_test;

      CREATE TABLE IF NOT EXISTS relations_test.users (
        id SERIAL PRIMARY KEY,
        name TEXT
      );

      CREATE TABLE IF NOT EXISTS relations_test.orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES relations_test.users(id),
        amount DECIMAL
      );

      CREATE TABLE IF NOT EXISTS relations_test.profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES relations_test.users(id),
        bio TEXT
      );
    `)
  })

  afterAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS relations_test.orders;
      DROP TABLE IF EXISTS relations_test.profiles;
      DROP TABLE IF EXISTS relations_test.users;
      DROP SCHEMA IF EXISTS relations_test;
    `)
    await pool.end()
  })

  await setupE2E()

  it('returns incoming relations for users table', async () => {
    // users is referenced by orders and profiles
    const res = await fetch('/api/tables/relations_test/users/relations')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.relations).toBeDefined()
    expect(Array.isArray(data.relations)).toBe(true)

    // Should find 2 incoming relations: from orders and profiles
    const incoming = data.relations.filter((r: any) => r.targetTable === 'users')
    expect(incoming.length).toBeGreaterThanOrEqual(2)

    const orderRel = data.relations.find((r: any) =>
      r.sourceTable === 'orders' && r.targetTable === 'users',
    )
    const profileRel = data.relations.find((r: any) =>
      r.sourceTable === 'profiles' && r.targetTable === 'users',
    )

    expect(orderRel).toBeDefined()
    expect(orderRel.sourceColumn).toBe('user_id')
    expect(orderRel.targetColumn).toBe('id')

    expect(profileRel).toBeDefined()
    expect(profileRel.sourceColumn).toBe('user_id')
    expect(profileRel.targetColumn).toBe('id')
  })

  it('returns outgoing relations for orders table', async () => {
    // orders has a FK to users
    const res = await fetch('/api/tables/relations_test/orders/relations')
    const data = await res.json()

    expect(data.relations.length).toBeGreaterThanOrEqual(1)

    const usersRel = data.relations.find((r: any) =>
      r.sourceTable === 'orders' && r.targetTable === 'users',
    )
    expect(usersRel).toBeDefined()
    expect(usersRel.sourceColumn).toBe('user_id')
    expect(usersRel.targetColumn).toBe('id')
  })

  it('returns empty array for table with no relations', async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS relations_test.standalone (
        id SERIAL PRIMARY KEY
      );
    `)

    const res = await fetch('/api/tables/relations_test/standalone/relations')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.relations).toEqual([])

    await pool.query(`DROP TABLE IF EXISTS relations_test.standalone;`)
  })

  it('returns 400 for invalid identifier', async () => {
    const res = await fetch('/api/tables/public/"invalid"/relations')
    expect(res.status).toBe(400)
  })
})
