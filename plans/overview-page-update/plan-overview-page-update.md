# Overview Page Update - Plan

## Status: COMPLETED

## Sub-Plans (YAML)

Implementation is broken into numbered YAML files in this directory:

1. `001-setup-dependencies.yaml` — Install fuse.js + add shadcn-vue Checkbox
2. `002-rename-overview-to-home.yaml` — Rename /overview → /home, delete TableGrid
3. `003-cmd-p-fuzzy-search.yaml` — cmd:p keyboard shortcut + fuse.js fuzzy search
4. `004-column-visibility.yaml` — Gear icon + modal dialog, URL param persistence
5. `005-relations-api.yaml` — Foreign key relations API endpoint
6. `006-join-suggestions.yaml` — Join suggestions panel on table detail
7. `007-combined-join-view.yaml` — Combined join view page route

Each YAML contains: status, summary, references (existing files), and approach notes.
Tests are included within each plan (TDD).

## Decisions

| Question | Decision |
|----------|----------|
| **Q1. Page name?** | **"Home"** — `/` redirects to `/home`. Alternatives considered: "Tables", "Explorer", "Browse". User prefers "Home". |
| **Q2. Join detection?** | **A** — Query `information_schema` for actual foreign key constraints (accurate, requires new API). |
| **Q3. Clicking a join?** | **C** — New dedicated "combined view" route (e.g., `/join/public/users/organisations`). |
| **Q4. Column visibility persistence?** | **B** — URL query params (shareable, e.g., `?cols=id,name,email`). |
| **Q5. Table grid component?** | **A** — Delete `TableGrid.vue` entirely. |

## Current State

### Home Page (`/home`)
- **NEW:** Replaces `/overview`. Landing page for browsing tables.
- Clean, minimal state: "Press ⌘P to open a table" prompt.
- Header nav: "ASO-DB" logo, "Home" (active), "Query" tabs.
- Bottom hint: "⌘P to search".
- No table grid.

### Table Detail Page (`/table/{schema}/{name}`)
- Shows table records in a shadcn/ui Table component
- Pagination (25/50/100 rows per page)
- Column sorting (toggle asc/desc)
- Formatting: boolean → Badge, null → italic, JSON → monospace
- Back button to `/home`
- **NEW:** Column visibility toggle (gear icon → modal dialog, persisted in URL)
- **NEW:** Join suggestions panel on the right side

### Combined Join View (`/join/{schema}/{table}/{targetSchema}/{targetTable}`)
- **NEW:** Dedicated route for joined table data
- Title format: `users + organisations`
- Columns: `users.id | users.name | ... | organisations.id | ...`
- Uses existing query execution endpoint with generated JOIN SQL

### Technical Constraints
- **No fuzzy search library** installed (no fuse.js, no fuzzysort, etc.)
- **No checkbox component** in shadcn-vue setup
- **No foreign key API** - no endpoint for getting table relationships
- Uses **radix-vue / reka-ui** for shadcn components
- Uses **@tanstack/vue-table** for table logic
- **CodeMirror 6** for SQL editor
- **node-sql-parser** for SQL parsing
- Vue 3 + TypeScript + Tailwind CSS v4
- Integration tests preferred over unit tests

## Desired Changes

### 1. Remove Big Grid
`TableGrid.vue` component will be **deleted**. Navigation is exclusively via fuzzy search (⌘P).

### 2. Change cmd:k → cmd:p
Match VSCode muscle memory for "Quick Open".

### 3. Add Fuzzy Search
Command palette uses proper fuzzy matching (not just substring). Install `fuse.js` or implement simple fuzzy algorithm.

### 4. Join Suggestions (Main Feature)
On the table detail page, show a "joins:" section on the right side suggesting related tables based on actual foreign key constraints from `information_schema`.
- E.g., for `users` table, show `profiles`, `organisations` as joinable tables
- Clicking a join navigates to a new **combined view route**

