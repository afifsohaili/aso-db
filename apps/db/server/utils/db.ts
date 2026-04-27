import { Pool } from 'pg'
import type { TableInfo, ColumnInfo, IndexInfo, FKInfo, TableStructure } from '../../shared/types/table'

// Create a single Pool instance for the application
let pool: Pool | null = null

function isLocalhost(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local')
  }
  catch {
    return false
  }
}

export { isLocalhost }

export function getPool(): Pool {
  if (!pool) {
    const config = useRuntimeConfig()
    if (!config.databaseUrl) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Database URL not configured. Set NUXT_DATABASE_URL environment variable.',
      })
    }
    const useSsl = !isLocalhost(config.databaseUrl)
    pool = new Pool({
      connectionString: config.databaseUrl,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      ...(config.public.isReadOnly ? { options: '-c default_transaction_read_only=on' } : {}),
    })
  }
  return pool
}

export async function listTables(pool: Pool): Promise<TableInfo[]> {
  const result = await pool.query<TableInfo>(`
    SELECT
      table_schema AS schema,
      table_name AS name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('information_schema', 'pg_catalog')
      AND table_schema NOT LIKE 'pg_toast%'
      AND table_schema NOT LIKE 'pg_temp_%'
    ORDER BY table_schema, table_name
  `)

  return result.rows
}

interface SchemaTableInfo {
  schema: string
  name: string
  columns: string[]
}

export async function listSchema(pool: Pool): Promise<SchemaTableInfo[]> {
  // Single query to get all tables + columns for non-system schemas
  const result = await pool.query<{
    schema: string
    name: string
    column_name: string
  }>(`
    SELECT
      t.table_schema AS schema,
      t.table_name AS name,
      c.column_name
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c
      ON t.table_schema = c.table_schema
      AND t.table_name = c.table_name
    WHERE t.table_type IN ('BASE TABLE', 'VIEW')
      AND t.table_schema NOT IN ('information_schema', 'pg_catalog')
      AND t.table_schema NOT LIKE 'pg_toast%'
      AND t.table_schema NOT LIKE 'pg_temp_%'
    ORDER BY t.table_schema, t.table_name, c.ordinal_position
  `)

  // Group columns by table
  const tableMap = new Map<string, SchemaTableInfo>()

  for (const row of result.rows) {
    const key = `${row.schema}.${row.name}`
    if (!tableMap.has(key)) {
      tableMap.set(key, { schema: row.schema, name: row.name, columns: [] })
    }
    if (row.column_name) {
      tableMap.get(key)!.columns.push(row.column_name)
    }
  }

  return Array.from(tableMap.values())
}

