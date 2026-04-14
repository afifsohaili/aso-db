import type { SavedQuery } from '../../../../shared/types/query'

export default defineEventHandler(async () => {
  const db = useDatabase()
  const result = await db.sql`
    SELECT
      id,
      title,
      sql_content AS sqlContent,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM saved_queries
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
