import { Pool } from 'pg'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { fetch } from '@nuxt/test-utils/e2e'
import { setupE2E } from './utils'

describe('GET /api/tables/:schema/:name structure', async () => {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    // Create test tables with rich structure
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS test_api_structure;
      DROP TABLE IF EXISTS test_api_structure.order_items CASCADE;
      DROP TABLE IF EXISTS test_api_structure.orders CASCADE;
      DROP TABLE IF EXISTS test_api_structure.users CASCADE;

      CREATE TABLE test_api_structure.users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name TEXT,
        age INTEGER DEFAULT 18,
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE test_api_structure.orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        total DECIMAL(10,2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'pending',
        CONSTRAINT fk_orders_user
          FOREIGN KEY (user_id)
          REFERENCES test_api_structure.users(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      );

      CREATE TABLE test_api_structure.order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER DEFAULT 1,
        CONSTRAINT fk_items_order
          FOREIGN KEY (order_id)
          REFERENCES test_api_structure.orders(id)
          ON UPDATE NO ACTION
          ON DELETE CASCADE
      );

      -- Add a custom index
      CREATE INDEX idx_users_email ON test_api_structure.users(email);
      CREATE INDEX idx_orders_status ON test_api_structure.orders(status);
      CREATE INDEX idx_orders_user_total ON test_api_structure.orders(user_id, total);

      -- Add comment on a column
      COMMENT ON COLUMN test_api_structure.users.email IS 'User email address';
    `)
  })

  afterAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS test_api_structure.order_items CASCADE;
      DROP TABLE IF EXISTS test_api_structure.orders CASCADE;
      DROP TABLE IF EXISTS test_api_structure.users CASCADE;
      DROP SCHEMA IF EXISTS test_api_structure;
    `)
    await pool.end()
  })

  await setupE2E()

  it('returns structure with columns, indexes, and foreign keys', async () => {
    const res = await fetch('/api/tables/test_api_structure/users')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.structure).toBeDefined()

    // Columns
    expect(body.structure.columns).toBeDefined()
    expect(Array.isArray(body.structure.columns)).toBe(true)

    const idCol = body.structure.columns.find((c: any) => c.name === 'id')
    expect(idCol).toBeDefined()
    expect(idCol.type).toBe('integer') // SERIAL maps to integer
    expect(idCol.nullable).toBe(false)
    expect(idCol.isPrimaryKey).toBe(true)
    expect(idCol.constraints).toContain('PRIMARY KEY')

    const emailCol = body.structure.columns.find((c: any) => c.name === 'email')
    expect(emailCol).toBeDefined()
    expect(emailCol.type).toContain('character varying')
    expect(emailCol.nullable).toBe(false)
    expect(emailCol.isPrimaryKey).toBe(false)
    expect(emailCol.constraints).toContain('UNIQUE')
    expect(emailCol.comment).toBe('User email address')

    const nameCol = body.structure.columns.find((c: any) => c.name === 'name')
    expect(nameCol).toBeDefined()
    expect(nameCol.nullable).toBe(true)

    const ageCol = body.structure.columns.find((c: any) => c.name === 'age')
    expect(ageCol).toBeDefined()
    expect(ageCol.defaultValue).toContain('18')

    // Indexes
    expect(body.structure.indexes).toBeDefined()
    expect(Array.isArray(body.structure.indexes)).toBe(true)

    const pkIndex = body.structure.indexes.find((i: any) => i.primary === true)
    expect(pkIndex).toBeDefined()
    expect(pkIndex.columns).toContain('id')

    const emailIndex = body.structure.indexes.find((i: any) => i.name === 'idx_users_email')
    expect(emailIndex).toBeDefined()
    expect(emailIndex.columns).toContain('email')
    expect(emailIndex.unique).toBe(false)

    // Foreign keys (users table has no outgoing FKs, so empty or check PK refs)
    expect(body.structure.foreignKeys).toBeDefined()
    expect(Array.isArray(body.structure.foreignKeys)).toBe(true)
  })

  it('returns correct foreign key info for table with FKs', async () => {
    const res = await fetch('/api/tables/test_api_structure/orders')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.structure.foreignKeys).toBeDefined()
    expect(body.structure.foreignKeys.length).toBeGreaterThan(0)

    const fk = body.structure.foreignKeys.find((f: any) => f.name === 'fk_orders_user')
    expect(fk).toBeDefined()
    expect(fk.column).toBe('user_id')
    expect(fk.referencedTable).toBe('users')
    expect(fk.referencedColumn).toBe('id')
    expect(fk.onUpdate).toBe('CASCADE')
    expect(fk.onDelete).toBe('RESTRICT')

    const userIdCol = body.structure.columns.find((c: any) => c.name === 'user_id')
    expect(userIdCol.isForeignKey).toBe(true)
    expect(userIdCol.foreignKey).toBeDefined()
    expect(userIdCol.foreignKey.referencedTable).toBe('users')
  })

  it('returns correct index info including composite and unique indexes', async () => {
    const res = await fetch('/api/tables/test_api_structure/orders')
    expect(res.status).toBe(200)

    const body = await res.json()

    const compositeIndex = body.structure.indexes.find((i: any) => i.name === 'idx_orders_user_total')
    expect(compositeIndex).toBeDefined()
    expect(compositeIndex.columns).toEqual(['user_id', 'total'])
    expect(compositeIndex.unique).toBe(false)

    const statusIndex = body.structure.indexes.find((i: any) => i.name === 'idx_orders_status')
    expect(statusIndex).toBeDefined()
    expect(statusIndex.columns).toContain('status')
  })

  it('returns structure for empty tables', async () => {
    const res = await fetch('/api/tables/test_api_structure/order_items')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.structure).toBeDefined()
    expect(body.structure.columns).toBeDefined()
    expect(body.structure.columns.length).toBeGreaterThan(0)

    const orderIdCol = body.structure.columns.find((c: any) => c.name === 'order_id')
    expect(orderIdCol.isForeignKey).toBe(true)
  })
})
