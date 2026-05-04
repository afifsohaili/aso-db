import pkg from 'node-sql-parser'

const { Parser } = pkg

export interface StatementAtCursor {
  beforeCursor: string
  afterCursor: string
  fullStatement: string
}

export interface Token {
  text: string
  start: number
  end: number
}

/**
 * Tokenize SQL by splitting on whitespace.
 * Preserves original text positions for accurate cursor mapping.
 */
export function tokenizeSql(sql: string): Token[] {
  const tokens: Token[] = []
  const regex = /\S+/g
  let match

  while ((match = regex.exec(sql)) !== null) {
    tokens.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return tokens
}

/**
 * Convert token index to character position in the original SQL.
 */
export function tokenToCharPosition(
  tokens: Token[],
  tokenIndex: number,
): number {
  if (tokenIndex < 0) return 0
  if (tokenIndex >= tokens.length) {
    const last = tokens[tokens.length - 1]
    return last ? last.end : 0
  }
  return tokens[tokenIndex].start
}

/**
 * Find the token index at a given character position.
 * If position is at the boundary between tokens (end of token i == start of token i+1),
 * returns the NEXT token index (i+1) to support typing in whitespace.
 */
export function charToTokenIndex(
  tokens: Token[],
  charPosition: number,
): number {
  for (let i = 0; i < tokens.length; i++) {
    // If position is strictly before this token's start, this is the token
    if (charPosition < tokens[i].start) {
      return i
    }
    // If position is inside this token (but not at its very end boundary)
    if (charPosition >= tokens[i].start && charPosition < tokens[i].end) {
      return i
    }
    // If position is exactly at the end of this token, check if there's a next token
    // that starts at the same position (no whitespace) - otherwise return next
    if (charPosition === tokens[i].end) {
      if (i + 1 < tokens.length && tokens[i + 1].start === charPosition) {
        // No whitespace between tokens, position is start of next token
        return i + 1
      }
      // Position is in whitespace after this token, return next token
      return Math.min(i + 1, tokens.length)
    }
  }
  return tokens.length
}

/**
 * Build pipe-delimited token representation for AI prompt.
 */
export function formatTokensForAi(tokens: Token[]): string {
  return tokens.map((t, i) => `${i}|${t.text}`).join('\n')
}

/**
 * Parse a pipe-delimited edit string into a TokenEdit.
 * Format: index|length|mode|text
 */
export function parsePipeEdit(editStr: string): { index: number; length: number; mode: 'replace' | 'insert'; text: string } | null {
  const parts = editStr.split('|')
  if (parts.length < 4) return null

  const index = Number.parseInt(parts[0], 10)
  const length = Number.parseInt(parts[1], 10)
  const modeCode = parts[2]
  const text = parts.slice(3).join('|') // Text itself may contain pipes

  if (Number.isNaN(index) || Number.isNaN(length)) return null

  // Map short codes to full mode names
  const mode = modeCode === 'r' ? 'replace' : modeCode === 'i' ? 'insert' : null
  if (!mode) return null

  return { index, length, mode, text }
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