export async function fetchTableStructure(
  poolInstance: Pool,
  schema: string,
  tableName: string,
): Promise<TableStructure> {
  // 1. Get column info with types, defaults, nullability, comments
  const columnsResult = await poolInstance.query<{
    column_name: string
    data_type: string
    udt_name: string
    character_maximum_length: number | null
    numeric_precision: number | null
    numeric_scale: number | null
    is_nullable: string
    column_default: string | null
    col_description: string | null
  }>(`
    SELECT
      c.column_name,
      c.data_type,
      c.udt_name,
      c.character_maximum_length,
      c.numeric_precision,
      c.numeric_scale,
      c.is_nullable,
      c.column_default,
      col_description(pgc.oid, a.attnum) AS col_description
    FROM information_schema.columns c
    JOIN pg_class pgc ON pgc.relname = c.table_name
    JOIN pg_namespace pgn ON pgn.oid = pgc.relnamespace AND pgn.nspname = c.table_schema
    LEFT JOIN pg_attribute a ON a.attrelid = pgc.oid AND a.attname = c.column_name
    WHERE c.table_schema = $1 AND c.table_name = $2
    ORDER BY c.ordinal_position
  `, [schema, tableName])

  // 2. Get constraints (PK, FK, UQ, CHECK)
  const constraintsResult = await poolInstance.query<{
    constraint_name: string
    constraint_type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK'
    column_name: string
    referenced_schema: string | null
    referenced_table: string | null
    referenced_column: string | null
  }>(`
    SELECT
      tc.constraint_name,
      tc.constraint_type::text AS constraint_type,
      kcu.column_name,
      ccu.table_schema AS referenced_schema,
      ccu.table_name AS referenced_table,
      ccu.column_name AS referenced_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = $1 AND tc.table_name = $2
      AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK')
    ORDER BY tc.constraint_type, tc.constraint_name, kcu.ordinal_position
  `, [schema, tableName])

  // Build constraint lookup maps
  const columnConstraints = new Map<string, ('PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK')[]>()
  const columnForeignKeys = new Map<string, {
    referencedSchema: string
    referencedTable: string
    referencedColumn: string
  }>()
  const primaryKeyColumns = new Set<string>()

  for (const row of constraintsResult.rows) {
    const colName = row.column_name
    if (!columnConstraints.has(colName)) {
      columnConstraints.set(colName, [])
    }
    const constraints = columnConstraints.get(colName)!
    if (!constraints.includes(row.constraint_type)) {
      constraints.push(row.constraint_type)
    }

    if (row.constraint_type === 'PRIMARY KEY') {
      primaryKeyColumns.add(colName)
    }

    if (row.constraint_type === 'FOREIGN KEY' && row.referenced_table && row.referenced_column) {
      columnForeignKeys.set(colName, {
        referencedSchema: row.referenced_schema || schema,
        referencedTable: row.referenced_table,
        referencedColumn: row.referenced_column,
      })
    }
  }

  // Build columns
  const columns: ColumnInfo[] = columnsResult.rows.map((row) => {
    const constraints = columnConstraints.get(row.column_name) || []
    const fk = columnForeignKeys.get(row.column_name)

    // Build type string with precision/scale/length
    let type = row.data_type
    if (row.data_type === 'character varying' && row.character_maximum_length) {
      type = `character varying(${row.character_maximum_length})`
    }
    else if (row.data_type === 'character' && row.character_maximum_length) {
      type = `character(${row.character_maximum_length})`
    }
    else if (row.data_type === 'numeric' && row.numeric_precision !== null) {
      if (row.numeric_scale !== null && row.numeric_scale > 0) {
        type = `numeric(${row.numeric_precision},${row.numeric_scale})`
      }
      else {
        type = `numeric(${row.numeric_precision})`
      }
    }
    else if (row.data_type === 'ARRAY') {
      type = `${row.udt_name.replace('_', '')}[]`
    }
    else if (row.data_type === 'USER-DEFINED') {
      type = row.udt_name
    }

    return {
      name: row.column_name,
      type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      constraints,
      comment: row.col_description,
      isPrimaryKey: primaryKeyColumns.has(row.column_name),
      isForeignKey: constraints.includes('FOREIGN KEY'),
      foreignKey: fk,
    }
  })

  // 3. Get indexes
  const indexesResult = await poolInstance.query<{
    index_name: string
    index_type: string
    is_unique: boolean
    is_primary: boolean
    is_partial: boolean
    columns: string[]
  }>(`
    SELECT
      i.relname AS index_name,
      am.amname AS index_type,
      ix.indisunique AS is_unique,
      ix.indisprimary AS is_primary,
      ix.indpred IS NOT NULL AS is_partial,
      array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum))::text[] AS columns
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_am am ON am.oid = i.relam
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE n.nspname = $1 AND t.relname = $2
    GROUP BY i.relname, am.amname, ix.indisunique, ix.indisprimary, ix.indpred
    ORDER BY i.relname
  `, [schema, tableName])

  const indexes: IndexInfo[] = indexesResult.rows.map(row => ({
    name: row.index_name,
    columns: row.columns,
    type: row.index_type,
    unique: row.is_unique,
    partial: row.is_partial,
    primary: row.is_primary,
  }))

  // 4. Get foreign key details with update/delete rules
  const fkResult = await poolInstance.query<{
    constraint_name: string
    column_name: string
    referenced_schema: string
    referenced_table: string
    referenced_column: string
    on_update: string
    on_delete: string
  }>(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_schema AS referenced_schema,
      ccu.table_name AS referenced_table,
      ccu.column_name AS referenced_column,
      rc.update_rule AS on_update,
      rc.delete_rule AS on_delete
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
      AND rc.constraint_schema = tc.table_schema
    WHERE tc.table_schema = $1 AND tc.table_name = $2
      AND tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.constraint_name, kcu.ordinal_position
  `, [schema, tableName])

  const foreignKeys: FKInfo[] = fkResult.rows.map(row => ({
    name: row.constraint_name,
    column: row.column_name,
    referencedSchema: row.referenced_schema,
    referencedTable: row.referenced_table,
    referencedColumn: row.referenced_column,
    onUpdate: row.on_update,
    onDelete: row.on_delete,
  }))

  return {
    columns,
    indexes,
    foreignKeys,
  }
}