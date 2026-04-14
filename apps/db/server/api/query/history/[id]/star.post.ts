import type { SavedQuery } from '../../../../shared/types/query'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid history id' })
  }

  const db = useDatabase()

  const historyResult = await db.sql`
    SELECT sql_content FROM query_history WHERE id = ${id}
  `
  if (historyResult.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'History entry not found' })
  }

  const sqlContent = (historyResult.rows[0] as any).sql_content as string
  const title = sqlContent.length > 60 ? `${sqlContent.slice(0, 60)}...` : sqlContent

  const insertResult = await db.sql`
    INSERT INTO saved_queries (title, sql_content)
    VALUES (${title}, ${sqlContent})
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
