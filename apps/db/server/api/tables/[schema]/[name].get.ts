import type { Pool } from 'pg'
import { getPool, fetchTableStructure } from '../../../utils/db'
import type { FetchTableRecordsOptions, FetchTableRecordsResult, RelationInfo, TableStructure } from '../../../../shared/types/table'

export interface FetchOptions extends FetchTableRecordsOptions {
  sort?: string | null
  order?: 'asc' | 'desc' | null
}

// Validate identifier to prevent SQL injection
function isValidIdentifier(name: string): boolean {
  // PostgreSQL identifiers can contain letters, digits, underscores, and dollar signs
  // Must start with a letter or underscore
  return /^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(name)
}

interface JoinClause {
  tableSchema: string
  tableName: string
  joinSchema: string
  joinTable: string
  joinColumn: string
  targetColumn: string
  direction: 'outgoing' | 'incoming'
}

async function resolveJoins(
  poolInstance: Pool,
  schema: string,
  tableName: string,
  joinTables: string[],
): Promise<JoinClause[]> {
  const joins: JoinClause[] = []
  const joinedTables = [tableName]

  for (const joinTable of joinTables) {
    // Try to find relationship from any already-joined table to the new one
    let found = false

    for (const fromTable of [...joinedTables].reverse()) {
      // Check outgoing FK: fromTable -> joinTable
      const outgoingResult = await poolInstance.query<{
        column_name: string
        foreign_column_name: string
        foreign_table_name: string
      }>(`
        SELECT
          kcu.column_name,
          ccu.column_name AS foreign_column_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
          AND ccu.table_name = $3
          AND ccu.table_schema = $1
      `, [schema, fromTable, joinTable])

      if (outgoingResult.rows.length > 0) {
        joins.push({
          tableSchema: schema,
          tableName: fromTable,
          joinSchema: schema,
          joinTable,
          joinColumn: outgoingResult.rows[0].column_name,
          targetColumn: outgoingResult.rows[0].foreign_column_name,
          direction: 'outgoing',
        })
        found = true
        break
      }

      // Check incoming FK: joinTable -> fromTable
      const incomingResult = await poolInstance.query<{
        column_name: string
        foreign_column_name: string
        foreign_table_name: string
      }>(`
        SELECT
          kcu.column_name,
          ccu.column_name AS foreign_column_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
          AND ccu.table_name = $3
          AND ccu.table_schema = $1
      `, [schema, joinTable, fromTable])

      if (incomingResult.rows.length > 0) {
        joins.push({
          tableSchema: schema,
          tableName: joinTable,
          joinSchema: schema,
          joinTable: fromTable,
          joinColumn: incomingResult.rows[0].column_name,
          targetColumn: incomingResult.rows[0].foreign_column_name,
          direction: 'incoming',
        })
        found = true
        break
      }
    }

    if (!found) {
      throw createError({
        statusCode: 400,
        statusMessage: `Cannot join "${joinTable}" with "${joinedTables.join(', ')}" - no foreign key relationship found`,
      })
    }

    joinedTables.push(joinTable)
  }

  return joins
}

