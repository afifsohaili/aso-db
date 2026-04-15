import type { ExecuteQueryRequest, ExecuteQueryResponse, QueryResult } from '../../../shared/types/query'
import pkg from 'node-sql-parser'
const { Parser } = pkg
import { getPool } from '../../utils/db'

const BLOCKED_KEYWORDS = new Set([
  'INSERT',
  'UPDATE',
  'DELETE',
  'TRUNCATE',
  'MERGE',
  'CREATE',
  'ALTER',
  'DROP',
  'GRANT',
  'REVOKE',
  'COPY',
  'CALL',
])

const READONLY_ERROR_MESSAGE = 'Write queries are disabled in read-only mode. Run the CLI with --allow-write to enable them.'

function stripCommentsAndNormalize(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isBlockedInReadOnly(sql: string): boolean {
  const normalized = stripCommentsAndNormalize(sql)
  if (/^EXPLAIN\s+ANALYZE\b/i.test(normalized))
    return true
  const firstWord = normalized.split(' ')[0]?.toUpperCase()
  return firstWord ? BLOCKED_KEYWORDS.has(firstWord) : false
}

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

  const config = useRuntimeConfig()
  const isReadOnly = config.public.isReadOnly !== false

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

      if (isReadOnly && isBlockedInReadOnly(stmt)) {
        errorMessage = READONLY_ERROR_MESSAGE
      }
      else {
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
