# Multi-Table Joins Plan

## Status: COMPLETED

## Sub-Plans (YAML)

Implementation is broken into numbered YAML files in `plans/multi-table-joins/`:

1. `001-delete-join-route.yaml` — Delete `/join/` route and related files ✅
2. `002-table-api-joins-param.yaml` — Modify table API for `?joins=` query param ✅
3. `003-table-detail-joins-ui.yaml` — Update table detail page to read `?joins=` and handle add/remove ✅
4. `004-join-suggestions-add-remove.yaml` — Update JoinSuggestions with add/remove buttons ✅
5. `005-fuzzy-column-visibility.yaml` — Add fuse.js fuzzy search to column visibility dialog ✅

## Sub-Plans (YAML)

Implementation is broken into numbered YAML files in `plans/multi-table-joins/`:

1. `001-delete-join-route.yaml` — Delete `/join/` route and related files
2. `002-table-api-joins-param.yaml` — Modify table API for `?joins=` query param + JOIN SQL generation
3. `003-table-detail-joins-ui.yaml` — Update table detail page to read `?joins=` and handle add/remove
4. `004-join-suggestions-add-remove.yaml` — Update JoinSuggestions with add/remove buttons
5. `005-fuzzy-column-visibility.yaml` — Add fuse.js fuzzy search to column visibility dialog

## Problem

Current join implementation only supports **2 tables** via a dedicated `/join/` route:
- `/join/public/users/public/organisations`
- Hardcoded to exactly 2 tables
- No way to chain joins (users → branch_user → branches)

## Goal

Support **N-table joins** via query params on the existing table detail page:
- `/table/public/users?joins=branch_user,branches`
- Chain: users → branch_user → branches
- Columns prefixed with table name for disambiguation: `users.id`, `branch_user.user_id`, `branches.name`
- Column visibility dialog uses fuzzy search (fuse.js)

## Decisions

| Question | Decision |
|----------|----------|
| **Q1. Remove joined tables?** | **B** — Show separate "×" remove button next to joined tables |
| **Q2. What happens to `/join/` route?** | **A** — Delete entirely (pre-release, breaking change OK) |
| **Q3. Max join depth?** | **4 tables max**, enforced server-side |

## Proposed Design

### URL Format

```
/table/public/users                          → single table
/table/public/users?joins=branch_user        → 2-table join
/table/public/users?joins=branch_user,branches → 3-table join chain
/table/public/users?joins=branch_user&cols=users.id,users.name,branch_user.branch_id
```

### Column Naming

When joins are present, **all columns are prefixed** with table name:

```
users.id | users.name | users.email | branch_user.user_id | branch_user.branch_id | branches.id | branches.name
```

This prevents ambiguity and makes column visibility meaningful.

### API Changes

Extend `GET /api/tables/{schema}/{name}`:

**New query param:** `?joins=table1,table2`

Server-side logic:
1. Parse joins into array: `['table1', 'table2']`
2. Fetch columns for all tables (base + each join) from `information_schema`
3. For each adjacent pair, fetch relations to find FK mapping
4. Build SELECT with aliases: `"users"."id" AS "users.id"`
5. Build FROM + JOIN chain
6. Execute with pagination/sorting
7. Return `{ records, totalCount, columns }` where columns are prefixed

Example SQL generated:
```sql
SELECT 
  "users"."id" AS "users.id",
  "users"."name" AS "users.name",
  "branch_user"."user_id" AS "branch_user.user_id",
  "branch_user"."branch_id" AS "branch_user.branch_id",
  "branches"."id" AS "branches.id",
  "branches"."name" AS "branches.name"
FROM "public"."users"
JOIN "public"."branch_user" ON "users"."id" = "branch_user"."user_id"
JOIN "public"."branches" ON "branch_user"."branch_id" = "branches"."id"
ORDER BY "users"."id" ASC
LIMIT 50 OFFSET 0
```

### Column Visibility with Fuzzy Search

- Dialog shows all prefixed columns: `users.id`, `users.name`, `branch_user.user_id`, ...
- Uses **fuse.js** for fuzzy search (already installed)
- Search "braus" → matches `branch_user.user_id`, `branches.name`
- Search "uid" → matches `users.id`, `branch_user.user_id`
- URL persists: `?cols=users.id,users.name,branches.name`

### Join Suggestions UI Changes

- **Outgoing joins** (tables this table references): click to add to `?joins=`
- **Incoming joins** (tables referencing this table): click to add to `?joins=`
- Already-joined tables: show as "active" with remove option
- Last joined table's relations are used to suggest next joins

Example flow:
1. `/table/public/users` → shows joins to `branch_user`, `organisations`
2. Click `branch_user` → URL becomes `?joins=branch_user`
3. Now shows `branch_user`'s relations too: `branches`
4. Click `branches` → URL becomes `?joins=branch_user,branches`
5. Columns show: `users.id`, `users.name`, `branch_user.user_id`, `branch_user.branch_id`, `branches.id`, `branches.name`

### Files to Modify

**Deleted:**
- `apps/db/app/pages/join/[schema]/[name]/[targetSchema]/[targetTable].vue`
- `apps/db/test/e2e/join-view.spec.ts`

**Modified:**
- `apps/db/server/api/tables/[schema]/[name].get.ts` — Add joins query param, generate JOIN SQL
- `apps/db/app/pages/table/[schema]/[name].vue` — Read ?joins=, pass to API, handle add/remove joins
- `apps/db/app/components/table-detail.vue` — Handle prefixed columns (no changes needed if columns just have dots)
- `apps/db/app/components/column-visibility-dialog.vue` — Add fuse.js fuzzy search
- `apps/db/app/components/join-suggestions.vue` — Support adding/removing joins, show multi-level suggestions

**New:**
- Server-side SQL generation helper for multi-table joins

**Tests:**
- Update table detail page tests for ?joins= query param
- Update column visibility dialog tests for fuzzy search
- Update join suggestions tests for add/remove behavior
- New e2e test for multi-table join flow

## Implementation Order

1. **Delete /join/ route** and related tests
2. **Modify table API** to accept `?joins=`, generate JOIN SQL, enforce 4-table max
3. **Update table detail page** to read `?joins=`, pass to API, handle add/remove
4. **Update join suggestions** for add/remove via query params (× button)
5. **Add fuse.js fuzzy search** to column visibility dialog for prefixed columns
6. **Update tests**
7. **Verify** with browser
