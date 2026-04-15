# ASO-DB Product Specification

## Overview

ASO-DB is an AI-assisted database tool for developers. It is distributed via npm as a CLI that launches a local web interface for writing SQL, exploring schema, inspecting query performance, and optionally using BYOK AI assistance.

**Tagline:** *Your AI pair programmer for SQL*

## Planning Status

This document is a working product + technical planning spec.

- **Locked** = approved product/technical direction
- **TBD** = can be refined later as implementation evolves

## Product Vision

Every developer deserves an intelligent database interface that:
- Understands schema contextually
- Suggests queries in natural language
- Provides instant autocomplete for tables/columns
- Visualizes query performance
- Works locally by default, with AI optional via BYOK hosted providers or local models

## Architecture

```
┌─────────────────────────────────────────┐
│  CLI Entry: npx asodb [connection]      │
│  - Auto-detect common env conventions   │
│  - Parse full Postgres connection str   │
│  - Start Nitro backend                  │
│  - Open browser to localhost:<port>     │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Nitro Backend (localhost, random port)│
│  ├── API: /api/query, /api/schema      │
│  ├── API: /api/explain, /api/ai/chat   │
│  ├── pg driver (Postgres in v1)        │
│  └── Local SQLite (history, metadata)  │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Vite Frontend (Plain TypeScript + DOM)│
│  ├── CodeMirror 6 Editor               │
│  ├── TanStack Table (results)          │
│  ├── Schema Explorer Sidebar           │
│  └── AI Chat Panel                     │
└─────────────────────────────────────────┘
```

## Distribution

```bash
# Install globally
npm install -g asodb

# Preferred: auto-detect from common env files / conventions
npx asodb

# Explicit raw connection string is also supported
npx asodb postgresql://user:pass@localhost:5432/dbname

# Optional port override
npx asodb --port 3333

# Allow write queries (default is read-only)
npx asodb --allow-write
```

### Environment Auto-Detection

ASO-DB should prefer env-based startup in v1.

- Inspect common env files such as `.env`, `.env.local`, `.env.development`
- Try common PostgreSQL env conventions used across Rails, Next.js, Laravel, Django, Prisma, and libpq-based tooling
- Support both URL-style and split-var style detection when possible
- When a CLI argument is supplied, it is always treated as a full PostgreSQL connection string

## Features and Scope (MVP v1.0)

### Locked v1 Decisions
- [x] PostgreSQL only
- [x] Single-statement execution only
- [x] Full-result fetches in v1 (no pagination)
- [x] Query permissions follow the PostgreSQL user used at app launch
- [x] SSH tunneling is out of scope
- [x] Open source under MIT
- [x] No-AI mode must be fully functional

### Core Query Interface
- [ ] CodeMirror 6 SQL editor with syntax highlighting
- [ ] Execute a single SQL statement with `Ctrl+Enter`
- [ ] Display results in TanStack Table (sortable, filterable)
- [ ] Query history (last 100 queries, searchable)
- [ ] Multiple result tabs

### Schema Explorer
- [ ] Sidebar showing all tables
- [ ] Expand to see columns, types, constraints
- [ ] Show indexes and foreign keys
- [ ] Click to insert table/column names into editor
- [ ] Search/filter schema objects

### AI Assistance (BYOK - Bring Your Own Key)
- [ ] Side panel chat interface
  - Natural language to SQL: "Show me all users who signed up last month"
  - Explain query: "What does this query do?"
  - Optimize query: "How can I make this faster?"
  - Schema questions: "Which tables have user_id foreign keys?"
- [ ] Support providers: OpenAI, Anthropic, Google, Ollama (local)
- [ ] API keys stored in OS keychain, never in plaintext

### No-AI Mode (Locked)
- [ ] All core querying, schema exploration, `EXPLAIN`, and history work without AI credentials
- [ ] AI controls are hidden when no provider is configured
- [ ] Local schema-aware autocomplete remains available without any AI provider

### Security & Safety
- [ ] Enforce single-statement execution in v1
- [ ] **Read-only by default**; `--allow-write` CLI flag is required to enable mutating queries
- [ ] App-level query guardrails: block `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`, `TRUNCATE` (and related mutating keywords) unless in write mode
- [ ] Postgres connection uses `default_transaction_read_only=on` in read-only mode as a second layer of accidental protection
- [ ] Visual write-mode warning: fixed red border around the entire page when not in read-only mode
- [ ] Only binds to localhost (`127.0.0.1`)
- [ ] Never send schema/query text to AI unless the user explicitly uses an AI feature
- [ ] Auto-detect common env files and common PostgreSQL env conventions across popular frameworks

### Performance
- [ ] `EXPLAIN` integration - show query plan
- [ ] Query timing (execution time display)
- [ ] Full-result fetches in v1
- [ ] Cancel long-running queries

