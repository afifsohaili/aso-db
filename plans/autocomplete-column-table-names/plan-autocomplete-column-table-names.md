# Plan: Populating Table and Column Names for Autocomplete

## Status
**✅ Implemented. See git log for commits.**

---

## Goal
Enable schema-aware autocomplete for table names and column names in the SQL editor (`query-editor.vue`) inside `apps/db/`.

---

## Current State (Gathered)

### Frontend
- **Editor:** `app/components/query-editor.vue`
  - Uses CodeMirror 6 with `@codemirror/lang-sql` (`sql()`), `oneDark`, `basicSetup`
  - Currently **no custom autocomplete** extensions configured
  - Props: `modelValue`, `loading`, `readOnly`
  - Editor instance is created in `onMounted` and destroyed in `onUnmounted`
- **Page:** `app/pages/query.vue`
  - Already fetches `TableInfo[]` from `/api/tables` for the command palette
  - Does **not** pass schema/column info into `QueryEditor`
  - Uses resizable panels (sidebar, editor, results area)
  - Has inline command palette (`@codemirror/commands`)
- **Composables:** None exist yet (`app/composables/` does not exist)
- **Toast/Notifications:** No shared toast system. Only a custom inline toast in `table/[schema]/[name].vue`. No shadcn toast/sonner components installed.

### Backend
- **DB utility:** `server/utils/db.ts`
  - `getPool(): Pool` — singleton `pg` Pool from `NUXT_DATABASE_URL`
  - `listTables(pool)` — queries `information_schema.tables`, returns `{ schema, name }[]` for BASE TABLE only, excludes system schemas
  - `isLocalhost(url: string): boolean` — already exists! Checks localhost, 127.0.0.1, ::1
  - No `listColumns()` or `listSchema()` helper exists yet
- **API endpoints:**
  - `GET /api/tables` → `{ tables: TableInfo[] }` (calls `listTables()` directly)
  - `GET /api/tables/[schema]/[name]` → table records + columns array
  - **No dedicated endpoint** to fetch all columns for all tables efficiently
- **Local SQLite:** `server/utils/query-db.ts`
  - Uses Nitro `experimental.database` (`useDatabase()`)
  - Existing tables: `saved_queries`, `query_history`, `query_sessions`
  - **No schema cache table** exists yet
  - All data is keyed by `database_url_hash` (SHA256 hash)
  - Migrations are idempotent (`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` for legacy changes)
- **Migrations:** `server/plugins/query-db-migrate.ts` runs `migrateQueryDatabase()` on startup

### Types
- `shared/types/table.ts`:
  - `TableInfo { schema: string, name: string }`
  - `TableRecord { [key: string]: unknown }`
  - `FetchTableRecordsResult { records, totalCount, columns: string[] }`
  - `RelationInfo { sourceSchema, sourceTable, sourceColumn, targetSchema, targetTable, targetColumn }`
  - No `ColumnInfo` or `SchemaCache` types yet
- `packages/shared/types.d.ts`:
  - Auto-generated Kysely types for `apps/web` database (users, accounts, etc.)
  - Not currently used by `apps/db`

### Dependencies
- `@codemirror/lang-sql` ^6.10.0 — provides `sql(config)` with built-in `schema` completion support
- `@codemirror/autocomplete` ^6.20.1 — for custom `CompletionSource` if needed
- `@marimo-team/codemirror-ai` ^0.3.7 — installed for future AI features (separate concern)

### Testing
- 3 test projects: `unit`, `nuxt`, `e2e`
- E2E tests use `setupE2E()` from `./utils`, create test tables via `pg` Pool, assert JSON responses
- Existing e2e coverage: `tables.get.spec.ts`, `query.post.spec.ts`, etc.

---

## Design Decisions

### 1. CodeMirror Autocomplete Approach
**Decision:** Use `@codemirror/lang-sql`'s built-in `schema` config passed to `sql({ schema: ... })` only.

Rationale:
- Minimal custom code — just map fetched schema data to the expected shape.
- Handles table name completion and context awareness natively (columns after `table.`, tables after `FROM`).
- No custom CompletionSource needed.
- Multiple completion sources can coexist in CodeMirror for future AI features.

