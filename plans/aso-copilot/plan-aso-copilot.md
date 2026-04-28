# ASO Copilot - AI Autocomplete Feature Plan

## Overview

Add AI-augmented autocomplete (like GitHub Copilot) to the SQL query editor. This is NOT a chat panel—just ghost text suggestions that appear while typing.

## Decisions (Confirmed)

| Aspect            | Decision                                           |
|-------------------|----------------------------------------------------|
| **AI SDK**        | Vercel AI SDK (`ai` package) - production ready, Vue support, 40+ providers |
| **Storage**       | **Env vars only** - no SQLite, no UI override      |
| **Trigger**       | Auto-trigger after 500ms idle                      |
| **Context**       | Names + types only; no sample data for v1          |
| **Provider/Model**| Free text fields (any OpenAI-compatible endpoint)  |
| **Editor Scope**  | Statement at cursor only (not full editor content) |
| **Editor Lib**    | @marimo-team/codemirror-ai (already installed)     |
| **Chat Panel**    | Out of scope for now                               |
| **Anthropic**     | **Day 1 support** via @ai-sdk/anthropic            |
| **Schema format** | **Compact text**, NOT JSON                         |
| **Token cap**     | Controlled by `ASO_AI_MAX_TOKENS` env var          |

## Technical Architecture

### Stack
- **Server:** `ai` package + `@ai-sdk/anthropic` for native Claude + custom OpenAI-compatible provider
- **Client:** `@marimo-team/codemirror-ai` nextEditPrediction extension
- **Storage:** None. Config via env vars only.

### Data Flow

```
User types → 500ms debounce
         ↓
    Extract statement at cursor
         ↓
    POST /api/ai/autocomplete
         ↓
    Build prompt with schema context
         ↓
    Vercel AI SDK → Provider API (OpenAI-compatible OR Anthropic native)
         ↓
    Return {suggestion, cursorOffset, tokensUsed, estimatedCost}
         ↓
    Display ghost text in editor
         ↓
    Show tokens/cost in status bar
         ↓
    Tab to accept / Esc to reject
```

## API Design

### POST /api/ai/autocomplete

**Request:**
```json
{
  "sql": "SELECT * FROM users WHERE ",
  "cursorPosition": 29
}
```

**Response:**
```json
{
  "suggestion": "created_at > NOW() - INTERVAL '1 month'",
  "cursorOffset": 29,
  "duration": 450,
  "tokensUsed": 2340,
  "estimatedCost": "$0.0004"
}
```

**Error Response:**
```json
{
  "error": "AI provider unreachable",
  "code": "PROVIDER_ERROR"
}
```

### GET /api/ai/config

**Response:**
```json
{
  "enabled": true,
  "providerUrl": "https://api.openai.com/v1",
  "model": "gpt-4o-mini",
  "maxTokens": 1500
}
```

> **Note:** No API key exposed. Key is read from env var server-side only.

> **Note:** No POST config endpoint. All settings are env vars only. User must restart the server to change config.

## Environment Variables

```bash
# AI Autocomplete Configuration (all optional)
ASO_AI_ENABLED=true                          # Enable AI autocomplete (default: false)
ASO_AI_PROVIDER_URL=https://api.openai.com/v1 # Provider base URL
ASO_AI_MODEL=gpt-4o-mini                     # Model name
ASO_AI_API_KEY=sk-...                        # API key
ASO_AI_MAX_TOKENS=1500                       # Max tokens for schema context (default: 1500)
```

**Provider-specific env vars:**

For OpenAI-compatible providers (Kimi, GLM, Groq, Ollama, etc.), just set the above.

For Anthropic Claude (native API, not OpenAI-compatible):
```bash
ASO_AI_ENABLED=true
ASO_AI_PROVIDER=anthropic                    # Special value to use native Anthropic SDK
ASO_AI_MODEL=claude-sonnet-4-20250514        # Claude model name
ASO_AI_API_KEY=sk-ant-...                    # Anthropic API key
```

## Schema Context Format (Compact Text)

**NOT JSON.** Compact text representation to minimize tokens:

```
users:id:serial:pk,email:varchar(255):uk,name:varchar(100),created_at:timestamp,updated_at:timestamp
orders:id:serial:pk,user_id:integer:fk→users.id,total:decimal(10,2),status:varchar(50),created_at:timestamp
order_items:id:serial:pk,order_id:integer:fk→orders.id,product_name:varchar(200),quantity:integer,price:decimal(10,2)
```

