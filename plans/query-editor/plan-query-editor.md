# Query Editor + Query History Implementation Plan

## Gathered Context

### Current State
- `apps/db` is a Nuxt 4 app with Nitro backend
- PostgreSQL connection exists via `pg.Pool` singleton in `server/utils/db.ts`
- Existing UI: table overview grid, table detail viewer with pagination/sorting, command palette (⌘K)
- Existing API routes: `GET /api/tables`, `GET /api/tables/:schema/:name`
- Dark theme Tailwind UI already established
- Test infrastructure: vitest with unit, nuxt (component), and e2e projects
- E2e tests use `@nuxt/test-utils/e2e` with `TEST_HOST` support

### What's Missing
- No query execution endpoint (`/api/query`)
- No SQLite/local metadata database
- No query editor component
- No query history UI or persistence layer
- No SQL statement parsing/splitting logic
- No CodeMirror or other editor dependency

---

## Decisions

### 1. SQLite Library Choice → Nitro Built-in Database Layer
- Nitro has experimental built-in database support via `useDatabase()`
- Enable `experimental.database: true` in `nuxt.config.ts` (Nitro config)
- Uses `node:sqlite` (Node 22+) or falls back automatically
- No extra package dependencies needed
- API style: `db.sql\`SELECT * FROM queries WHERE id = ${id}\`` or `db.exec(rawSql)`
- Default storage path: `.data/db.sqlite`

### 2. Multiple Queries → Allow All Statements
- User explicitly wants to allow all statements in multi-query mode
- We will split semicolon-separated statements and execute them sequentially
- Each statement gets its own result set or error
- DDL (CREATE/DROP/ALTER) and DML (INSERT/UPDATE/DELETE) allowed
- Will provide "Run All" button and "Run Selected" (if text selected)

### 3. Editor Library → CodeMirror 6
- CodeMirror 6 is the best choice for future AI ghost-text autocomplete
- `@marimo-team/codemirror-ai` provides `nextEditPrediction()` which renders ghost text inline (like VS Code Copilot)
- `@codemirror/lang-sql` provides SQL syntax highlighting and basic autocomplete
- Lightweight, headless, and extensible
- Dependencies to add: `codemirror`, `@codemirror/lang-sql`, `@codemirror/autocomplete`, `@codemirror/view`, `@codemirror/state`, `@codemirror/theme-one-dark`, `@marimo-team/codemirror-ai`

### 4. Data Model → One Big Editor with Semicolon-Separated Statements
- Single editor instance storing multiple semicolon-separated queries
- The entire editor content is the "current session"
- Auto-save the current editor content to local SQLite every few seconds or on blur
- Saved as `current_session` record (or similar)
- No tabs for v1

### 5. History Model → Separate Recent Executions and Saved Queries
- **Recent Executions**: Auto-logged on every successful or failed run. Stores SQL content, execution time, timestamp, row count/error message.
- **Saved Queries**: Manual favorites. User can star a recent execution to promote it to Saved Queries, or save directly from the editor.
- Saved Queries have a title. Recent Executions do not (display truncated SQL as title).

### 6. SQL Parser → node-sql-parser
- Pure JavaScript, no native bindings
- 771k+ weekly downloads, built-in TypeScript support
- Explicitly supports multiple statements separated by semicolons
- PostgreSQL support via `{ database: 'Postgresql' }` option
- Usage: `const ast = parser.astify(sql, { database: 'Postgresql' })` returns array for multiple statements
- Can also convert AST back to SQL with `parser.sqlify(ast)`

### 7. Route → `/query`
- New dedicated route `/query`
- Add to navigation/header alongside Overview
- Full-page layout: sidebar (history + saved queries) | editor | results panel

---

## Identified Gaps (Technical)

