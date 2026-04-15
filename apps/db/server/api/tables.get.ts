import { getPool, listTables } from '../utils/db'

export default defineEventHandler(async () => {
  try {
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