**Rules:**
- One line per table
- Format: `table:col:type:flags,col:type,...`
- Flags: `pk` = primary key, `uk` = unique, `fk→table.col` = foreign key
- No spaces between commas (saves tokens)
- Types abbreviated where unambiguous (e.g., `varchar(255)` → `varchar` if obvious)

**Token budget:** Controlled by `ASO_AI_MAX_TOKENS` env var (default 1500). Budget is split:
- ~60% for schema context
- ~40% for prompt + system message

**Prioritization:**
1. Tables referenced in current statement (via parsing)
2. Tables joined to referenced tables (FK relationships)
3. Recently used tables from query_history (last 10)
4. Limit total tables by token count, not table count

## Editor Integration

### Using @marimo-team/codemirror-ai

```typescript
import { nextEditPrediction } from '@marimo-team/codemirror-ai'

const aiExtension = nextEditPrediction({
  delay: 500,  // ms after typing stops
  fetchFn: async (state: EditorState) => {
    const cursor = state.selection.main.head
    const sql = state.doc.toString()
    
    const res = await $fetch('/api/ai/autocomplete', {
      method: 'POST',
      body: { sql, cursorPosition: cursor }
    })
    
    if (!res.suggestion) return null
    
    return {
      newText: res.suggestion,
      cursorOffset: res.cursorOffset
    }
  },
  acceptOnClick: true,
  defaultKeymap: true  // Tab to accept, Esc to reject
})
```

### Keymap
- **Tab:** Accept suggestion
- **Escape:** Reject suggestion
- **Click on ghost text:** Accept

## UI Components

### Settings Indicator (Read-Only)

Since config is env var only, the UI only **displays** current config, not editable:

```vue
<template>
  <div class="flex items-center gap-2">
    <!-- Status dot -->
    <div 
      :class="cn(
        'h-2 w-2 rounded-full',
        config.enabled ? 'bg-green-500' : 'bg-gray-400'
      )"
      :title="config.enabled ? 'AI enabled' : 'AI disabled'"
    />
    
    <!-- Token/cost display (always shown if enabled) -->
    <span v-if="lastUsage" class="text-xs text-muted-foreground">
      {{ lastUsage.tokens }}t · {{ lastUsage.cost }}
    </span>
  </div>
</template>
```

### Visual Indicators

- **Ghost text:** Gray/faded text at cursor position
- **Status dot:** 
  - Green: AI enabled and responding
  - Yellow: AI enabled but last request failed
  - Gray: AI disabled
- **Hover tooltip on dot:** "AI enabled" or "AI disabled — set ASO_AI_ENABLED env var"
- **Token/cost:** Always shown in editor toolbar after each suggestion

## Server Implementation

### Route: /api/ai/autocomplete.post.ts

```typescript
import { generateText } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { anthropic } from '@ai-sdk/anthropic'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const { sql, cursorPosition } = await readBody(event)
  
  // Check if AI is enabled
  const enabled = process.env.ASO_AI_ENABLED === 'true'
  if (!enabled) {
    throw createError({ statusCode: 400, message: 'AI not enabled' })
  }
  
  const apiKey = process.env.ASO_AI_API_KEY
  const model = process.env.ASO_AI_MODEL || 'gpt-4o-mini'
  const maxTokens = parseInt(process.env.ASO_AI_MAX_TOKENS || '1500')
  
  // Extract statement at cursor
  const statement = extractStatementAtCursor(sql, cursorPosition)
  
  // Build schema context (compact text format)
  const schemaContext = await buildSchemaContext(statement, maxTokens)
  
  // Choose provider
  const provider = process.env.ASO_AI_PROVIDER || 'openai-compatible'
  
  let result
  if (provider === 'anthropic') {
    // Native Anthropic SDK
    const { text, usage } = await generateText({
      model: anthropic(model),
      system: getSystemPrompt(schemaContext),
      prompt: statement.beforeCursor,
      maxTokens: 150,
      temperature: 0.2
    })
    result = { text, usage }
  } else {
    // OpenAI-compatible (Kimi, GLM, Groq, Ollama, OpenAI, etc.)
    const providerClient = createOpenAICompatible({
      baseURL: process.env.ASO_AI_PROVIDER_URL || 'https://api.openai.com/v1',
      apiKey
    })
    
    const { text, usage } = await generateText({
      model: providerClient(model),
      system: getSystemPrompt(schemaContext),
      prompt: statement.beforeCursor,
      maxTokens: 150,
      temperature: 0.2
    })
    result = { text, usage }
  }
  
  // Calculate cost
  const tokensUsed = result.usage?.totalTokens || 0
  const estimatedCost = calculateCost(tokensUsed, provider, model)
  
  return {
    suggestion: result.text,
    cursorOffset: cursorPosition,
    duration: Date.now() - startTime,
    tokensUsed,
    estimatedCost
  }
})
```

