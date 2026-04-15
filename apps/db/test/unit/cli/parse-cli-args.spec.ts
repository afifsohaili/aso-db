import { describe, expect, it } from 'vitest'

import { parseCliArgs } from '../../../src/cli/parse-cli-args'

describe('parseCliArgs', () => {
  it('parses connection string', () => {
    const result = parseCliArgs(['postgresql://user:pass@localhost:5432/db'])
    expect(result.connectionString).toBe('postgresql://user:pass@localhost:5432/db')
    expect(result.openBrowser).toBe(true)
  })

  it('parses postgres:// prefix', () => {
    const result = parseCliArgs(['postgres://user:pass@localhost:5432/db'])
    expect(result.connectionString).toBe('postgres://user:pass@localhost:5432/db')
  })

  it('parses --no-open flag', () => {
    const result = parseCliArgs(['--no-open', 'postgresql://user:pass@localhost:5432/db'])
    expect(result.connectionString).toBe('postgresql://user:pass@localhost:5432/db')
    expect(result.openBrowser).toBe(false)
  })

  it('defaults allowWrite to false', () => {
    const result = parseCliArgs(['postgresql://user:pass@localhost:5432/db'])
    expect(result.allowWrite).toBe(false)
  })

  it('parses --allow-write flag', () => {
    const result = parseCliArgs(['--allow-write', 'postgresql://user:pass@localhost:5432/db'])
    expect(result.connectionString).toBe('postgresql://user:pass@localhost:5432/db')
    expect(result.allowWrite).toBe(true)
  })

  it('parses --port flag', () => {
    const result = parseCliArgs(['--port', '3333', 'postgresql://user:pass@localhost:5432/db'])
    expect(result.connectionString).toBe('postgresql://user:pass@localhost:5432/db')
    expect(result.port).toBe(3333)
    expect(result.openBrowser).toBe(true)
  })

  it('throws on missing connection string', () => {
    expect(() => parseCliArgs([])).toThrow('A PostgreSQL connection string is required')
  })

  it('throws on invalid connection string', () => {
    expect(() => parseCliArgs(['invalid'])).toThrow('must be a full PostgreSQL connection string')
  })

  it('throws on missing --port value', () => {
    expect(() => parseCliArgs(['--port'])).toThrow('Missing value for --port')
  })

  it('throws on invalid --port value', () => {
    expect(() => parseCliArgs(['--port', 'abc', 'postgresql://user:pass@localhost:5432/db'])).toThrow('Invalid port')
  })

  it('throws on negative port', () => {
    expect(() => parseCliArgs(['--port', '-1', 'postgresql://user:pass@localhost:5432/db'])).toThrow('Invalid port')
  })

  it('throws on unknown option', () => {
    expect(() => parseCliArgs(['--unknown', 'postgresql://user:pass@localhost:5432/db'])).toThrow('Unknown option')
  })

  it('throws on multiple connection strings', () => {
    expect(() => parseCliArgs([
      'postgresql://user:pass@localhost:5432/db1',
      'postgresql://user:pass@localhost:5432/db2'
    ])).toThrow('Only one PostgreSQL connection string is supported')
  })
})