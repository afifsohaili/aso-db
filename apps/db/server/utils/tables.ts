import { Pool } from 'pg'
import type { FetchTableRecordsOptions, FetchTableRecordsResult } from '../../../shared/types/table'

interface JoinInfo {
  tableName: string
  schema: string
  joinCondition: string
}

async function findJoinCondition(
  pool: Pool,
  fromSchema: string,
  fromTable: string,
  toSchema: string,
  toTable: string,
): Promise<string | null> {
  // Try to find FK from fromTable to toTable
  const fkResult = await pool.query<{
    column_name: string
    foreign_column_name: string
  }>(`
    SELECT
      kcu.column_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.table_schema = $1
      AND kcu.table_name = $2
      AND ccu.table_schema = $3
      AND ccu.table_name = $4
  `, [fromSchema, fromTable, toSchema, toTable])

  if (fkResult.rows.length > 0) {
    return `"${fromSchema}"."${fromTable}"."${fkResult.rows[0].column_name}" = "${toSchema}"."${toTable}"."${fkResult.rows[0].foreign_column_name}"`
  }

  // Try reverse: FK from toTable to fromTable
  const reverseFkResult = await pool.query<{
    column_name: string
    foreign_column_name: string
  }>(`
    SELECT
      kcu.column_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.table_schema = $1
      AND kcu.table_name = $2
      AND ccu.table_schema = $3
      AND ccu.table_name = $4
  `, [toSchema, toTable, fromSchema, fromTable])

  if (reverseFkResult.rows.length > 0) {
    return `"${toSchema}"."${toTable}"."${reverseFkResult.rows[0].column_name}" = "${fromSchema}"."${fromTable}"."${reverseFkResult.rows[0].foreign_column_name}"`
  }

  return null
}

export async function fetchTableRecords(
  pool: Pool,
  options: FetchTableRecordsOptions,
): Promise<FetchTableRecordsResult> {
  const { schema, tableName, page, limit, joins } = options
  const offset = (page - 1) * limit

  if (joins && joins.length > 0) {
    return fetchWithJoins(pool, options)
  }

  // Get total count
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`,
  )
  const totalCount = Number.parseInt(countResult.rows[0].count, 10)

  // Get records with pagination
  const recordsResult = await pool.query<Record<string, unknown>>(
    `SELECT * FROM "${schema}"."${tableName}" LIMIT $1 OFFSET $2`,
    [limit, offset],
  )

  // Get column names from first row or from information_schema
  let columns: string[] = []
  if (recordsResult.rows.length > 0) {
    columns = Object.keys(recordsResult.rows[0])
  }
  else {
    // If no rows, get columns from information_schema
    const columnsResult = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [schema, tableName])
    columns = columnsResult.rows.map(r => r.column_name)
  }

  return {
    records: recordsResult.rows,
    totalCount,
    columns,
  }
}

async function fetchWithJoins(
  pool: Pool,
  options: FetchTableRecordsOptions,
): Promise<FetchTableRecordsResult> {
  const { schema, tableName, page, limit, sort, order, joins } = options
  const offset = (page - 1) * limit

  if (!joins || joins.length === 0) {
    throw new Error('fetchWithJoins called without joins')
  }

  // Resolve join conditions for each table
  const resolvedJoins: JoinInfo[] = []
  const allTables = [{ schema, tableName }]

  for (const joinTable of joins) {
    let joinCondition: string | null = null

    // Try to find FK relationship from any already-resolved table to this join table
    for (const prevTable of allTables) {
      joinCondition = await findJoinCondition(pool, prevTable.schema, prevTable.tableName, schema, joinTable)
      if (joinCondition)
        break
    }

    if (!joinCondition) {
      throw new Error(`No foreign key relationship found for table "${joinTable}"`)
    }

    resolvedJoins.push({
      tableName: joinTable,
      schema,
      joinCondition,
    })

    allTables.push({ schema, tableName: joinTable })
  }

  // Build SELECT clause with table-prefixed column names
  // We use "table.column" alias format: SELECT "base"."col" AS "base.col"
  const allColumns: string[] = []
  const selectExpressions: string[] = []

  // Base table columns
  const baseColsResult = await pool.query<{ column_name: string }>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `, [schema, tableName])

  for (const col of baseColsResult.rows) {
    const colName = `${tableName}.${col.column_name}`
    allColumns.push(colName)
    selectExpressions.push(`"${schema}"."${tableName}"."${col.column_name}" AS "${colName}"`)
  }

  // Join table columns
  for (const join of resolvedJoins) {
    const joinColsResult = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [schema, join.tableName])

    for (const col of joinColsResult.rows) {
      const colName = `${join.tableName}.${col.column_name}`
      allColumns.push(colName)
      selectExpressions.push(`"${schema}"."${join.tableName}"."${col.column_name}" AS "${colName}"`)
    }
  }

  // Build JOIN clauses
  const joinClauses = resolvedJoins.map(j =>
    `LEFT JOIN "${j.schema}"."${j.tableName}" ON ${j.joinCondition}`,
  ).join('\n')

  // Build ORDER BY clause
  let orderByClause = ''
  if (sort) {
    // Sort column might be prefixed or not
    const sortCol = sort.includes('.') ? `"${sort}"` : `"${schema}"."${tableName}"."${sort}"`
    orderByClause = `ORDER BY ${sortCol} ${order === 'desc' ? 'DESC' : 'ASC'}`
  }

  // Count query - just count the base table (joins don't change row count)
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`,
  )
  const totalCount = Number.parseInt(countResult.rows[0].count, 10)

  // Main query
  const mainQuery = `
    SELECT ${selectExpressions.join(', ')}
    FROM "${schema}"."${tableName}"
    ${joinClauses}
    ${orderByClause}
    LIMIT $1 OFFSET $2
  `

  const recordsResult = await pool.query<Record<string, unknown>>(mainQuery, [limit, offset])

  return {
    records: recordsResult.rows,
    totalCount,
    columns: allColumns,
  }
}