### Statement Extraction

Parse SQL to find which statement contains the cursor:

```typescript
function extractStatementAtCursor(sql: string, cursor: number): {
  beforeCursor: string
  afterCursor: string
  fullStatement: string
} {
  // Split by semicolons, respecting quotes/comments
  const statements = splitStatements(sql)
  
  let currentPos = 0
  for (const stmt of statements) {
    const endPos = currentPos + stmt.length
    if (cursor >= currentPos && cursor <= endPos) {
      const relativeCursor = cursor - currentPos
      return {
        beforeCursor: stmt.slice(0, relativeCursor),
        afterCursor: stmt.slice(relativeCursor),
        fullStatement: stmt
      }
    }
    currentPos = endPos + 1 // +1 for semicolon
  }
  
  // Cursor at end - return last statement
  const lastStmt = statements[statements.length - 1] || ''
  return {
    beforeCursor: lastStmt,
    afterCursor: '',
    fullStatement: lastStmt
  }
}
```

### Schema Context Builder (Compact Text)

```typescript
async function buildSchemaContext(
  statement: string, 
  maxTokens: number
): Promise<string> {
  // Parse statement to extract table names
  const parser = new Parser()
  const ast = parser.astify(statement)
  const tableNames = extractTableNames(ast)
  
  // Get schema info for those tables
  const tables = await listSchema()
  
  // Filter to relevant tables + their related tables
  const relevantTables = filterRelevantTables(tables, tableNames)
  
  // Format compactly (NOT JSON)
  const lines: string[] = []
  let tokenCount = 0
  
  for (const t of relevantTables) {
    const cols = t.columns.map(c => {
      let colStr = `${c.column_name}:${c.data_type}`
      if (c.is_primary_key) colStr += ':pk'
      if (c.is_unique) colStr += ':uk'
      return colStr
    }).join(',')
    
    const fks = t.foreign_keys?.map(fk => 
      `fk→${fk.foreign_table_name}.${fk.foreign_column_name}`
    ).join(',') || ''
    
    const line = `${t.table_name}:${cols}${fks ? ',' + fks : ''}`
    
    // Rough token estimate (1 token ≈ 4 chars)
    const lineTokens = Math.ceil(line.length / 4)
    if (tokenCount + lineTokens > maxTokens) break
    
    tokenCount += lineTokens
    lines.push(line)
  }
  
  return lines.join('\n')
}
```

## Dependencies to Add

```json
{
  "dependencies": {
    "ai": "^4.0.0",
    "@ai-sdk/openai-compatible": "^0.1.0",
    "@ai-sdk/anthropic": "^0.1.0"
  }
}
```

## Implementation Checklist

### Phase 1: Server Setup
- [ ] Install `ai`, `@ai-sdk/openai-compatible`, `@ai-sdk/anthropic`
- [ ] Create `POST /api/ai/autocomplete` endpoint
- [ ] Create `GET /api/ai/config` endpoint (read-only, from env)
- [ ] Implement statement extraction utility
- [ ] Implement compact schema context builder
- [ ] Implement cost calculator
- [ ] Add Anthropic native provider support

### Phase 2: Editor Integration
- [ ] Import `nextEditPrediction` in query-editor.vue
- [ ] Add AI extension to CodeMirror
- [ ] Add status dot + token/cost display to editor toolbar
- [ ] Wire up fetchFn to call API
- [ ] Handle error states (yellow dot on failure)

### Phase 3: Polish
- [ ] Test with multiple providers (OpenAI, Anthropic, Kimi, etc.)
- [ ] Test edge cases (CTEs, dollar-quoted strings)
- [ ] Verify token budget respects ASO_AI_MAX_TOKENS
- [ ] Add client-side caching (last N suggestions in memory)
- [ ] Test multi-line ghost text rendering
- [ ] User hand-adjusts styling

## Resolved Concerns

### 1. API Key Storage Security → RESOLVED
- **Decision:** Env vars only. No SQLite storage.
- **Rationale:** This is a local CLI tool. API keys stay in `.env` file, same as PostgreSQL connection strings. No persistent storage needed.

### 2. Token Budget Management → RESOLVED
- **Decision:** Compact text format (NOT JSON). Cap controlled by `ASO_AI_MAX_TOKENS` env var.
- **Rationale:** Users can override token budget via env var if they're okay with higher costs.