### 5. Column Visibility Toggle
- Gear icon next to column headers or table title
- Opens modal dialog with searchable checklist of columns (uses shadcn-vue `Checkbox`)
- Check/uncheck to show/hide columns
- **Persisted in URL query params** (e.g., `?cols=id,name,email`)

### 6. Combined Join View
New dedicated route `/join/{schema}/{table}/{targetSchema}/{targetTable}`.
- Title format: `users + organisations`
- Columns: `users.id | users.name | ... | organisations.id | ...`
- Generated JOIN query executed via existing query execution API

## Technical Approach

### Fuzzy Search
- Install `fuse.js` or use `fzf` algorithm manually
- Update `command-palette.vue` to use fuzzy matching
- Change keyboard shortcut from `cmd+k` to `cmd+p`

### Join Suggestions API
- New endpoint: `GET /api/tables/{schema}/{name}/relations`
- Query `information_schema.table_constraints` + `information_schema.key_column_usage` + `information_schema.constraint_column_usage`
- Return: `{ foreignKeys: [...], referencedBy: [...] }`

### Column Visibility
- Add shadcn-vue `Checkbox` component (via `npx shadcn-vue@latest add checkbox`)
- New component: `ColumnVisibilityDialog.vue`
- Use `@tanstack/vue-table` column visibility features
- Persist preference in URL query params (e.g., `?cols=id,name,email`)

### Combined Join View
- New component or extend `TableDetail.vue`
- Execute JOIN query via existing `/api/query/execute` endpoint
- OR create new endpoint `GET /api/tables/{schema}/{name}/join/{targetSchema}/{targetName}`

## Files to Modify / Create

### Deleted
- `apps/db/app/components/table-grid.vue` - No longer needed
- `apps/db/test/components/table-grid.nuxt.spec.ts` - No longer needed

### Modified
- `apps/db/app/pages/index.vue` - Change redirect from `/overview` to `/home`
- `apps/db/app/pages/overview.vue` → `apps/db/app/pages/home.vue` - Rename, remove grid, update nav
- `apps/db/app/components/command-palette.vue` - Fuzzy search, cmd:p shortcut, fuzzy matching
- `apps/db/app/pages/table/[schema]/[name].vue` - Add joins panel, column visibility gear icon
- `apps/db/app/components/table-detail.vue` - Accept `visibleColumns` prop, apply column filtering
- `apps/db/app/layouts/default.vue` - Update nav link from `/overview` to `/home`

### New
- `apps/db/server/api/tables/[schema]/[name]/relations.get.ts` - Foreign key constraints API
- `apps/db/app/components/column-visibility-dialog.vue` - Gear icon + modal with searchable checkboxes
- `apps/db/app/components/join-suggestions.vue` - "joins:" panel listing related tables
- `apps/db/app/pages/join/[schema]/[name]/[targetSchema]/[targetTable].vue` - Combined join view page

### Tests to Update/Add
- `apps/db/test/e2e/overview-page.spec.ts` - Rename to `home-page.spec.ts`, update assertions
- `apps/db/test/components/command-palette.nuxt.spec.ts` - Update for fuzzy search
- `apps/db/test/components/table-detail.nuxt.spec.ts` - Add column visibility tests
- `apps/db/test/e2e/join-view.spec.ts` - New: combined join view route
- `apps/db/test/server/relations-api.spec.ts` - New: relations endpoint tests

## Implementation Order

1. **Install dependencies**: `fuse.js`, add shadcn-vue `Checkbox` component
2. **cmd:p + fuzzy search**: Update command-palette.vue and keyboard shortcut
3. **Home page**: Rename overview.vue → home.vue, delete table-grid.vue, update nav
4. **Column visibility**: Add Checkbox component, create ColumnVisibilityDialog.vue, wire into table detail
5. **Join relations API**: Create relations.get.ts endpoint querying information_schema
6. **Join suggestions UI**: Create JoinSuggestions.vue component, add to table detail page
7. **Combined join view**: Create new page route, generate JOIN query, display results
8. **Update tests**: Add/update all test files
9. **Verify**: Screenshots of home page, table detail with joins, combined view
