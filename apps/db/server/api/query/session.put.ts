import type { QuerySession } from '../../../shared/types/query'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const sqlContent = String(body?.sqlContent ?? '')

  const db = useDatabase()
  await db.sql`
    INSERT INTO query_sessions (id, sql_content, updated_at)
    VALUES (1, ${sqlContent}, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      sql_content = excluded.sql_content,
      updated_at = excluded.updated_at
  `

  const result = await db.sql`
    SELECT id, sql_content AS sqlContent, updated_at AS updatedAt
    FROM query_sessions
    WHERE id = 1
  `

  const row = result.rows[0] as any
  const session: QuerySession = {
    id: row.id,
    sqlContent: row.sqlContent,
    updatedAt: row.updatedAt,
  }

  return { session }
})
