export interface TableViewData {
  schema: string
  tableName: string
  columns: string[]
  records: Record<string, unknown>[]
  page: number
  limit: number
  totalCount: number
  totalPages: number
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatValue(value: unknown): string {
  if (value === null) return '<span class="null">null</span>'
  if (value === undefined) return '<span class="undefined">undefined</span>'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') {
    try {
      return escapeHtml(JSON.stringify(value))
    }
    catch {
      return '[Object]'
    }
  }
  return escapeHtml(String(value))
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

export function renderTableHtml(data: TableViewData): string {
  const { schema, tableName, columns, records, page, limit, totalCount, totalPages } = data
  const startRecord = (page - 1) * limit + 1
  const endRecord = Math.min(page * limit, totalCount)
  const hasPrevious = page > 1
  const hasNext = page < totalPages

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(schema)}.${escapeHtml(tableName)} - ASO-DB</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        margin: 0;
        background: #09090b;
        color: #fafafa;
        min-height: 100vh;
      }

      header {
        border-bottom: 1px solid #27272a;
        background: #111827;
        padding: 16px 24px;
      }

      header .container {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 16px;
      }

      header a.back {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #a1a1aa;
        text-decoration: none;
        font-size: 0.9rem;
        transition: color 0.2s;
      }

      header a.back:hover {
        color: #fafafa;
      }

      header a.back svg {
        width: 16px;
        height: 16px;
      }

      header h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }

      header .schema {
        color: #71717a;
        font-weight: 400;
      }

      header .table-name {
        color: #fafafa;
      }

      main {
        max-width: 1400px;
        margin: 0 auto;
        padding: 24px;
      }

      .stats {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
        color: #a1a1aa;
        font-size: 0.9rem;
      }

      .stats .count {
        color: #fafafa;
        font-weight: 500;
      }

      .table-container {
        border: 1px solid #27272a;
        border-radius: 8px;
        overflow: hidden;
        background: #18181b;
        overflow-x: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }

      th {
        background: #27272a;
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
        color: #e4e4e7;
        border-bottom: 1px solid #3f3f46;
        white-space: nowrap;
      }

      td {
        padding: 12px 16px;
        border-bottom: 1px solid #27272a;
        color: #d4d4d8;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      tr:hover td {
        background: #27272a;
      }

      tr:last-child td {
        border-bottom: none;
      }

      .null {
        color: #71717a;
        font-style: italic;
      }

      .undefined {
        color: #52525b;
        font-style: italic;
      }

      .empty-state {
        padding: 48px;
        text-align: center;
        color: #71717a;
      }

      /* Pagination */
      .pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 24px;
        padding: 16px 0;
      }

      .pagination-info {
        color: #a1a1aa;
        font-size: 0.9rem;
      }

      .pagination-info .range {
        color: #fafafa;
        font-weight: 500;
      }

      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .pagination-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px 12px;
        background: #27272a;
        border: 1px solid #3f3f46;
        border-radius: 6px;
        color: #fafafa;
        text-decoration: none;
        font-size: 0.875rem;
        transition: all 0.2s;
        cursor: pointer;
      }

      .pagination-btn:hover:not(:disabled) {
        background: #3f3f46;
        border-color: #52525b;
      }

      .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .pagination-btn svg {
        width: 16px;
        height: 16px;
      }

      .page-numbers {
        display: flex;
        align-items: center;
        gap: 4px;
        margin: 0 8px;
      }

      .page-number {
        min-width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 8px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 6px;
        color: #a1a1aa;
        text-decoration: none;
        font-size: 0.875rem;
        transition: all 0.2s;
      }

      .page-number:hover {
        background: #27272a;
        color: #fafafa;
      }

      .page-number.active {
        background: #3b82f6;
        border-color: #3b82f6;
        color: #fff;
      }

      .page-number.ellipsis {
        cursor: default;
      }

      .page-number.ellipsis:hover {
        background: transparent;
        color: #a1a1aa;
      }

      /* Scrollbar */
      .table-container::-webkit-scrollbar {
        height: 8px;
      }

      .table-container::-webkit-scrollbar-track {
        background: transparent;
      }

      .table-container::-webkit-scrollbar-thumb {
        background: #3f3f46;
        border-radius: 4px;
      }

      .table-container::-webkit-scrollbar-thumb:hover {
        background: #52525b;
      }
    </style>
  </head>
  <body>
    <header>
      <div class="container">
        <a href="/home" class="back">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Home
        </a>
        <h1>
          <span class="schema">${escapeHtml(schema)}.</span><span class="table-name">${escapeHtml(tableName)}</span>
        </h1>
      </div>
    </header>

    <main>
      <div class="stats">
        <span>Total records: <span class="count">${formatNumber(totalCount)}</span></span>
        <span>•</span>
        <span>Page ${page} of ${totalPages}</span>
      </div>

      <div class="table-container">
        ${records.length === 0
          ? '<div class="empty-state">No records found</div>'
          : `<table>
              <thead>
                <tr>
                  ${columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${records.map(record => `
                  <tr>
                    ${columns.map(col => `
                      <td title="${escapeHtml(String(record[col] ?? ''))}">${formatValue(record[col])}</td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>`
        }
      </div>

      ${totalPages > 1 ? renderPagination(schema, tableName, page, totalPages, startRecord, endRecord, totalCount) : ''}
    </main>
  </body>
</html>`
}

function renderPagination(
  schema: string,
  tableName: string,
  currentPage: number,
  totalPages: number,
  startRecord: number,
  endRecord: number,
  totalCount: number,
): string {
  const tablePath = `/table/${schema}.${tableName}`
  const pageNumbers = getPageNumbers(currentPage, totalPages)

  return `<div class="pagination">
    <div class="pagination-info">
      Showing <span class="range">${startRecord.toLocaleString()} - ${endRecord.toLocaleString()}</span> of <span class="range">${totalCount.toLocaleString()}</span> records
    </div>
    <div class="pagination-controls">
      <a href="${tablePath}?page=${currentPage - 1}" class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Previous
      </a>

      <div class="page-numbers">
        ${pageNumbers.map(num => {
          if (num === '...') {
            return '<span class="page-number ellipsis">...</span>'
          }
          return `<a href="${tablePath}?page=${num}" class="page-number ${num === currentPage ? 'active' : ''}">${num}</a>`
        }).join('')}
      </div>

      <a href="${tablePath}?page=${currentPage + 1}" class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''}>
        Next
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </a>
    </div>
  </div>`
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  if (current <= 3) {
    return [1, 2, 3, 4, 5, '...', total]
  }

  if (current >= total - 2) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  }

  return [1, '...', current - 1, current, current + 1, '...', total]
}
