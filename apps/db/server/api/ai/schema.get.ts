import { buildSchemaContext } from '../../utils/ai-schema'
import { getPool } from '../../utils/db'

export interface AiSchemaResponse {
  schema: string
  tables: number
}

export default defineEventHandler(async (): Promise<AiSchemaResponse> => {
  const maxTokens = parseInt(
    process.env.ASO_AI_MAX_TOKENS || '1500',
    10,
  )

  const pool = getPool()
  const databaseUrl = useRuntimeConfig().databaseUrl as string

  // Build full schema context (empty statement = no prioritization, all tables)
  const schemaContext = await buildSchemaContext(
    pool,
    '',
    maxTokens,
    databaseUrl,
  )

  const tables = schemaContext.split('\n').filter(Boolean).length

  return {
    schema: schemaContext,
    tables,
  }
})
