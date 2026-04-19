#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createServer } from 'node:http'
import open from 'open'

import { parseCliArgs } from './parse-cli-args'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function waitForServer(port: number, timeout = 30000): Promise<void> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/home`)
      if (response.status === 200) {
        return
      }
    }
    catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  throw new Error(`Server did not start within ${timeout}ms`)
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Unable to get port'))
        return
      }
      const port = address.port
      server.close(() => resolve(port))
    })
  })
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2))

  // Determine port - either specified or random
  const port = args.port ?? await findFreePort()

  // Determine server entry point
  const isDev = process.env.NODE_ENV === 'development' || process.env.ASODB_DEV
  const serverEntry = isDev
    ? join(__dirname, '../node_modules/nuxt/bin/nuxt.mjs')
    : join(__dirname, '../.output/server/index.mjs')

  const serverArgs = isDev
    ? ['dev', '--port', String(port)]
    : []

  // Determine final args based on mode
  const finalArgs = isDev
    ? [...serverArgs]  // ['dev', '--port', String(port)]
    : [String(port)]   // Just the port for Nitro production server

  // Spawn Nuxt server process
  const child = spawn(process.execPath, [serverEntry, ...finalArgs], {
    env: {
      ...process.env,
      NUXT_DATABASE_URL: args.connectionString,
      NUXT_PUBLIC_IS_READ_ONLY: String(!args.allowWrite),
      PORT: String(port),
      NITRO_PORT: String(port),
    },
    stdio: 'inherit',
  })

  // Wait for server to be ready
  try {
    await waitForServer(port)
  }
  catch (error) {
    child.kill()
    throw error
  }

  const homeUrl = `http://127.0.0.1:${port}/home`
  console.log(`ASO-DB running at ${homeUrl}`)

  // Open browser if not disabled
  if (args.openBrowser) {
    await open(homeUrl)
  }

  // Handle graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down...`)
    child.kill('SIGTERM')
  }

  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))

  // Wait for child process to exit
  const exitCode = await new Promise<number>((resolve) => {
    child.on('exit', (code) => resolve(code ?? 0))
  })

  process.exit(exitCode)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown ASO-DB error'
  console.error(message)
  process.exit(1)
})