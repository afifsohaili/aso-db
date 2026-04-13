import { createServer } from 'node:http'

import type { TableInfo } from './table-info'
import { renderOverviewHtml } from './render-overview-html'
import { renderTableHtml } from './render-table-html'
import { fetchTableRecords } from '../db/fetch-table-records'

export interface CreateOverviewServerOptions {
  getTables: () => Promise<TableInfo[]>
  connectionString: string
}

const DEFAULT_PAGE_SIZE = 200

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

      // Handle /table/:name route
      const tableMatch = requestUrl.pathname.match(/^\/table\/(.+)$/)
      if (tableMatch) {
        const tableIdentifier = decodeURIComponent(tableMatch[1])
        const tables = await options.getTables()

        // Find the table (support both "schema.table" and "table" formats)
        let schema: string
        let tableName: string

        if (tableIdentifier.includes('.')) {
          const parts = tableIdentifier.split('.')
          schema = parts[0]
          tableName = parts.slice(1).join('.')
        }
        else {
          // If no schema specified, try to find in public schema or first matching table
          const matchingTable = tables.find(t => t.name === tableIdentifier)
          if (matchingTable) {
            schema = matchingTable.schema
            tableName = matchingTable.name
          }
          else {
            response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
            response.end(`Table "${tableIdentifier}" not found`)
            return
          }
        }

        // Verify table exists
        const tableExists = tables.some(t => t.schema === schema && t.name === tableName)
        if (!tableExists) {
          response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
          response.end(`Table "${schema}.${tableName}" not found`)
          return
        }

        // Parse pagination params
        const page = Math.max(1, Number.parseInt(requestUrl.searchParams.get('page') ?? '1', 10))
        const limit = DEFAULT_PAGE_SIZE

        // Fetch records
        const result = await fetchTableRecords({
          connectionString: options.connectionString,
          schema,
          tableName,
          page,
          limit,
        })

        const totalPages = Math.ceil(result.totalCount / limit)

        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        response.end(renderTableHtml({
          schema,
          tableName,
          columns: result.columns,
          records: result.records,
          page,
          limit,
          totalCount: result.totalCount,
          totalPages,
        }))
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
