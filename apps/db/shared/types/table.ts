export interface TableInfo {
  schema: string
  name: string
}

export interface TableRecord {
  [key: string]: unknown
}

export interface FetchTableRecordsResult {
  records: TableRecord[]
  totalCount: number
  columns: string[]
}

export interface FetchTableRecordsOptions {
  schema: string
  tableName: string
  page: number
  limit: number
}