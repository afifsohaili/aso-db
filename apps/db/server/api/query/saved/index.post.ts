import type { SavedQuery } from '../../../../shared/types/query'
import { getDatabaseUrlHash } from '../../../utils/query-db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const title = String(body?.title ?? '').trim()
  const sqlContent = String(body?.sqlContent ?? '').trim()

  if (!title || !sqlContent) {
    throw createError({ statusCode: 400, statusMessage: 'Missing title or sqlContent' })
  }

  const db = useDatabase()
  const databaseUrlHash = getDatabaseUrlHash()
  const result = await db.sql`
    INSERT INTO saved_queries (title, sql_content, database_url)
    VALUES (${title}, ${sqlContent}, ${databaseUrlHash})
    RETURNING id, title, sql_content AS sqlContent, created_at AS createdAt, updated_at AS updatedAt
  `

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
