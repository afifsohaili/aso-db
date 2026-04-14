export interface QueryResult {
  index: number
  sql: string
  success: boolean
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  durationMs: number
  errorMessage?: string
}

export interface ExecuteQueryRequest {
  sql: string
  selectedSql?: string | null
}

export interface ExecuteQueryResponse {
  results: QueryResult[]
}

export interface QueryHistoryEntry {
  id: number
  sqlContent: string
  executedAt: string
  durationMs: number | null
  rowCount: number | null
  errorMessage: string | null
  savedQueryId: number | null
}

export interface SavedQuery {
  id: number
  title: string
  sqlContent: string
  createdAt: string
  updatedAt: string
}

export interface QuerySession {
  id: number
  sqlContent: string
  updatedAt: string
}
