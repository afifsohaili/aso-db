import { Pool } from 'pg'
import type { FetchTableRecordsOptions, FetchTableRecordsResult } from '../../../../shared/types/table'

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

async function fetchTableRecords(
  poolInstance: Pool,
  options: FetchTableRecordsOptions,
): Promise<FetchTableRecordsResult> {
  const { schema, tableName, page, limit } = options
  const offset = (page - 1) * limit

  // Get total count
  const countResult = await poolInstance.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`,
  )
  const totalCount = Number.parseInt(countResult.rows[0].count, 10)

  // Get records with pagination
  const recordsResult = await poolInstance.query<Record<string, unknown>>(
    `SELECT * FROM "${schema}"."${tableName}" LIMIT $1 OFFSET $2`,
    [limit, offset],
  )

  // Get column names from first row or from information_schema
  let columns: string[] = []
  if (recordsResult.rows.length > 0) {
    columns = Object.keys(recordsResult.rows[0])
  }
  else {
    // If no rows, get columns from information_schema
    const columnsResult = await poolInstance.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [schema, tableName])
    columns = columnsResult.rows.map(r => r.column_name)
  }

  return {
    records: recordsResult.rows,
    totalCount,
    columns,
  }
}

// Validate identifier to prevent SQL injection
function isValidIdentifier(name: string): boolean {
  // PostgreSQL identifiers can contain letters, digits, underscores, and dollar signs
  // Must start with a letter or underscore
  return /^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(name)
}

export default defineEventHandler(async (event) => {
  const { schema, name } = getRouterParams(event)
  const { page = '1', limit = '50' } = getQuery(event)

  // Validate identifiers
  if (!isValidIdentifier(schema) || !isValidIdentifier(name)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid schema or table name',
    })
  }

  const pageNum = Math.max(1, Number.parseInt(page as string, 10))
  const limitNum = Math.min(200, Math.max(1, Number.parseInt(limit as string, 10)))

  try {
    const poolInstance = getPool()

    // First verify the table exists
    const tableCheck = await poolInstance.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
    `, [schema, name])

    if (tableCheck.rows.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `Table "${schema}.${name}" not found`,
      })
    }

    const result = await fetchTableRecords(poolInstance, {
      schema,
      tableName: name,
      page: pageNum,
      limit: limitNum,
    })

    return result
  }
  catch (err: any) {
    console.error('Error fetching table records:', err)
    if (err.statusCode)
      throw err

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch table records',
    })
  }
})