import type { ExecuteQueryRequest, ExecuteQueryResponse, QueryResult } from '../../../shared/types/query'
import pkg from 'node-sql-parser'
const { Parser } = pkg
import { getPool } from '../../utils/db'

function splitStatements(sql: string): string[] {
  const parser = new Parser()
  try {
    const ast = parser.astify(sql, { database: 'Postgresql' })
    const statements = Array.isArray(ast) ? ast : [ast]
    return statements.map(stmt => parser.sqlify(stmt, { database: 'Postgresql' }))
  }
  catch {
    return [sql]
  }
}

export default defineEventHandler(async (event): Promise<ExecuteQueryResponse> => {
  const body = await readBody<ExecuteQueryRequest>(event)
  if (!body?.sql || !body.sql.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing sql' })
  }

  const sqlToRun = body.selectedSql?.trim() ? body.selectedSql.trim() : body.sql.trim()
  const statements = splitStatements(sqlToRun)

  const pool = getPool()
  const db = useDatabase()
  const client = await pool.connect()

  const results: QueryResult[] = []

  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (!stmt.trim())
        continue

      const start = performance.now()
      let success = false
      let columns: string[] = []
      let rows: Record<string, unknown>[] = []
      let rowCount = 0
      let errorMessage: string | undefined

      try {
        const result = await client.query(stmt)
        success = true
        columns = result.fields?.map(f => f.name) ?? []
        rows = result.rows ?? []
        rowCount = result.rowCount ?? rows.length
      }
      catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err)
      }

      const durationMs = Math.round(performance.now() - start)

      await db.sql`
        INSERT INTO query_history (sql_content, duration_ms, row_count, error_message)
        VALUES (${stmt}, ${durationMs}, ${rowCount}, ${errorMessage ?? null})
      `

      results.push({
        index: i,
        sql: stmt,
        success,
        columns,
        rows,
        rowCount,
        durationMs,
        errorMessage,
      })
    }
  }
  finally {
    client.release()
  }

  return { results }
})
