import type { SavedQuery } from '../../../../shared/types/query'
import { getDatabaseUrlHash } from '../../../utils/query-db'

export default defineEventHandler(async () => {
  const db = useDatabase()
  const databaseUrlHash = getDatabaseUrlHash()
  const result = await db.sql`
    SELECT
      id,
      title,
      sql_content AS sqlContent,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM saved_queries
    WHERE database_url = ${databaseUrlHash}
       OR database_url IS NULL
       OR database_url = ''
    ORDER BY updated_at DESC
  `

  const savedQueries: SavedQuery[] = result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    sqlContent: row.sqlContent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))

  return { savedQueries }
})
