export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid saved query id' })
  }

  const db = useDatabase()
  const check = await db.sql`SELECT 1 FROM saved_queries WHERE id = ${id}`
  if (check.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Saved query not found' })
  }

  await db.sql`DELETE FROM saved_queries WHERE id = ${id}`
  setResponseStatus(event, 204)
})
