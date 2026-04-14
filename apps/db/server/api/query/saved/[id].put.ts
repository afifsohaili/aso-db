import type { SavedQuery } from '../../../../shared/types/query'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid saved query id' })
  }

  const body = await readBody(event)
  const title = String(body?.title ?? '').trim()
  const sqlContent = String(body?.sqlContent ?? '').trim()

  if (!title || !sqlContent) {
    throw createError({ statusCode: 400, statusMessage: 'Missing title or sqlContent' })
  }

  const db = useDatabase()
  const result = await db.sql`
    UPDATE saved_queries
    SET title = ${title}, sql_content = ${sqlContent}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING id, title, sql_content AS sqlContent, created_at AS createdAt, updated_at AS updatedAt
  `

  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Saved query not found' })
  }

  const row = result.rows[0] as any
  const savedQuery: SavedQuery = {
    id: row.id,
    title: row.title,
    sqlContent: row.sqlContent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }

  return savedQuery
})