### 2. Data Fetching Strategy
**Requirement:** Fetch all tables + all columns upfront, cache in SQLite.

**Proposed flow:**
1. Page/editor requests schema via `useSchema()` composable.
2. Backend checks local SQLite schema cache first.
3. If cache is stale/missing, query PostgreSQL `information_schema` in a single query to get all tables + all columns, populate cache, return fresh data.
4. If live query fails, return stale cache if available. If no stale cache, return empty array with toast notification.

### 3. API Endpoint

#### GET /api/schema
Returns all tables + all columns in one response.

```ts
{
  tables: {
    schema: string
    name: string
    columns: string[]  // just column names, no types
  }[]
}
```

Note: includes `views` (table_type = 'VIEW') alongside tables. `public` schema only (v1 constraint).

### 4. Schema Cache Table
**Decision:** Use `schema_metadata` (single JSON row per database URL) — stores tables + columns.

Add to local SQLite (`query-db.ts`):
```sql
CREATE TABLE IF NOT EXISTS schema_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  database_url_hash TEXT NOT NULL UNIQUE,
  tables_json TEXT NOT NULL, -- JSON array of {schema, name, columns: string[]}
  updated_at TEXT NOT NULL
);
```

### 5. Frontend Integration
- Create a `useSchema()` composable in `app/composables/` that calls `/api/schema`.
- Pass fetched schema object to `query-editor.vue` as a new prop, e.g. `schema`.
- In `query-editor.vue`, use a CodeMirror `Compartment` for the `sql()` extension so we can `reconfigure()` it when schema data arrives asynchronously.
- Map the response into the `SQLConfig.schema` shape:
  ```ts
  {
    public: {
      users: ['id', 'email', 'name'],
      orders: ['id', 'user_id', 'total'],
    }
  }
  ```
- No custom CompletionSource needed — `@codemirror/lang-sql` handles column completion after `table.` natively.

### 6. URL Parsing Utility
**Status:** Already exists in `server/utils/db.ts` as `isLocalhost(url)`.
- Covers: `localhost`, `127.0.0.1`, `::1`
- **Missing:** `*.local` domains
- **Action:** Extend `isLocalhost()` to include `*.local` hosts, or create a new `isLocalDatabase(url)` wrapper.

---

## Decisions (Resolved)

1. **Cache table shape:** ✅ `schema_metadata` (single JSON row per database URL, stores tables + columns)
2. **Cache TTL:** ✅ Differentiated by host
   - **5 minutes** for localhost / 127.0.0.1
   - **4 hours** for production databases
   - Use existing `isLocalhost()` + add `*.local` support
3. **Refresh strategy:** ✅ Block until live data fetched if cache is stale
4. **Schema scope:** ✅ `public` schema only (hard v1 constraint)
5. **API endpoint:** ✅ `GET /api/schema` (all tables + all columns)
6. **AI compatibility:** ✅ `@codemirror/lang-sql` built-in `schema` config only — no custom CompletionSource
7. **Column types in dropdown:** ❌ No — keep it simple, just column names
8. **Column fetching:** ❌ No lazy-loading — fetch all columns upfront in single query
9. **Cache invalidation on DDL:** Manual only for v1 (page refresh)
10. **Error handling UX:** Toast notification on schema fetch failure
11. **Shared types:** Add to `packages/shared/` (no harm, reusable)
12. **Toast system:** Use shadcn-vue Toast component (install if not present)
13. **Multi-schema:** Hard v1 constraint — `public` only
14. **`/api/tables` refactor:** ✅ Reuse schema cache internally

---

## Gap Decisions

| # | Gap | Decision |
|---|-----|----------|
| 1 | No-cache + DB down | Return `[]` with toast notification |
| 2 | Views in autocomplete | ✅ Yes, include views alongside tables |
| 3 | Column labels | ❌ No types in dropdown (keep simple) |
| 4 | Frontend composable | Create `useSchema()` composable in `app/composables/` |
| 5 | Editor initial state | Use `Compartment` for `sql()` extension; reconfigure when tables arrive |
| 6 | Cache invalidation on DDL | Manual only for v1 (page refresh) |
| 7 | Error handling UX | Toast notification on schema fetch failure |
| 8 | Column fetching | Fetch all columns upfront in single query |
| 9 | Shared types | Add `SchemaInfo` type to `packages/shared/` |
| 10 | URL parsing | Extend existing `isLocalhost()` to include `*.local` |
| 11 | `/api/tables` | Refactor to read from schema cache instead of live query |
| 12 | Toast component | Install/use shadcn-vue Toast if not present |

