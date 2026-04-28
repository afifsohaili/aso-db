export interface AiConfigResponse {
  enabled: boolean
  providerUrl?: string
  provider?: string
  model?: string
  maxTokens?: number
}

export default defineEventHandler((): AiConfigResponse => {
  const enabled = process.env.ASO_AI_ENABLED === 'true'

  return {
    enabled,
    providerUrl: process.env.ASO_AI_PROVIDER_URL,
    provider: process.env.ASO_AI_PROVIDER,
    model: process.env.ASO_AI_MODEL,
    maxTokens: process.env.ASO_AI_MAX_TOKENS
      ? Number.parseInt(process.env.ASO_AI_MAX_TOKENS, 10)
      : undefined,
  }
})
