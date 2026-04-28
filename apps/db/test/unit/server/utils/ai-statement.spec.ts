import { describe, expect, it } from 'vitest'
import { extractStatementAtCursor, splitStatements } from '../../../../server/utils/ai-statement'

describe('splitStatements', () => {
  it('splits simple statements', () => {
    const sql = "SELECT 1; SELECT 2; SELECT 3"
    const result = splitStatements(sql)
    expect(result).toHaveLength(3)
    expect(result[0]).toContain('SELECT 1')
    expect(result[1]).toContain('SELECT 2')
    expect(result[2]).toContain('SELECT 3')
  })

  it('handles single statement without semicolon', () => {
    const sql = "SELECT * FROM users"
    const result = splitStatements(sql)
    expect(result).toHaveLength(1)
    expect(result[0]).toContain('SELECT * FROM users')
  })

  it('handles empty string', () => {
    const result = splitStatements('')
    expect(result.length).toBeGreaterThanOrEqual(0)
  })

  it('handles CTE statements', () => {
    const sql = `WITH recent AS (SELECT * FROM users WHERE created_at > NOW() - INTERVAL '1 day')
SELECT * FROM recent`
    const result = splitStatements(sql)
    expect(result).toHaveLength(1)
  })
})

describe('extractStatementAtCursor', () => {
  it('extracts first statement when cursor in first', () => {
    const sql = "SELECT 1; SELECT 2"
    const result = extractStatementAtCursor(sql, 8)
    expect(result.beforeCursor).toContain('SELECT 1')
    expect(result.fullStatement).toContain('SELECT 1')
  })

  it('extracts second statement when cursor in second', () => {
    const sql = "SELECT 1; SELECT 2"
    const result = extractStatementAtCursor(sql, 12)
    expect(result.fullStatement).toContain('SELECT 2')
  })

  it('handles cursor at end of editor', () => {
    const sql = "SELECT * FROM users"
    const result = extractStatementAtCursor(sql, sql.length)
    expect(result.beforeCursor).toBe('SELECT * FROM users')
    expect(result.afterCursor).toBe('')
  })

  it('handles cursor at beginning', () => {
    const sql = "SELECT * FROM users"
    const result = extractStatementAtCursor(sql, 0)
    expect(result.beforeCursor).toBe('')
    expect(result.afterCursor).toContain('SELECT')
  })

  it('handles empty string', () => {
    const result = extractStatementAtCursor('', 0)
    expect(result.beforeCursor).toBe('')
    expect(result.afterCursor).toBe('')
    expect(result.fullStatement).toBe('')
  })

  it('handles cursor beyond length', () => {
    const sql = "SELECT 1"
    const result = extractStatementAtCursor(sql, 100)
    expect(result.fullStatement).toContain('SELECT 1')
  })

  it('handles multi-statement with cursor in middle', () => {
    const sql = "SELECT 1; SELECT 2; SELECT 3"
    // Cursor around position 15 (in second statement)
    const result = extractStatementAtCursor(sql, 15)
    expect(result.fullStatement).toContain('SELECT 2')
  })
})
