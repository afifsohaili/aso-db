import { createServer } from 'node:http'

import type { TableInfo } from './table-info'
import { renderOverviewHtml } from './render-overview-html'

export interface CreateOverviewServerOptions {
  getTables: () => Promise<TableInfo[]>
}

export function createOverviewServer(options: CreateOverviewServerOptions) {
  return createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1')

    try {
      if (requestUrl.pathname === '/') {
        response.writeHead(302, { Location: '/overview' })
        response.end()
        return
      }

      if (requestUrl.pathname === '/api/tables') {
        const tables = await options.getTables()

        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        response.end(JSON.stringify({ tables }))
        return
      }

      if (requestUrl.pathname === '/overview') {
        const tables = await options.getTables()

        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        response.end(renderOverviewHtml(tables))
        return
      }

      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('Not found')
    }
    catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected ASO-DB server error'

      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      response.end(message)
    }
  })
}
