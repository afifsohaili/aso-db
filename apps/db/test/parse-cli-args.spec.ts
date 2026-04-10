import { describe, expect, it } from 'vitest'

import { parseCliArgs } from '../src/cli/parse-cli-args'

describe('parseCliArgs', () => {
  it('parses a PostgreSQL connection string', () => {
    expect(parseCliArgs(['postgresql://user:pass@localhost:5432/app'])).toEqual({
      connectionString: 'postgresql://user:pass@localhost:5432/app',
      openBrowser: true,
      port: undefined,
    })
  })

  it('supports --port and --no-open', () => {
    expect(parseCliArgs(['postgres://user:pass@localhost:5432/app', '--port', '4545', '--no-open'])).toEqual({
      connectionString: 'postgres://user:pass@localhost:5432/app',
      openBrowser: false,
      port: 4545,
    })
  })

  it('rejects missing connection strings', () => {
    expect(() => parseCliArgs([])).toThrowError('A PostgreSQL connection string is required for the first iteration')
  })
})
