#!/usr/bin/env node

import { once } from 'node:events'
import open from 'open'

import { parseCliArgs } from '../src/cli/parse-cli-args'
import { listTables } from '../src/db/list-tables'
import { createOverviewServer } from '../src/server/create-overview-server'

async function main() {
  const args = parseCliArgs(process.argv.slice(2))

  const server = createOverviewServer({
    getTables: () => listTables(args.connectionString),
    connectionString: args.connectionString,
  })

  server.listen(args.port ?? 0, '127.0.0.1')
  await once(server, 'listening')

  const address = server.address()

  if (!address || typeof address === 'string')
    throw new Error('Unable to determine ASO-DB server address')

  const overviewUrl = `http://127.0.0.1:${address.port}/overview`

  console.log(`ASO-DB running at ${overviewUrl}`)

  if (args.openBrowser)
    await open(overviewUrl)

  const shutdown = () => {
    server.close(() => {
      process.exit(0)
    })
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown ASO-DB error'
  console.error(message)
  process.exit(1)
})