### Local Storage
- [ ] SQLite metadata database in the user's OS-appropriate app data directory (for example `~/.aso-db/meta.db` on Unix-like systems)
- [ ] Stores: query history, schema metadata cache, user preferences
- [ ] Migration system for schema evolution

## Technical Specifications

### apps/db Structure

```
apps/db/
├── package.json          # Nitro + Vite deps
├── nitro.config.ts       # Nitro server config
├── vite.config.ts        # Frontend build
├── src/
│   ├── server/           # Nitro API routes
│   │   ├── api/
│   │   │   ├── query.post.ts      # Execute SQL
│   │   │   ├── schema.get.ts      # Get schema info
│   │   │   ├── explain.post.ts    # EXPLAIN query
│   │   │   └── ai/
│   │   │       └── chat.post.ts   # AI chat completion
│   │   ├── lib/
│   │   │   ├── db.ts              # DB connection manager
│   │   │   ├── ai.ts              # AI SDK integration
│   │   │   └── env.ts             # Env detection / connection resolution
│   │   └── utils/
│   │       └── schema-cache.ts    # Schema metadata cache
│   └── client/           # Vite frontend
│       ├── index.html
│       ├── main.ts
│       ├── components/
│       │   ├── Editor/
│       │   ├── ResultsTable/
│       │   ├── ResultTabs/
│       │   ├── SchemaExplorer/
│       │   ├── AiChat/
│       │   └── QueryHistory/
│       └── styles/
├── bin/
│   └── asodb.ts          # CLI entry point
└── migrations/           # SQLite schema migrations
```

### Dependencies

**Server (Nitro):**
- `nitropack` - Server framework
- `pg` - PostgreSQL driver
- `ai` + `@ai-sdk/*` - AI SDK for multiple providers
- `better-sqlite3` - Local SQLite (synchronous, fast)
- `keytar` - OS keychain access
- `zod` - Schema validation
- `connection-string` - Connection string parsing

**Client (Vite):**
- `codemirror` + `@codemirror/lang-sql` - Editor
- `@tanstack/table-core` - Table logic

### Support Matrix (v1)

- **Database:** PostgreSQL only
- **Statement execution:** single statement only
- **Results:** full fetch in v1 (no pagination)
- **Permissions:** follow the launched DB user's privileges
- **SSH tunneling:** out of scope
- **MySQL/MariaDB:** post-v1
- **AI:** optional BYOK; app remains fully usable without AI

### CodeMirror 6 Setup

```ts
// Editor features needed:
// - @codemirror/lang-sql (SQL syntax, basic autocomplete)
// - @codemirror/autocomplete (extensible completion)
// - @codemirror/lint (error underlining)
// - @codemirror/theme-one-dark (default theme)
// - Custom completion source: schema tables/columns
```

### TanStack Table Setup

```ts
// Using @tanstack/table-core (headless)
// Build our own UI with:
// - Virtual scrolling for large rendered result sets
// - Column sorting (click headers)
// - Column filtering (per-column search)
// - Row selection (for copying)
// - Copy to clipboard (selected rows/cells)
```

### AI Integration (ai SDK)

```ts
// Server-side AI route
import { generateText, streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'

// Providers supported:
// - openai (gpt-4, gpt-4o-mini)
// - anthropic (claude-3-5-sonnet, claude-3-haiku)
// - google (gemini-pro)
// - ollama (local models)

// v1 scope:
// - chat mode streams responses
// - no inline ghost completion in v1
```

### Connection and Launch Model

```ts
interface CliArgs {
  connection?: string     // Full PostgreSQL connection string
  port?: number           // Server port (random if not specified)
  'no-open'?: boolean     // Don't auto-open browser
  'allow-write'?: boolean // Disable read-only protections (default: false)
  'ai-provider'?: string  // Default AI provider
  'ai-model'?: string     // Default AI model
}

// Connection resolution priority:
// 1. CLI argument: npx asodb postgresql://...
// 2. Auto-detect from common env files / conventions
// 3. Interactive prompt (if TTY available)

// Storage:
// - Local metadata DB: OS-appropriate app data path
// - AI API keys: OS keychain via keytar
// - DB connection strings are not persisted in v1
```

### Query Execution Model (Locked)

- Each run executes exactly one SQL statement; multi-statement input is rejected in v1
- v1 returns the full result set for successful executions; no pagination
- Each execution is request-scoped; multi-statement transaction scripts are out of scope for v1
- Query permissions follow the PostgreSQL user used at launch
- Long-running queries need timeout + cancellation support
- `EXPLAIN` is supported; `EXPLAIN ANALYZE` requires extra care because it executes the query

### Security & Privacy Model (Locked)

- Backend binds only to `127.0.0.1`
- AI calls are opt-in; no schema/query leaves the machine unless the user explicitly invokes an AI feature
- Docs/onboarding should prefer env files over raw connection strings copied into shell history
- CLI connection input, when supplied, is always a full PostgreSQL connection string

