import { Pool } from 'pg'
import type { FetchTableRecordsOptions, FetchTableRecordsResult } from '../../../shared/types/table'

export async function fetchTableRecords(
  pool: Pool,
  options: FetchTableRecordsOptions,
): Promise<FetchTableRecordsResult> {
  const { schema, tableName, page, limit } = options
  const offset = (page - 1) * limit

  // Get total count
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`,
  )
  const totalCount = Number.parseInt(countResult.rows[0].count, 10)

  // Get records with pagination
  const recordsResult = await pool.query<Record<string, unknown>>(
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
    const columnsResult = await pool.query<{ column_name: string }>(`
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