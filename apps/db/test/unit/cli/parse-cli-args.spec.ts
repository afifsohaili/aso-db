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

  it('parses -w shorthand flag', () => {
    const result = parseCliArgs(['-w', 'postgresql://user:pass@localhost:5432/db'])
    expect(result.connectionString).toBe('postgresql://user:pass@localhost:5432/db')
    expect(result.allowWrite).toBe(true)
  })

  it('parses --port flag', () => {
    const result = parseCliArgs(['--port', '3333', 'postgresql://user:pass@localhost:5432/db'])
    expect(result.connectionString).toBe('postgresql://user:pass@localhost:5432/db')
    expect(result.port).toBe(3333)
    expect(result.openBrowser).toBe(true)
  })

  it('parses --ai-enabled flag', () => {
    const result = parseCliArgs(['--ai-enabled', 'postgresql://user:pass@localhost:5432/db'])
    expect(result.connectionString).toBe('postgresql://user:pass@localhost:5432/db')
    expect(result.aiEnabled).toBe(true)
  })

  it('parses --ai-provider flag', () => {
    const result = parseCliArgs(['--ai-provider', 'anthropic', 'postgresql://user:pass@localhost:5432/db'])
    expect(result.aiProvider).toBe('anthropic')
  })

  it('parses --ai-model flag', () => {
    const result = parseCliArgs(['--ai-model', 'claude-sonnet-4', 'postgresql://user:pass@localhost:5432/db'])
    expect(result.aiModel).toBe('claude-sonnet-4')
  })

  it('parses --ai-api-key flag', () => {
    const result = parseCliArgs(['--ai-api-key', 'sk-test', 'postgresql://user:pass@localhost:5432/db'])
    expect(result.aiApiKey).toBe('sk-test')
  })

  it('parses --ai-max-tokens flag', () => {
    const result = parseCliArgs(['--ai-max-tokens', '2000', 'postgresql://user:pass@localhost:5432/db'])
    expect(result.aiMaxTokens).toBe(2000)
  })

  it('parses all AI flags together', () => {
    const result = parseCliArgs([
      '--ai-enabled',
      '--ai-provider', 'openai',
      '--ai-model', 'gpt-4o',
      '--ai-api-key', 'sk-abc',
      '--ai-max-tokens', '1500',
      'postgresql://user:pass@localhost:5432/db'
    ])
    expect(result.aiEnabled).toBe(true)
    expect(result.aiProvider).toBe('openai')
    expect(result.aiModel).toBe('gpt-4o')
    expect(result.aiApiKey).toBe('sk-abc')
    expect(result.aiMaxTokens).toBe(1500)
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

  it('throws on missing --ai-provider value', () => {
    expect(() => parseCliArgs(['--ai-provider'])).toThrow('Missing value for --ai-provider')
  })

  it('throws on missing --ai-model value', () => {
    expect(() => parseCliArgs(['--ai-model'])).toThrow('Missing value for --ai-model')
  })

  it('throws on missing --ai-api-key value', () => {
    expect(() => parseCliArgs(['--ai-api-key'])).toThrow('Missing value for --ai-api-key')
  })

  it('throws on missing --ai-max-tokens value', () => {
    expect(() => parseCliArgs(['--ai-max-tokens'])).toThrow('Missing value for --ai-max-tokens')
  })

  it('throws on invalid --ai-max-tokens value', () => {
    expect(() => parseCliArgs(['--ai-max-tokens', 'abc', 'postgresql://user:pass@localhost:5432/db'])).toThrow('Invalid --ai-max-tokens')
  })
})
