export interface ParsedCliArgs {
  connectionString: string
  openBrowser: boolean
  allowWrite: boolean
  port?: number
  aiEnabled?: boolean
  aiProvider?: string
  aiModel?: string
  aiApiKey?: string
  aiMaxTokens?: number
}

function isPostgresConnectionString(value: string) {
  return value.startsWith('postgres://') || value.startsWith('postgresql://')
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  let connectionString: string | undefined
  let openBrowser = true
  let allowWrite = false
  let port: number | undefined
  let aiEnabled: boolean | undefined
  let aiProvider: string | undefined
  let aiModel: string | undefined
  let aiApiKey: string | undefined
  let aiMaxTokens: number | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]

    if (current === '--no-open') {
      openBrowser = false
      continue
    }

    if (current === '--allow-write' || current === '-w') {
      allowWrite = true
      continue
    }

    if (current === '--port') {
      const next = argv[index + 1]

      if (!next)
        throw new Error('Missing value for --port')

      const parsedPort = Number.parseInt(next, 10)

      if (Number.isNaN(parsedPort) || parsedPort <= 0)
        throw new Error(`Invalid port: ${next}`)

      port = parsedPort
      index += 1
      continue
    }

    if (current === '--ai-enabled') {
      aiEnabled = true
      continue
    }

    if (current === '--ai-provider') {
      const next = argv[index + 1]
      if (!next)
        throw new Error('Missing value for --ai-provider')
      aiProvider = next
      index += 1
      continue
    }

    if (current === '--ai-model') {
      const next = argv[index + 1]
      if (!next)
        throw new Error('Missing value for --ai-model')
      aiModel = next
      index += 1
      continue
    }

    if (current === '--ai-api-key') {
      const next = argv[index + 1]
      if (!next)
        throw new Error('Missing value for --ai-api-key')
      aiApiKey = next
      index += 1
      continue
    }

    if (current === '--ai-max-tokens') {
      const next = argv[index + 1]
      if (!next)
        throw new Error('Missing value for --ai-max-tokens')
      const parsedTokens = Number.parseInt(next, 10)
      if (Number.isNaN(parsedTokens) || parsedTokens <= 0)
        throw new Error(`Invalid --ai-max-tokens: ${next}`)
      aiMaxTokens = parsedTokens
      index += 1
      continue
    }

    if (current.startsWith('--'))
      throw new Error(`Unknown option: ${current}`)

    if (connectionString)
      throw new Error('Only one PostgreSQL connection string is supported')

    if (!isPostgresConnectionString(current))
      throw new Error('The first argument must be a full PostgreSQL connection string')

    connectionString = current
  }

  if (!connectionString)
    throw new Error('A PostgreSQL connection string is required for the first iteration')

  return {
    connectionString,
    openBrowser,
    allowWrite,
    port,
    aiEnabled,
    aiProvider,
    aiModel,
    aiApiKey,
    aiMaxTokens,
  }
}