## UI Design (Different from Marketing Site)

**Brand:** ASO-DB (tool) vs ASO (marketing)
- Dark theme by default (developer tool aesthetic)
- VS Code-like layout: sidebar | editor | results | chat panel
- Compact, information-dense UI
- Keyboard-first navigation

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ASO-DB    [Connection: localhost:5432/myapp]   [Settings ⚙] │
├──────────┬──────────────────────────────────┬───────────────┤
│          │ [Tab 1] [Tab 2]                 │ AI CHAT       │
│ SCHEMA   │ ┌────────────────────────────┐  │               │
│          │ │ SELECT * FROM users        │  │ How can I...  │
│ ▼ users  │ │ WHERE created_at > NOW()   │  │               │
│   id     │ │                            │  │ [Send]        │
│   email  │ │                            │  │               │
│   name   │ └────────────────────────────┘  │               │
│          │                                  │               │
│ ▶ orders │ ┌────────────────────────────┐  │               │
│ ▶ items  │ │ Results (243 rows)         │  │               │
│ [🔍]     │ │ id │ email      │ name    │  │               │
│          │ │ 1  │ a@b.com    │ Alice   │  │               │
│          │ │ 2  │ b@c.com    │ Bob     │  │               │
│          │ └────────────────────────────┘  │               │
│          │ [History] [Explain]             │               │
└──────────┴──────────────────────────────────┴───────────────┘
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `apps/db/` package structure
- [ ] Set up Nitro server with basic routes
- [ ] Set up Vite client build
- [ ] CLI entry point with argument parsing
- [ ] PostgreSQL connection support
- [ ] Env auto-detection baseline
- [ ] Basic query execution endpoint

### Phase 2: Editor & Results (Week 2)
- [ ] CodeMirror 6 integration with SQL mode
- [ ] TanStack Table for results display
- [ ] Multiple result tabs
- [ ] Query execution flow: Editor → API → Results
- [ ] Schema fetching endpoint
- [ ] Basic schema explorer sidebar
- [ ] Local schema-aware autocomplete

### Phase 3: AI Integration (Week 3)
- [ ] AI SDK setup with multiple providers
- [ ] Chat panel UI
- [ ] AI chat endpoint (streaming)
- [ ] API key management (keytar integration)

### Phase 4: Polish (Week 4)
- [ ] Single-statement validation
- [ ] `EXPLAIN` integration
- [ ] Query history (SQLite)
- [ ] OS keychain integration
- [ ] Long-running query cancellation
- [ ] Expand env auto-detection across common framework conventions

### Phase 5: Release (Week 5)
- [ ] Documentation
- [ ] README with examples
- [ ] npm package publishing setup
- [ ] Testing on multiple OS
- [ ] Marketing site updates (`apps/web`)

### Post-v1 / Future Work

- [ ] MySQL support
- [ ] SSH tunneling
- [ ] Data visualization / charts
- [ ] Ghost text inline suggestions
- [ ] Connection profiles
- [ ] Localhost API origin/session protections
- [ ] Large-result optimizations beyond full fetch

## Monorepo Integration

### Shared Packages

**packages/shared:**
- Add types for: `QueryResult`, `SchemaInfo`, `ConnectionConfig`
- Share between `apps/db` server and client

**packages/components:**
- No shared component layer required for v1
- `apps/db` uses plain TypeScript + DOM
- Shared UI abstractions can be revisited later if duplication appears

### apps/web Updates (Marketing)

Post-MVP:
- [ ] Landing page for ASO-DB tool
- [ ] Feature highlights with GIFs/demos
- [ ] Documentation section
- [ ] Download / installation instructions
- [ ] Changelog

## Open Questions / Future Considerations

1. **Export formats:** CSV, JSON, SQL INSERT statements?
2. **Query sharing:** local export only, or cloud sync later?
3. **Collaboration:** explicitly out of scope forever, or revisit later?
4. **Vim mode:** for CodeMirror?
5. **Dark/light theme toggle:** or dark-only first?
6. **Keyboard shortcuts:** customizable?
7. **Plugin system:** extensible architecture?
8. **Data visualization:** charts/graphs for query results?

## Success Metrics

- [ ] CLI installs via npm
- [ ] Active daily users (telemetry opt-in)
- [ ] AI feature usage rate
- [ ] GitHub stars
- [ ] Community Discord/Slack growth

## Branding Notes

- **Product name:** ASO-DB
- **CLI command:** `asodb`
- **NPM package:** `asodb`
- **Marketing site:** aso-db.dev (or aso.db subdomain)
- **Logo:** database cylinder + AI spark/brain element
- **Tagline:** "Your AI pair programmer for SQL"

---

**Status:** Revised planning draft - aligned with current v1 decisions
**Last Updated:** 2026-04-15
**Next Step:** Begin Phase 1 when approved; refine post-v1 features as implementation evolves
