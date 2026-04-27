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
  structure?: TableStructure
}

export interface RelationInfo {
  sourceSchema: string
  sourceTable: string
  sourceColumn: string
  targetSchema: string
  targetTable: string
  targetColumn: string
}

export interface FetchTableRecordsOptions {
  schema: string
  tableName: string
  page: number
  limit: number
  sort?: string
  order?: 'asc' | 'desc' | null
  joins?: string[]
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  defaultValue: string | null
  constraints: ('PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK')[]
  comment: string | null
  isPrimaryKey: boolean
  isForeignKey: boolean
  foreignKey?: {
    referencedSchema: string
    referencedTable: string
    referencedColumn: string
  }
}

export interface IndexInfo {
  name: string
  columns: string[]
  type: string
  unique: boolean
  partial: boolean
  primary: boolean
}

export interface FKInfo {
  name: string
  column: string
  referencedSchema: string
  referencedTable: string
  referencedColumn: string
  onUpdate: string
  onDelete: string
}

export interface TableStructure {
  columns: ColumnInfo[]
  indexes: IndexInfo[]
  foreignKeys: FKInfo[]
}