import { Pool } from 'pg'
import type { TableInfo } from '../../../shared/types/table'

// Create a single Pool instance for the application
let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const config = useRuntimeConfig()
    if (!config.databaseUrl) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Database URL not configured. Set NUXT_DATABASE_URL environment variable.',
      })
    }
    pool = new Pool({ connectionString: config.databaseUrl })
  }
  return pool
}

async function listTables(pool: Pool): Promise<TableInfo[]> {
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

export default defineEventHandler(async () => {
  try {
    const poolInstance = getPool()
    const tables = await listTables(poolInstance)
    return { tables }
  }
  catch (err: any) {
    console.error('Error fetching tables:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to fetch tables',
    })
  }
})