### 4. Multi-Line Suggestions → RESOLVED
- **Decision:** User will hand-adjust styling at the end.
- **Action:** Implement with best default styling, user tweaks at end.

### 8. Cost Awareness → RESOLVED
- **Decision:** Always show tokens/cost in editor toolbar after each suggestion.
- **Implementation:** `tokensUsed` and `estimatedCost` returned by API, displayed in UI.

### 11. Schema Versioning → RESOLVED
- **Decision:** Assume schema doesn't change during session.
- **Rationale:** Schema changes during typing are extremely unlikely. Use existing schema cache from `useSchema` composable.

### 12. Non-OpenAI-Compatible Providers → RESOLVED
- **Decision:** Claude is day 1 support via `@ai-sdk/anthropic`.
- **Implementation:** Detect `ASO_AI_PROVIDER=anthropic`, use native Anthropic SDK instead of OpenAI-compatible wrapper.

## Remaining Concerns

### 3. Statement-at-Cursor Parsing
- Using node-sql-parser to split statements
- **Concern:** Parser may not handle all PostgreSQL syntax correctly
- **Mitigation:**
  - Test with edge cases (CTEs, dollar-quoted strings)
  - Fallback to naive split if parsing fails

### 5. Provider Error Handling
- Different providers return different error formats
- **Concern:** Hard to give helpful error messages
- **Mitigation:** 
  - Catch common errors (401 = bad key, 429 = rate limited, 5xx = provider down)
  - Show generic "AI provider error" with raw message for debugging

### 6. Extension Conflicts
- nextEditPrediction has its own keymap (Tab/Esc)
- **Concern:** May conflict with existing editor keymaps
- **Mitigation:**
  - Test thoroughly with existing keybindings
  - Make accept key configurable in settings

### 7. Disabled State UX
- When AI is disabled, what should user see?
- **Concern:** May be confusing if gear icon exists but nothing works
- **Mitigation:**
  - Show "AI disabled" tooltip on status dot, "AI enabled" if enabled

### 9. Testing
- AI responses are non-deterministic
- **Concern:** Hard to write reliable tests
- **Mitigation:**
  - Mock AI provider in tests
  - Test schema context generation separately
  - Test statement extraction separately
  - E2E tests with mock responses only

### 10. Caching
- Same partial query + schema → same suggestion likely
- **Concern:** Wasted API calls
- **Mitigation:**
  - Consider caching last N suggestions in memory (not persistent)
  - Cache key: hash of (statementPrefix + schemaVersion)

## Cost Estimates (for documentation)

| Provider  | Model           | Input Cost  | Output Cost | Est. per suggestion |
|-----------|-----------------|-------------|-------------|---------------------|
| OpenAI    | gpt-4o-mini     | $0.15/1M    | $0.60/1M    | ~$0.0003            |
| OpenAI    | gpt-4o          | $2.50/1M    | $10/1M      | ~$0.005             |
| Anthropic | Claude Haiku    | $0.25/1M    | $1.25/1M    | ~$0.0005            |
| Anthropic | Claude Sonnet   | $3.00/1M    | $15.00/1M   | ~$0.006             |
| Kimi      | kimi-k2.5       | ~$0.50/1M   | ~$2/1M      | ~$0.001             |

*Assumes ~2K tokens input (schema + prompt), ~50 tokens output*

## Success Criteria

- [ ] Ghost text appears after 500ms of idle typing
- [ ] Tab accepts suggestion, Escape rejects
- [ ] Works with OpenAI-compatible providers (OpenAI, Kimi, GLM, Groq, etc.)
- [ ] Works with native Anthropic provider
- [ ] Schema context stays under token budget
- [ ] Tokens/cost always displayed in UI
- [ ] No visible lag in editor while typing
- [ ] Graceful degradation when provider fails
- [ ] Config is env var only (no persistent storage)

## Future Enhancements (Post-v1)

- Structured output mode (AI returns JSON with explanation + query)
- Chat panel integration (re-use same provider/config)
- Vim mode compatibility for accept/reject keys
- Inline error explanations (select error, ask AI to explain)
- Query optimization suggestions (select query, ask AI to optimize)
- OS keychain storage for API keys (if users request it)
- Cost tracking dashboard
- Per-session token counter
- UI override for config (if users request editable settings)

---

**Status:** COMPLETED - all 8 implementation plans done
**Implementation Date:** 2026-04-28
**Commits:** 8 (one per plan)
**Tests:** 233 passing, 4 pre-existing failures unrelated to changes
