import pkg from 'node-sql-parser'
import { Pool } from 'pg'
import { createHash } from 'crypto'

const { Parser } = pkg

// In-memory cache for compact schema text
// Key: hash of database URL, Value: compact schema text
const schemaCache = new Map<string, string>()

function getCacheKey(databaseUrl: string, maxTokens: number): string {
  return createHash('sha256').update(`${databaseUrl}:${maxTokens}`).digest('hex')
}

export interface CompactColumnInfo {
  name: string
  type: string
  isPrimaryKey: boolean
  isUnique: boolean
  foreignKey?: {
    table: string
    column: string
  }
}

export interface CompactTableInfo {
  name: string
  schema: string
  columns: CompactColumnInfo[]
}

/**
 * Extract table names from a SQL statement using node-sql-parser.
 */
export function extractTableNames(sql: string): string[] {
  const parser = new Parser()
  try {
    const ast = parser.astify(sql, { database: 'Postgresql' })
    const statements = Array.isArray(ast) ? ast : [ast]
    const names = new Set<string>()

    for (const stmt of statements) {
      extractFromAst(stmt, names)
    }

    return Array.from(names)
  }
  catch {
    // Fallback: regex-based extraction for simple cases
    return extractTableNamesRegex(sql)
  }
}

function extractFromAst(ast: any, names: Set<string>) {
  if (!ast || typeof ast !== 'object') return

  // FROM clause
  if (ast.from) {
    for (const table of ast.from) {
      if (table.table) names.add(table.table)
    }
  }

  // JOINs
  if (ast.join) {
    for (const join of ast.join) {
      if (join.table) names.add(join.table)
    }
  }

  // INTO clause (INSERT)
  if (ast.table && ast.table[0]?.table) {
    names.add(ast.table[0].table)
  }

  // Recursive search
  for (const key of Object.keys(ast)) {
    const value = ast[key]
    if (Array.isArray(value)) {
      for (const item of value) extractFromAst(item, names)
    }
    else if (typeof value === 'object') {
      extractFromAst(value, names)
    }
  }
}

function extractTableNamesRegex(sql: string): string[] {
  const names = new Set<string>()

  // Match FROM, JOIN, INTO patterns
  const patterns = [
    /\bFROM\s+(\w+)/gi,
    /\bJOIN\s+(\w+)/gi,
    /\bINTO\s+(\w+)/gi,
    /\bUPDATE\s+(\w+)/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(sql)) !== null) {
      names.add(match[1]!)
    }
  }

  return Array.from(names)
}

/**
 * Build compact schema context for AI autocomplete.
 */
export async function buildSchemaContext(
  pool: Pool,
  statement: string,
  maxTokens: number,
  databaseUrl?: string,
): Promise<string> {
  // Check cache first
  const dbUrl = databaseUrl || process.env.NUXT_DATABASE_URL || ''
  const cacheKey = getCacheKey(dbUrl, maxTokens)
  const cached = schemaCache.get(cacheKey)
  if (cached) {
    console.log('[AI Backend] Schema cache hit')
    return cached
  }

  // 1. Extract referenced table names
  const referencedNames = extractTableNames(statement)

  // 2. Get all schema info
  const { rows } = await pool.query<{
    table_schema: string
    table_name: string
    column_name: string
    data_type: string
    udt_name: string
    is_nullable: string
  }>(`
    SELECT
      c.table_schema,
      c.table_name,
      c.column_name,
      c.data_type,
      c.udt_name,
      c.is_nullable
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON c.table_schema = t.table_schema
      AND c.table_name = t.table_name
    WHERE t.table_type = 'BASE TABLE'
      AND c.table_schema NOT IN ('information_schema', 'pg_catalog')
      AND c.table_schema NOT LIKE 'pg_toast%'
      AND c.table_schema NOT LIKE 'pg_temp_%'
    ORDER BY c.table_schema, c.table_name, c.ordinal_position
  `)

  // 3. Build table map
  const tableMap = new Map<string, CompactTableInfo>()

  for (const row of rows) {
    const key = `${row.table_schema}.${row.table_name}`
    if (!tableMap.has(key)) {
      tableMap.set(key, {
        schema: row.table_schema,
        name: row.table_name,
        columns: [],
      })
    }

    tableMap.get(key)!.columns.push({
      name: row.column_name,
      type: row.udt_name === 'varchar' ? 'varchar' : row.udt_name,
      isPrimaryKey: false,
      isUnique: false,
    })
  }

  // 4. Get constraints (PK, FK, UNIQUE) for context
  const { rows: constraintRows } = await pool.query<{
    table_schema: string
    table_name: string
    column_name: string
    constraint_type: string
    referenced_table: string | null
    referenced_column: string | null
  }>(`
    SELECT
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      tc.constraint_type,
      ccu.table_name AS referenced_table,
      ccu.column_name AS referenced_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
      AND tc.table_schema NOT IN ('information_schema', 'pg_catalog')
  `)

  // Apply constraints to columns
  for (const row of constraintRows) {
    const key = `${row.table_schema}.${row.table_name}`
    const table = tableMap.get(key)
    if (!table) continue

    const col = table.columns.find(c => c.name === row.column_name)
    if (!col) continue

    if (row.constraint_type === 'PRIMARY KEY') {
      col.isPrimaryKey = true
    }
    else if (row.constraint_type === 'UNIQUE') {
      col.isUnique = true
    }
    else if (row.constraint_type === 'FOREIGN KEY' && row.referenced_table && row.referenced_column) {
      col.foreignKey = {
        table: row.referenced_table,
        column: row.referenced_column,
      }
    }
  }

  // 5. Prioritize tables
  const tables = Array.from(tableMap.values())
  const prioritized = prioritizeTables(tables, referencedNames)

  // 6. Build compact text with token budget
  const lines: string[] = []
  let tokenCount = 0

  for (const t of prioritized) {
    const cols = t.columns.map((c) => {
      let colStr = c.name
      if (c.isPrimaryKey) colStr += ':pk'
      if (c.isUnique) colStr += ':uk'
      if (c.foreignKey) colStr += `:fk→${c.foreignKey.table}.${c.foreignKey.column}`
      return colStr
    }).join(',')

    const line = `${t.name}:${cols}`

    // Rough token estimate: ~4 chars per token
    const lineTokens = Math.ceil(line.length / 4)
    if (tokenCount + lineTokens > maxTokens) break

    tokenCount += lineTokens
    lines.push(line)
  }

  const result = lines.join('\n')

  // Store in cache
  schemaCache.set(cacheKey, result)
  console.log('[AI Backend] Schema cached, tables:', lines.length)

  return result
}

function prioritizeTables(
  tables: CompactTableInfo[],
  referencedNames: string[],
): CompactTableInfo[] {
  // 1. Referenced tables first
  const referenced = tables.filter(t =>
    referencedNames.includes(t.name),
  )

  // 2. Tables joined via FK (tables that reference referenced tables)
  const joined = tables.filter(t => {
    if (referenced.includes(t)) return false
    return t.columns.some(c =>
      c.foreignKey && referencedNames.includes(c.foreignKey.table),
    )
  })

  // 3. Remaining tables
  const remaining = tables.filter(t =>
    !referenced.includes(t) && !joined.includes(t),
  )

  return [...referenced, ...joined, ...remaining]
}
