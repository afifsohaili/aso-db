import { getDatabaseUrlHash } from '../../utils/query-db'

export default defineEventHandler(async () => {
  const db = useDatabase()
  const databaseUrlHash = getDatabaseUrlHash()
  const result = await db.sql`
    SELECT id, sql_content as sqlContent, updated_at as updatedAt
    FROM query_sessions
    WHERE database_url = ${databaseUrlHash}
  `
  const session = result.rows[0] || { id: 1, sqlContent: '', updatedAt: new Date().toISOString() }
  return { session }
})
