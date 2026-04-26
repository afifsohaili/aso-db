export interface SchemaTableInfo {
  schema: string
  name: string
  columns: string[]
}

export interface SchemaResponse {
  tables: SchemaTableInfo[]
}
