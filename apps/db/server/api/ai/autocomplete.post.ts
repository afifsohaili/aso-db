import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { QueryResult } from '../../shared/types/query'
import { extractStatementAtCursor } from '../../utils/ai-statement'
import { buildSchemaContext, extractTableNames } from '../../utils/ai-schema'
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

function getSystemPrompt(schemaContext: string, referencedTables: string[]): string {
  const tableHint = referencedTables.length > 0
    ? `\nThe user is currently querying these tables: ${referencedTables.join(', ')}.`
    : ''

  return `You are a SQL autocomplete assistant. You MUST complete the partial SQL query using ONLY the columns and tables listed in the schema below.

CRITICAL RULES — FOLLOW EXACTLY:
1. You MUST ONLY use column names that appear in the schema below. NEVER invent or hallucinate columns.
2. You MUST ONLY use table names that appear in the schema below.
3. Return ONLY the SQL snippet that should come next. No explanations, no markdown code blocks, no backticks.
4. Match PostgreSQL syntax exactly.
5. Keep suggestions concise (1-3 lines typically).
6. Do not repeat text that is already present in the user's query.${tableHint}

Available database schema (ONLY these columns exist):
${schemaContext}`
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

    // Build schema context (cached per database URL)
    const pool = getPool()
    const databaseUrl = useRuntimeConfig().databaseUrl as string
    const schemaContext = await buildSchemaContext(
      pool,
      statement.fullStatement,
      maxTokens,
      databaseUrl,
    )

    // Choose provider
    const provider = process.env.ASO_AI_PROVIDER || 'openai-compatible'

    let result: { text: string; usage?: { totalTokens?: number } }

    // Extract table names for the prompt hint
    const referencedTables = extractTableNames(statement.fullStatement)

    const systemPrompt = getSystemPrompt(schemaContext, referencedTables)
    const userPrompt = statement.beforeCursor

    console.log('[AI Backend] === REQUEST BODY ===')
    console.log('[AI Backend] Provider:', provider)
    console.log('[AI Backend] Model:', model)
    console.log('[AI Backend] System prompt length:', systemPrompt.length, 'chars')
    console.log('[AI Backend] User prompt:', userPrompt)
    console.log('[AI Backend] Schema context length:', schemaContext.length, 'chars')
    console.log('[AI Backend] Schema context preview:', schemaContext.slice(0, 200))

    try {
      if (provider === 'anthropic') {
        const { text, usage } = await generateText({
          model: anthropic(model),
          system: systemPrompt,
          prompt: userPrompt,
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
          system: systemPrompt,
          prompt: userPrompt,
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
