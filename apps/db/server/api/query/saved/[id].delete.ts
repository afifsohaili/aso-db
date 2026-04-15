import { getDatabaseUrlHash } from '../../../utils/query-db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid saved query id' })
  }

  const db = useDatabase()
  const databaseUrlHash = getDatabaseUrlHash()
  const check = await db.sql`
    SELECT 1 FROM saved_queries
    WHERE id = ${id}
      AND (database_url = ${databaseUrlHash} OR database_url IS NULL OR database_url = '')
  `
  if (check.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Saved query not found' })
  }

  await db.sql`
    DELETE FROM saved_queries
    WHERE id = ${id}
      AND (database_url = ${databaseUrlHash} OR database_url IS NULL OR database_url = '')
  `
  setResponseStatus(event, 204)
})