---

## Implementation Outline (Draft)

### Backend
1. **Migration:** Add `schema_metadata` table to `query-db.ts` migrations.
2. **DB utility:** Add `listSchema(pool)` to `server/utils/db.ts` — single query to get all tables + all columns from `information_schema` for `public` schema, returns `{ schema, name, columns: string[] }[]`.
3. **URL utility:** Extend `isLocalhost()` to include `*.local` domains.
4. **API endpoint:** Create `server/api/schema.get.ts`:
   - Read `database_url_hash` from runtime config.
   - Check SQLite `schema_metadata` for cached data.
   - If stale/missing, call `listSchema()`, insert into SQLite, return.
   - On DB error, return stale cache if available, else `[]`.
5. **Refactor:** Update `server/api/tables.get.ts` to read from schema cache instead of calling `listTables()` directly.
6. **Shared types:** Add `SchemaInfo` type to `packages/shared/`.
7. **Tests:** Add e2e test for `/api/schema`.

### Frontend
1. **Composable:** Create `app/composables/useSchema.ts` that calls `/api/schema`.
2. **Query page:** Use `useSchema()` in `app/pages/query.vue`.
3. **Editor component:**
   - Add `schema` prop to `query-editor.vue`.
   - Introduce a `Compartment` for the SQL language extension.
   - When `schema` prop changes, reconfigure `sql()` with the mapped schema:
     ```ts
     {
       [schemaName]: {
         [tableName]: ['col1', 'col2', ...]
       }
     }
     ```
4. **Toast:** Install `shadcn-vue` Toast if needed; use it for schema fetch errors.
5. **Tests:** Add component test verifying autocomplete config is updated when schema prop changes.

---

## Implementation Summary

### Commits
1. `1183a84` — Backend: schema cache, `listSchema()`, `/api/schema`, refactored `/api/tables`
2. (second commit) — Shared types: `SchemaTableInfo`, `SchemaResponse` in `@monorepo/shared/schema`
3. `1183a84` — Frontend: `useSchema()`, `QueryEditor.schema` prop, `Compartment`, `query.vue` integration

### Files Changed
- `apps/db/server/utils/query-db.ts` — Added `schema_metadata` table migration + `getSchemaCache()`/`setSchemaCache()` helpers
- `apps/db/server/utils/db.ts` — Added `listSchema()`, extended `isLocalhost()` for `*.local`
- `apps/db/server/api/schema.get.ts` — New endpoint with TTL cache logic (5min local / 4h prod)
- `apps/db/server/api/tables.get.ts` — Refactored to read from schema cache
- `packages/shared/schema.ts` — New `SchemaTableInfo`/`SchemaResponse` types
- `packages/shared/package.json` — Added `./schema` export
- `apps/db/app/composables/useSchema.ts` — New composable calling `/api/schema`, mapping to CodeMirror shape
- `apps/db/app/components/query-editor.vue` — Added `schema` prop, `Compartment` for dynamic reconfigure
- `apps/db/app/pages/query.vue` — Integrated `useSchema()`, passes schema to editor, shows error alert
- `apps/db/test/e2e/schema.get.spec.ts` — New e2e tests (4 tests)
- `apps/db/test/components/query-editor.nuxt.spec.ts` — Added schema prop test

### Deviation from Plan
- **Toast system:** No shadcn-vue Toast installed. Instead used inline `Alert` component (already in UI kit) for schema fetch errors. This avoids adding a new dependency.

### Test Results
- E2E (`schema.get.spec.ts`): 4/4 passed
- E2E (`tables.get.spec.ts`): 4/4 passed (regression check)
- Component (`query-editor.nuxt.spec.ts`): 7/7 passed

---

## Notes
- **Simplified approach:** Fetch all tables + all columns upfront. No lazy-loading. No custom CompletionSource. Just built-in `@codemirror/lang-sql` `schema` config.
