import { getPool, listTables } from '../utils/db'
import { getDatabaseUrlHash, getSchemaCache } from '../utils/query-db'

export default defineEventHandler(async () => {
  try {
    // Try schema cache first
    const hash = getDatabaseUrlHash()
    const cached = await getSchemaCache(hash)

    if (cached) {
      return {
        tables: cached.map(t => ({
          schema: t.schema,
          name: t.name,
        })),
      }
    }

    // Fallback: query database directly
    const poolInstance = getPool()
    const tables = await listTables(poolInstance)
    return { tables }
  }
  catch (err: any) {
    console.error('Error fetching tables:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to fetch tables',
    })
  }
})