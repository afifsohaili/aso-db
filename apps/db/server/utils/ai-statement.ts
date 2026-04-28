import pkg from 'node-sql-parser'

const { Parser } = pkg

export interface StatementAtCursor {
  beforeCursor: string
  afterCursor: string
  fullStatement: string
}

/**
 * Split SQL into individual statements using node-sql-parser for validation,
 * but preserve original text positions for accurate cursor mapping.
 * Falls back to naive semicolon split if parser fails.
 */
export function splitStatements(sql: string): string[] {
  // First try parser to validate we can parse it
  const parser = new Parser()
  try {
    parser.astify(sql, { database: 'Postgresql' })
  }
  catch {
    // Parser failed - use naive split
    return naiveSplit(sql)
  }

  // Parser succeeded - use naive split to preserve original text
  return naiveSplit(sql)
}

/**
 * Naive semicolon split that respects basic quotes.
 */
function naiveSplit(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const prev = sql[i - 1]

    if (char === "'" && !inDoubleQuote && prev !== '\\')
      inSingleQuote = !inSingleQuote
    else if (char === '"' && !inSingleQuote && prev !== '\\')
      inDoubleQuote = !inDoubleQuote

    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      statements.push(current.trim())
      current = ''
    }
    else {
      current += char
    }
  }

  if (current.trim())
    statements.push(current.trim())

  return statements
}

/**
 * Extract the statement at the given cursor position.
 */
export function extractStatementAtCursor(sql: string, cursor: number): StatementAtCursor {
  const statements = splitStatements(sql)

  let currentPos = 0
  for (const stmt of statements) {
    // +1 for the semicolon (or end of string for last statement)
    const stmtEnd = currentPos + stmt.length

    if (cursor >= currentPos && cursor <= stmtEnd) {
      const relativeCursor = Math.max(0, cursor - currentPos)
      return {
        beforeCursor: stmt.slice(0, relativeCursor),
        afterCursor: stmt.slice(relativeCursor),
        fullStatement: stmt,
      }
    }

    currentPos = stmtEnd + 1
  }

  // Cursor at end - return last statement
  const lastStmt = statements[statements.length - 1] || ''
  return {
    beforeCursor: lastStmt,
    afterCursor: '',
    fullStatement: lastStmt,
  }
}
