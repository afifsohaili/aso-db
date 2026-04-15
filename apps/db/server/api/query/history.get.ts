import type { QueryHistoryEntry } from '../../../shared/types/query'
import { getDatabaseUrlHash } from '../../utils/query-db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawLimit = Number(query.limit)
  const limit = Number.isNaN(rawLimit) || rawLimit <= 0 ? 50 : Math.min(rawLimit, 200)

  const db = useDatabase()
  const databaseUrlHash = getDatabaseUrlHash()
  const result = await db.sql`
    SELECT
      id,
      sql_content AS sqlContent,
      executed_at AS executedAt,
      duration_ms AS durationMs,
      row_count AS rowCount,
      error_message AS errorMessage,
      saved_query_id AS savedQueryId
    FROM query_history
    WHERE database_url = ${databaseUrlHash}
       OR database_url IS NULL
       OR database_url = ''
    ORDER BY executed_at DESC
    LIMIT ${limit}
  `

  const history: QueryHistoryEntry[] = result.rows.map((row: any) => ({
    id: row.id,
    sqlContent: row.sqlContent,
    executedAt: row.executedAt,
    durationMs: row.durationMs,
    rowCount: row.rowCount,
    errorMessage: row.errorMessage,
    savedQueryId: row.savedQueryId,
  }))

  return { history }
})
