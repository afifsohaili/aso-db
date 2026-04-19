import type { RelationInfo } from '../../../../../shared/types/table'
import { getPool } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const schema = getRouterParam(event, 'schema')
  const name = getRouterParam(event, 'name')

  if (!schema || !name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Schema and name are required',
    })
  }

  // Validate identifiers to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(schema) || !/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(name)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid identifier',
    })
  }

  const pool = getPool()

  try {
    // Query for foreign key constraints where this table is the source
    const sourceResult = await pool.query<{
      source_column: string
      target_schema: string
      target_table: string
      target_column: string
    }>(`
      SELECT
        kcu.column_name AS source_column,
        ccu.table_schema AS target_schema,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
      ORDER BY kcu.ordinal_position
    `, [schema, name])

    // Query for foreign key constraints where this table is the target
    const targetResult = await pool.query<{
      source_schema: string
      source_table: string
      source_column: string
      target_column: string
    }>(`
      SELECT
        kcu.table_schema AS source_schema,
        kcu.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.column_name AS target_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = $1
        AND ccu.table_name = $2
      ORDER BY kcu.table_schema, kcu.table_name, kcu.ordinal_position
    `, [schema, name])

    const outgoing: RelationInfo[] = sourceResult.rows.map(row => ({
      sourceSchema: schema,
      sourceTable: name,
      sourceColumn: row.source_column,
      targetSchema: row.target_schema,
      targetTable: row.target_table,
      targetColumn: row.target_column,
    }))

    const incoming: RelationInfo[] = targetResult.rows.map(row => ({
      sourceSchema: row.source_schema,
      sourceTable: row.source_table,
      sourceColumn: row.source_column,
      targetSchema: schema,
      targetTable: name,
      targetColumn: row.target_column,
    }))

    return {
      relations: [...outgoing, ...incoming],
    }
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch relations: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})
