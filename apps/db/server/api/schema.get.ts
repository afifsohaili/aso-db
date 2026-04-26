import { getPool, isLocalhost, listSchema } from '../utils/db'
import { getDatabaseUrlHash, getSchemaCache, setSchemaCache } from '../utils/query-db'

export default defineEventHandler(async (event) => {
  try {
    const hash = getDatabaseUrlHash()
    const config = useRuntimeConfig()

    // Check cache first
    const cached = await getSchemaCache(hash)
    const isLocal = isLocalhost(config.databaseUrl || '')
    const cacheTtlMs = isLocal ? 5 * 60 * 1000 : 4 * 60 * 60 * 1000 // 5 min local, 4 hours prod

    if (cached) {
      // We still need to fetch to get updated_at for TTL check
      const db = useDatabase()
      const result = await db.sql`
        SELECT updated_at FROM schema_metadata
        WHERE database_url_hash = ${hash}
      `
      const rows = result.rows ?? []
      if (rows.length > 0) {
        const updatedAt = new Date((rows[0] as any).updated_at).getTime()
        const now = Date.now()
        if (now - updatedAt < cacheTtlMs) {
          // Cache is fresh, return it
          return { tables: cached }
        }
      }
    }

    // Cache is stale or missing — fetch from PostgreSQL
    const pool = getPool()
    const tables = await listSchema(pool)

    // Populate cache
    await setSchemaCache(hash, tables)

    return { tables }
  }
  catch (err) {
    console.error('Failed to fetch schema:', err)

    // Try to return stale cache as fallback
    try {
      const hash = getDatabaseUrlHash()
      const stale = await getSchemaCache(hash)
      if (stale) {
        return { tables: stale }
      }
    }
    catch {
      // Ignore fallback errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch schema',
    })
  }
})
