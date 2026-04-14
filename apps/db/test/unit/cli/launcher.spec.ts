import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const { Pool } = pg

describe('CLI Launcher', () => {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/asodb_test',
  })

  beforeAll(async () => {
    // Create test table
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS cli_test;
      CREATE TABLE IF NOT EXISTS cli_test.test_table (id SERIAL PRIMARY KEY);
    `)
  })

  afterAll(async () => {
    await pool.query(`
      DROP TABLE IF EXISTS cli_test.test_table;
      DROP SCHEMA IF EXISTS cli_test;
    `)
    await pool.end()
  })

  it('exits with code 1 on missing connection string', async () => {
    const cliPath = join(__dirname, '../../../bin/asodb.ts')
    const child = spawn('npx', ['tsx', cliPath], {
      stdio: 'pipe',
    })

    const exitCode = await new Promise<number>((resolve) => {
      child.on('exit', (code) => resolve(code ?? 1))
    })

    expect(exitCode).toBe(1)
  })

  it('exits with code 1 on invalid connection string', async () => {
    const cliPath = join(__dirname, '../../../bin/asodb.ts')
    const child = spawn('npx', ['tsx', cliPath, 'invalid'], {
      stdio: 'pipe',
    })

    const exitCode = await new Promise<number>((resolve) => {
      child.on('exit', (code) => resolve(code ?? 1))
    })

    expect(exitCode).toBe(1)
  })
})