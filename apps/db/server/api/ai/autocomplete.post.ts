import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { QueryResult } from '../../shared/types/query'
import { extractStatementAtCursor } from '../../utils/ai-statement'
import { buildSchemaContext } from '../../utils/ai-schema'
import { getPool } from '../../utils/db'

export interface AiAutocompleteRequest {
  sql: string
  cursorPosition: number
}

export interface AiAutocompleteResponse {
  suggestion: string
  cursorOffset: number
  duration: number
  tokensUsed: number
  estimatedCost: string
}

const COST_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  'openai:gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai:gpt-4o': { input: 2.5, output: 10 },
  'anthropic:claude-haiku': { input: 0.25, output: 1.25 },
  'anthropic:claude-sonnet': { input: 3.0, output: 15.0 },
}

function calculateCost(
  tokensUsed: number,
  provider: string,
  model: string,
): string {
  const key = `${provider}:${model}`
  const costs = COST_PER_MILLION_TOKENS[key]

  if (!costs) {
    // Fallback: estimate at $0.50/1M input + $2/1M output
    const estimated = (tokensUsed / 1_000_000) * 1.25
    return `$${estimated.toFixed(6)}`
  }

  // Assume 80% input, 20% output for simplicity
  const inputTokens = tokensUsed * 0.8
  const outputTokens = tokensUsed * 0.2
  const cost
    = (inputTokens / 1_000_000) * costs.input
    + (outputTokens / 1_000_000) * costs.output

  return `$${cost.toFixed(6)}`
}

function getSystemPrompt(schemaContext: string): string {
  return `You are a SQL autocomplete assistant. Given a partial SQL query and database schema, suggest the next part of the query.

Database schema (compact format: table:col:type:flags):
${schemaContext}

Rules:
- Return ONLY the SQL snippet that should come next. No explanations.
- Match the SQL dialect (PostgreSQL).
- Use exact column and table names from the schema.
- Keep suggestions concise (1-3 lines typically).`
}

export default defineEventHandler(
  async (event): Promise<AiAutocompleteResponse | QueryResult[]> => {
    const startTime = Date.now()

    // Check if AI is enabled
    const enabled = process.env.ASO_AI_ENABLED === 'true'
    console.log('[AI Backend] enabled check:', enabled, 'env:', process.env.ASO_AI_ENABLED)
    if (!enabled) {
      throw createError({
        statusCode: 400,
        statusMessage: 'AI autocomplete is not enabled',
      })
    }

    const apiKey = process.env.ASO_AI_API_KEY
    if (!apiKey) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ASO_AI_API_KEY is not set',
      })
    }

    const model = process.env.ASO_AI_MODEL || 'gpt-4o-mini'
    const maxTokens = parseInt(
      process.env.ASO_AI_MAX_TOKENS || '1500',
      10,
    )

    const { sql, cursorPosition } = await readBody<AiAutocompleteRequest>(
      event,
    )
    console.log('[AI Backend] Request received, cursor:', cursorPosition, 'sql length:', sql.length)

    // Extract statement at cursor
    const statement = extractStatementAtCursor(sql, cursorPosition)
    console.log('[AI Backend] Statement before cursor:', statement.beforeCursor.slice(-50))

    // Build schema context
    const pool = getPool()
    const schemaContext = await buildSchemaContext(
      pool,
      statement.fullStatement,
      maxTokens,
    )

    // Choose provider
    const provider = process.env.ASO_AI_PROVIDER || 'openai-compatible'

    let result: { text: string; usage?: { totalTokens?: number } }

    try {
      if (provider === 'anthropic') {
        const { text, usage } = await generateText({
          model: anthropic(model),
          system: getSystemPrompt(schemaContext),
          prompt: statement.beforeCursor,
          maxTokens: 150,
          temperature: 0.2,
        })
        result = { text, usage }
      }
      else {
        const providerClient = createOpenAICompatible({
          baseURL:
            process.env.ASO_AI_PROVIDER_URL
            || 'https://api.openai.com/v1',
          apiKey,
        })

        const { text, usage } = await generateText({
          model: providerClient(model),
          system: getSystemPrompt(schemaContext),
          prompt: statement.beforeCursor,
          maxTokens: 150,
          temperature: 0.2,
        })
        result = { text, usage }
      }
    }
    catch (error) {
      // Map common errors
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          throw createError({
            statusCode: 401,
            statusMessage: 'Invalid API key',
          })
        }
        if (error.message.includes('429')) {
          throw createError({
            statusCode: 429,
            statusMessage: 'Rate limited by AI provider',
          })
        }
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'AI provider error',
        cause: error,
      })
    }

    // Calculate cost
    const tokensUsed = result.usage?.totalTokens || 0
    const estimatedCost = calculateCost(tokensUsed, provider, model)

    console.log('[AI Backend] Returning suggestion, length:', result.text.length)

    return {
      suggestion: result.text,
      cursorOffset: cursorPosition,
      duration: Date.now() - startTime,
      tokensUsed,
      estimatedCost,
    }
  },
)