async function fetchTableRecords(
  poolInstance: Pool,
  options: FetchOptions & { joins?: string[] },
): Promise<FetchTableRecordsResult> {
  const { schema, tableName, page, limit, sort, order, joins } = options
  const offset = (page - 1) * limit

  // Resolve joins if provided
  const hasJoins = joins && joins.length > 0
  const joinClauses = hasJoins
    ? await resolveJoins(poolInstance, schema, tableName, joins)
    : []

  // Collect all tables in the query for column prefixing
  const allTables = hasJoins ? [tableName, ...(joins || [])] : [tableName]

  // Build column list with table prefixes (only when joining)
  let selectColumns = ''
  if (hasJoins) {
    for (const t of allTables) {
      const colResult = await poolInstance.query<{ column_name: string }>(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [schema, t])
      const cols = colResult.rows.map(r => `"${schema}"."${t}"."${r.column_name}" AS "${t}.${r.column_name}"`)
      selectColumns += (selectColumns ? ', ' : '') + cols.join(', ')
    }
  }
  else {
    selectColumns = '*'
  }

  // Build FROM + JOINs
  let query = `SELECT ${selectColumns} FROM "${schema}"."${tableName}"`
  for (const join of joinClauses) {
    if (join.direction === 'outgoing') {
      query += ` LEFT JOIN "${join.joinSchema}"."${join.joinTable}" ON "${join.tableSchema}"."${join.tableName}"."${join.joinColumn}" = "${join.joinSchema}"."${join.joinTable}"."${join.targetColumn}"`
    }
    else {
      query += ` LEFT JOIN "${join.tableSchema}"."${join.tableName}" ON "${join.tableSchema}"."${join.tableName}"."${join.joinColumn}" = "${join.joinSchema}"."${join.joinTable}"."${join.targetColumn}"`
    }
  }

  // Get total count (count base table rows only, not joined rows)
  const countResult = await poolInstance.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`,
  )
  const totalCount = Number.parseInt(countResult.rows[0].count, 10)

  // Add sorting on base table columns only
  if (sort && order && isValidIdentifier(sort)) {
    query += ` ORDER BY "${schema}"."${tableName}"."${sort}" ${order.toUpperCase()}`
  }

  query += ` LIMIT $1 OFFSET $2`

  // Get records with pagination
  const recordsResult = await poolInstance.query<Record<string, unknown>>(
    query,
    [limit, offset],
  )

  // Get column names from first row
  let columns: string[] = []
  if (recordsResult.rows.length > 0) {
    columns = Object.keys(recordsResult.rows[0])
  }
  else {
    // Build from information_schema for all tables
    for (const t of allTables) {
      const colResult = await poolInstance.query<{ column_name: string }>(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [schema, t])
      if (hasJoins) {
        columns.push(...colResult.rows.map(r => `${t}.${r.column_name}`))
      }
      else {
        columns.push(...colResult.rows.map(r => r.column_name))
      }
    }
  }

  return {
    records: recordsResult.rows,
    totalCount,
    columns,
  }
}

export default defineEventHandler(async (event) => {
  const { schema, name } = getRouterParams(event)
  const { page = '1', limit = '50', sort, order, joins: joinsParam } = getQuery(event)

  // Validate identifiers
  if (!schema || !name || !isValidIdentifier(schema) || !isValidIdentifier(name)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid schema or table name',
    })
  }

  const tableName = name

  // Validate sort column if provided
  if (sort && !isValidIdentifier(sort as string)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid sort column',
    })
  }

  // Validate order if provided
  const validOrder = order === 'asc' || order === 'desc' ? order : null

  const pageNum = Math.max(1, Number.parseInt(page as string, 10))
  const limitNum = Math.min(200, Math.max(1, Number.parseInt(limit as string, 10)))

  // Parse joins parameter
  let joins: string[] | undefined
  if (joinsParam && typeof joinsParam === 'string') {
    joins = joinsParam.split(',').filter(Boolean)

    // Validate each join table name
    for (const jt of joins) {
      if (!isValidIdentifier(jt)) {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid join table name: ${jt}`,
        })
      }
    }

    // Note: max 3 joins (4 tables total) is enforced in the UI, not here
  }

  try {
    const poolInstance = getPool()

    // First verify the table exists
    const tableCheck = await poolInstance.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2
    `, [schema, tableName])

    if (tableCheck.rows.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `Table "${schema}.${tableName}" not found`,
      })
    }

    const [result, structure] = await Promise.all([
      fetchTableRecords(poolInstance, {
        schema,
        tableName,
        page: pageNum,
        limit: limitNum,
        sort: sort as string | undefined,
        order: validOrder,
        joins,
      }),
      fetchTableStructure(poolInstance, schema, tableName),
    ])

    return {
      ...result,
      structure,
    }
  }
  catch (err: any) {
    console.error('Error fetching table records:', err)
    if (err.statusCode)
      throw err

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch table records',
    })
  }
})