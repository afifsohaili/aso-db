import { Pool } from 'pg'
import type { TableInfo } from '../../../shared/types/table'

// Create a single Pool instance for the application
let pool: Pool | null = null

function isLocalhost(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local')
  }
  catch {
    return false
  }
}

export { isLocalhost }

export function getPool(): Pool {
  if (!pool) {
    const config = useRuntimeConfig()
    if (!config.databaseUrl) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Database URL not configured. Set NUXT_DATABASE_URL environment variable.',
      })
    }
    const useSsl = !isLocalhost(config.databaseUrl)
    pool = new Pool({
      connectionString: config.databaseUrl,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      ...(config.public.isReadOnly ? { options: '-c default_transaction_read_only=on' } : {}),
    })
  }
  return pool
}

export async function listTables(pool: Pool): Promise<TableInfo[]> {
  const result = await pool.query<TableInfo>(`
    SELECT
      table_schema AS schema,
      table_name AS name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('information_schema', 'pg_catalog')
      AND table_schema NOT LIKE 'pg_toast%'
      AND table_schema NOT LIKE 'pg_temp_%'
    ORDER BY table_schema, table_name
  `)

  return result.rows
}

interface SchemaTableInfo {
  schema: string
  name: string
  columns: string[]
}

export async function listSchema(pool: Pool): Promise<SchemaTableInfo[]> {
  // Single query to get all tables + columns for non-system schemas
  const result = await pool.query<{
    schema: string
    name: string
    column_name: string
  }>(`
    SELECT
      t.table_schema AS schema,
      t.table_name AS name,
      c.column_name
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c
      ON t.table_schema = c.table_schema
      AND t.table_name = c.table_name
    WHERE t.table_type IN ('BASE TABLE', 'VIEW')
      AND t.table_schema NOT IN ('information_schema', 'pg_catalog')
      AND t.table_schema NOT LIKE 'pg_toast%'
      AND t.table_schema NOT LIKE 'pg_temp_%'
    ORDER BY t.table_schema, t.table_name, c.ordinal_position
  `)

  // Group columns by table
  const tableMap = new Map<string, SchemaTableInfo>()

  for (const row of result.rows) {
    const key = `${row.schema}.${row.name}`
    if (!tableMap.has(key)) {
      tableMap.set(key, { schema: row.schema, name: row.name, columns: [] })
    }
    if (row.column_name) {
      tableMap.get(key)!.columns.push(row.column_name)
    }
  }

  return Array.from(tableMap.values())
}