import type { QueryResult } from '../../shared/types/query'
import type { AiAutocompleteEditsResponse } from '../../shared/types/query'
import {
  charToTokenIndex,
  extractStatementAtCursor,
  formatTokensForAi,
  parsePipeEdit,
  tokenizeSql,
  tokenToCharPosition,
} from '../../utils/ai-statement'
import { buildSchemaContext, extractTableNames } from '../../utils/ai-schema'
import { getPool } from '../../utils/db'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

interface AiAutocompleteRequest {
  sql: string
  cursorPosition: number
}

const COST_PER_1K_TOKENS: Record<string, Record<string, number>> = {
  'openai-compatible': {
    'gpt-4o-mini': 0.00015,
    'gpt-4o': 0.0025,
    default: 0.0005,
  },
  anthropic: {
    'claude-sonnet-4-20250514': 0.003,
    'claude-haiku-4-20250514': 0.00025,
    default: 0.0005,
  },
}

function calculateCost(tokensUsed: number, provider: string, model: string): string {
  const providerCosts = COST_PER_1K_TOKENS[provider] || COST_PER_1K_TOKENS['openai-compatible']
  const costPerToken = providerCosts[model] || providerCosts.default
  const cost = (tokensUsed / 1000) * costPerToken
  return `$${cost.toFixed(6)}`
}

function getSystemPrompt(schemaContext: string): string {
  return `You are a SQL autocomplete assistant. You MUST complete the partial SQL query using ONLY the columns and tables listed in the schema below.

CRITICAL RULES — FOLLOW EXACTLY:
1. You MUST ONLY use column names that appear in the schema below. NEVER invent or hallucinate columns.
2. You MUST ONLY use table names that appear in the schema below.
3. Return ONLY pipe-delimited edits. No explanations, no markdown, no backticks.
4. Match PostgreSQL syntax exactly.
5. Keep suggestions concise (1-3 lines typically).
6. Do not repeat text that is already present in the user's query.

EDIT FORMAT (one per line):
index|length|mode|text
- index: starting token index to edit
- length: number of tokens to replace (0 for insert)
- mode: 'r' for replace, 'i' for insert
- text: the replacement text (may contain spaces, no pipes)

EXAMPLE:
Tokens: 0|select 1|* 2|from 3|users
User wants to expand * to columns:
1|1|r|id, email, created_at

EXAMPLE 2:
Tokens: 0|select 1|u. 2|from 3|users
User wants alias expansion:
1|3|r|u.id, u.email from users u

Available database schema (ONLY these columns exist):
${schemaContext}`
}

export default defineEventHandler(
  async (event): Promise<AiAutocompleteEditsResponse | QueryResult[]> => {
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

    // Tokenize the full statement
    const tokens = tokenizeSql(statement.fullStatement)
    const cursorTokenIndex = charToTokenIndex(tokens, cursorPosition - (sql.length - statement.fullStatement.length))

    // Build pipe-delimited token representation
    const tokenizedQuery = formatTokensForAi(tokens)

    // Build the prompt
    const systemPrompt = getSystemPrompt(schemaContext)
    const userPrompt = `Tokenized query (cursor at index ${cursorTokenIndex}):
${tokenizedQuery}

Provide edits:`

    console.log('[AI Backend] === REQUEST BODY ===')
    console.log('[AI Backend] Provider:', process.env.ASO_AI_PROVIDER || 'openai-compatible')
    console.log('[AI Backend] Model:', model)
    console.log('[AI Backend] System prompt length:', systemPrompt.length, 'chars')
    console.log('[AI Backend] User prompt:', userPrompt)
    console.log('[AI Backend] Schema context length:', schemaContext.length, 'chars')
    console.log('[AI Backend] Schema context preview:', schemaContext.slice(0, 200))

    const provider = process.env.ASO_AI_PROVIDER || 'openai-compatible'
    let result: { text: string; usage?: { totalTokens?: number } }

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
    catch (err) {
      console.error('[AI Backend] AI provider error:', err)

      const errorMessage
        = err instanceof Error ? err.message : 'Unknown error'
      const statusCode = errorMessage.includes('401')
        ? 401
        : errorMessage.includes('429')
          ? 429
          : 500

      throw createError({
        statusCode,
        statusMessage: `AI provider error: ${errorMessage}`,
      })
    }

    // Parse pipe-delimited edits
    const edits = parsePipeEdits(result.text)
    console.log('[AI Backend] Parsed edits:', edits.length)

    // Convert token edits to character positions
    const charEdits = edits.map((edit) => {
      const from = tokenToCharPosition(tokens, edit.index)
      const to = tokenToCharPosition(tokens, edit.index + edit.length)
      return {
        from,
        to,
        insert: edit.text,
      }
    })

    // Calculate cost
    const tokensUsed = result.usage?.totalTokens || 0
    const estimatedCost = calculateCost(tokensUsed, provider, model)

    // Compute ghost text suggestion (text from cursor to first unchanged position)
    const cursorInStatement = cursorPosition - (sql.length - statement.fullStatement.length)
    let suggestion = ''
    if (charEdits.length > 0) {
      const firstEdit = charEdits[0]!
      // Ghost text is the inserted text minus any prefix that overlaps with after-cursor text
      suggestion = firstEdit.insert
    }

    console.log('[AI Backend] Returning', charEdits.length, 'edits, suggestion:', suggestion.slice(0, 50))

    return {
      suggestion,
      edits: charEdits,
      duration: Date.now() - startTime,
      tokensUsed,
      estimatedCost,
    }
  },
)

function parsePipeEdits(responseText: string): Array<{ index: number; length: number; mode: 'replace' | 'insert'; text: string }> {
  const edits: Array<{ index: number; length: number; mode: 'replace' | 'insert'; text: string }> = []

  const lines = responseText.trim().split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const edit = parsePipeEdit(trimmed)
    if (edit) {
      edits.push(edit)
    }
  }

  return edits
}
