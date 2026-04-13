import { Client } from 'pg'

export interface TableRecord {
  [key: string]: unknown
}

export interface FetchTableRecordsResult {
  records: TableRecord[]
  totalCount: number
  columns: string[]
}

export interface FetchTableRecordsOptions {
  connectionString: string
  schema: string
  tableName: string
  page: number
  limit: number
}

export async function fetchTableRecords(
  options: FetchTableRecordsOptions,
): Promise<FetchTableRecordsResult> {
  const { connectionString, schema, tableName, page, limit } = options
  const offset = (page - 1) * limit

  const client = new Client({ connectionString })
  await client.connect()

  try {
    // Get total count
    const countResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`,
    )
    const totalCount = Number.parseInt(countResult.rows[0].count, 10)

    // Get records with pagination
    const recordsResult = await client.query<TableRecord>(
      `SELECT * FROM "${schema}"."${tableName}" LIMIT $1 OFFSET $2`,
      [limit, offset],
    )

    // Get column names from first row or from pg_attribute
    let columns: string[] = []
    if (recordsResult.rows.length > 0) {
      columns = Object.keys(recordsResult.rows[0])
    }
    else {
      // If no rows, get columns from information_schema
      const columnsResult = await client.query<{ column_name: string }>(`
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
  finally {
    await client.end()
  }
}
