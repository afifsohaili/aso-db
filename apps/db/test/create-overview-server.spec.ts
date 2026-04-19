import { afterEach, describe, expect, it } from 'vitest'

import { createOverviewServer } from '../src/server/create-overview-server'

async function startTestServer() {
  const server = createOverviewServer({
    getTables: async () => [
      { schema: 'public', name: 'orders' },
      { schema: 'public', name: 'users' },
    ],
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })

  const address = server.address()

  if (!address || typeof address === 'string')
    throw new Error('Unable to determine test server address')

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  }
}

describe('createOverviewServer', () => {
  const servers: Array<ReturnType<typeof createOverviewServer>> = []

  afterEach(async () => {
    await Promise.all(servers.map(server => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })))

    servers.length = 0
  })

  it('redirects / to /home', async () => {
    const started = await startTestServer()
    servers.push(started.server)

    const response = await fetch(started.url, { redirect: 'manual' })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/home')
  })

  it('renders table names on /home', async () => {
    const started = await startTestServer()
    servers.push(started.server)

    const response = await fetch(`${started.url}/home`)
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('public')
    expect(html).toContain('orders')
    expect(html).toContain('users')
  })

  it('returns tables as JSON from /api/tables', async () => {
    const started = await startTestServer()
    servers.push(started.server)

    const response = await fetch(`${started.url}/api/tables`)
    const payload = await response.json() as { tables: Array<{ schema: string, name: string }> }

    expect(response.status).toBe(200)
    expect(payload.tables).toEqual([
      { schema: 'public', name: 'orders' },
      { schema: 'public', name: 'users' },
    ])
  })
})
