import type { SavedQuery } from '../../../../shared/types/query'
import { getDatabaseUrlHash } from '../../../../utils/query-db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid history id' })
  }

  const db = useDatabase()
  const databaseUrlHash = getDatabaseUrlHash()

  const historyResult = await db.sql`
    SELECT sql_content, database_url FROM query_history
    WHERE id = ${id}
      AND (database_url = ${databaseUrlHash} OR database_url IS NULL OR database_url = '')
  `
  if (historyResult.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'History entry not found' })
  }

  const sqlContent = (historyResult.rows[0] as any).sql_content as string
  const historyDbUrl = (historyResult.rows[0] as any).database_url as string | null
  const title = sqlContent.length > 60 ? `${sqlContent.slice(0, 60)}...` : sqlContent

  const savedQueryDbUrl = historyDbUrl || databaseUrlHash

  const insertResult = await db.sql`
    INSERT INTO saved_queries (title, sql_content, database_url)
    VALUES (${title}, ${sqlContent}, ${savedQueryDbUrl})
    RETURNING id, title, sql_content AS sqlContent, created_at AS createdAt, updated_at AS updatedAt
  `

  const saved = insertResult.rows[0] as any
  const savedQuery: SavedQuery = {
    id: saved.id,
    title: saved.title,
    sqlContent: saved.sqlContent,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
  }

  await db.sql`
    UPDATE query_history
    SET saved_query_id = ${savedQuery.id}
    WHERE id = ${id}
  `

  return { savedQuery }
})