1. **Nitro Config:** Enable `experimental.database: true`
2. **Dependency:** Add CodeMirror 6 + SQL language + `@marimo-team/codemirror-ai`
3. **Dependency:** Add `node-sql-parser`
4. **Database:** Create initial SQLite migration for local metadata schema
5. **API:** Create `POST /api/query/execute` endpoint
6. **API:** Create `GET /api/query/history` endpoint (recent executions)
7. **API:** Create `POST /api/query/history/:id/star` endpoint (promote to saved query)
8. **API:** Create `GET /api/query/saved` endpoint
9. **API:** Create `POST /api/query/saved` endpoint
10. **API:** Create `PUT /api/query/saved/:id` endpoint
11. **API:** Create `DELETE /api/query/saved/:id` endpoint
12. **Shared Types:** Define types for `QueryResult`, `QueryExecution`, `SavedQuery`, `ExecuteQueryRequest`
13. **Frontend:** Create `QueryEditor.vue` component with CodeMirror 6
14. **Frontend:** Create `QueryHistorySidebar.vue` component
15. **Frontend:** Create `QueryResults.vue` component (multiple result sets)
16. **Frontend:** Create `pages/query.vue` page
17. **Frontend:** Update navigation in `default.vue` to link to `/query`
18. **Tests:** E2e tests for query execution
19. **Tests:** Unit tests for SQL statement splitting with `node-sql-parser`
20. **Tests:** E2e tests for saved queries CRUD and starring

---

## SQLite Schema Design

```sql
-- Saved Queries (manual favorites)
CREATE TABLE saved_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  sql_content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Query History (auto-logged executions)
CREATE TABLE query_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sql_content TEXT NOT NULL,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER,
  row_count INTEGER,
  error_message TEXT,
  saved_query_id INTEGER REFERENCES saved_queries(id) ON DELETE SET NULL
);

-- Current Session (auto-saved editor state)
CREATE TABLE query_sessions (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  sql_content TEXT NOT NULL DEFAULT '',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Design

### POST /api/query/execute
Request:
```json
{
  "sql": "SELECT * FROM users; INSERT INTO logs VALUES (1);",
  "selectedSql": null
}
```

Response:
```json
{
  "results": [
    {
      "index": 0,
      "sql": "SELECT * FROM users",
      "success": true,
      "columns": ["id", "email"],
      "rows": [...],
      "rowCount": 5,
      "durationMs": 12
    },
    {
      "index": 1,
      "sql": "INSERT INTO logs VALUES (1)",
      "success": true,
      "columns": [],
      "rows": [],
      "rowCount": 1,
      "durationMs": 5
    }
  ]
}
```

### GET /api/query/history
Response:
```json
{
  "history": [
    {
      "id": 1,
      "sqlContent": "SELECT * FROM users",
      "executedAt": "2026-04-14T10:00:00Z",
      "durationMs": 12,
      "rowCount": 5,
      "savedQueryId": null
    }
  ]
}
```

### POST /api/query/history/:id/star
Response:
```json
{
  "savedQuery": { "id": 2, "title": "SELECT * FROM users", "sqlContent": "SELECT * FROM users" }
}
```

### GET /api/query/saved
Response: list of `SavedQuery`

### POST /api/query/saved
Request: `{ "title": "My Query", "sqlContent": "SELECT ..." }`

### PUT /api/query/saved/:id
Request: `{ "title": "Updated", "sqlContent": "SELECT ..." }`

### DELETE /api/query/saved/:id
Response: 204

---

## UI Layout ( `/query` )

```
┌─────────────────────────────────────────────────────────────┐
│  ASO-DB    [Overview] [Query]                    [Settings] │
├──────────┬──────────────────────────────────┬───────────────┤
│          │                                  │               │
│ SAVED    │  ┌────────────────────────────┐  │  RESULTS      │
│ [+ New]  │  │ SELECT * FROM users        │  │               │
│          │  │ WHERE id > 10;             │  │  Result #1    │
│ [⭐] Q1  │  │                              │  │  ┌────┬────┐  │
│ [⭐] Q2  │  │                              │  │  │ id │name│  │
│          │  └────────────────────────────┘  │  │ 1  │Alice│  │
│ ─────────┤                                  │  └────┴────┘  │
│ HISTORY  │  [Run All] [Run Selected]       │  Result #2    │
│          │  [Save]                         │  1 row affected│
│ 10:00    │                                  │               │
│ SELECT.. │                                  │               │
│ 09:55    │                                  │               │
│ INSERT.. │                                  │               │
│          │                                  │               │
└──────────┴──────────────────────────────────┴───────────────┘
```

---

## Remaining Open Questions

None at this time. Plan is ready for implementation on go-ahead.

## Implementation Order (Recommended)

1. Enable Nitro experimental database + create SQLite migrations
2. Add dependencies (CodeMirror 6, node-sql-parser)
3. Build backend APIs (`/api/query/*`)
4. Build frontend components (`QueryEditor`, `QueryResults`, `QueryHistorySidebar`)
5. Wire up `/query` page
6. Update navigation
7. Write tests
