import { Client } from 'pg'

import type { TableInfo } from '../server/table-info'

export async function listTables(connectionString: string): Promise<TableInfo[]> {
  const client = new Client({ connectionString })

  await client.connect()

  try {
    const result = await client.query<TableInfo>(`
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
  finally {
    await client.end()
  }
}
