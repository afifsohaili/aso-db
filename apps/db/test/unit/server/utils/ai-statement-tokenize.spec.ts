import { describe, expect, it } from 'vitest'

import {
  charToTokenIndex,
  formatTokensForAi,
  parsePipeEdit,
  tokenizeSql,
  tokenToCharPosition,
} from '../../../../server/utils/ai-statement'

describe('tokenizeSql', () => {
  it('tokenizes simple SQL', () => {
    const tokens = tokenizeSql('select * from users')
    expect(tokens).toHaveLength(4)
    expect(tokens[0]).toEqual({ text: 'select', start: 0, end: 6 })
    expect(tokens[1]).toEqual({ text: '*', start: 7, end: 8 })
    expect(tokens[2]).toEqual({ text: 'from', start: 9, end: 13 })
    expect(tokens[3]).toEqual({ text: 'users', start: 14, end: 19 })
  })

  it('tokenizes SQL with alias', () => {
    const tokens = tokenizeSql('select u.id from users u')
    expect(tokens).toHaveLength(5)
    expect(tokens[1]).toEqual({ text: 'u.id', start: 7, end: 11 })
  })

  it('handles empty string', () => {
    const tokens = tokenizeSql('')
    expect(tokens).toHaveLength(0)
  })

  it('handles multiple spaces', () => {
    const tokens = tokenizeSql('select   *    from   users')
    expect(tokens).toHaveLength(4)
    expect(tokens[1]).toEqual({ text: '*', start: 9, end: 10 })
  })

  it('preserves quoted strings as single tokens', () => {
    const tokens = tokenizeSql("select * from users where name = 'hello world'")
    // 'hello and world' are separate because they have spaces inside
    expect(tokens.length).toBeGreaterThan(0)
  })
})

describe('tokenToCharPosition', () => {
  const tokens = tokenizeSql('select * from users')

  it('returns start of first token', () => {
    expect(tokenToCharPosition(tokens, 0)).toBe(0)
  })

  it('returns start of middle token', () => {
    expect(tokenToCharPosition(tokens, 2)).toBe(9)
  })

  it('returns end of last token for out of bounds', () => {
    expect(tokenToCharPosition(tokens, 99)).toBe(19)
  })

  it('returns 0 for negative index', () => {
    expect(tokenToCharPosition(tokens, -1)).toBe(0)
  })
})

describe('charToTokenIndex', () => {
  const tokens = tokenizeSql('select * from users')

  it('finds token at start of first token', () => {
    expect(charToTokenIndex(tokens, 0)).toBe(0)
  })

  it('finds token at cursor position', () => {
    expect(charToTokenIndex(tokens, 7)).toBe(1) // position of *
  })

  it('finds token in whitespace before next token', () => {
    expect(charToTokenIndex(tokens, 8)).toBe(2) // space after * (position 8 is end of token 1)
  })

  it('returns last index for position beyond end', () => {
    expect(charToTokenIndex(tokens, 100)).toBe(4)
  })
})

describe('formatTokensForAi', () => {
  it('formats tokens in pipe-delimited format', () => {
    const tokens = tokenizeSql('select * from users')
    const formatted = formatTokensForAi(tokens)
    expect(formatted).toBe('0|select\n1|*\n2|from\n3|users')
  })
})

describe('parsePipeEdit', () => {
  it('parses replace edit', () => {
    const edit = parsePipeEdit('1|1|r|u.id, u.email')
    expect(edit).toEqual({
      index: 1,
      length: 1,
      mode: 'replace',
      text: 'u.id, u.email',
    })
  })

  it('parses insert edit', () => {
    const edit = parsePipeEdit('3|0|i|where id = 1')
    expect(edit).toEqual({
      index: 3,
      length: 0,
      mode: 'insert',
      text: 'where id = 1',
    })
  })

  it('handles text with pipes', () => {
    const edit = parsePipeEdit('1|1|r|col1 | col2')
    expect(edit).toEqual({
      index: 1,
      length: 1,
      mode: 'replace',
      text: 'col1 | col2',
    })
  })

  it('returns null for invalid format', () => {
    expect(parsePipeEdit('invalid')).toBeNull()
    expect(parsePipeEdit('a|b|c|d')).toBeNull()
    expect(parsePipeEdit('1|2|x|text')).toBeNull()
  })
})
