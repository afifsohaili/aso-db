# Plan: Table Structure & Indices Display

## Context

**Affected page:** `apps/db/app/pages/table/[schema]/[name].vue`
**Related API:** `apps/db/server/api/tables/[schema]/[name].get.ts`
**Current state:** Page shows table records with pagination/sorting. No column types, constraints, or index info displayed. API returns only column names (strings).

## Goal

Display table structure (column types, defaults, constraints) and indices on the table detail page.

## UI Options (TBD - awaiting decision)

### Option A: Tab Switcher (Structure | Data)
- Like phpMyAdmin, DBeaver, TablePlus
- **Structure tab:** Columns table (name, type, default, nullable, constraints) + Indices table
- **Data tab:** Current records view
- **Pros:** Clear separation, dedicated space for rich schema info, familiar pattern for DB tools
- **Cons:** Context switching required, can't see structure and data simultaneously
- **Backend needs:** Extend API to return column metadata + indices

### Option B: Inline Column Badges + Collapsible Indices Panel
- Column headers show type badges (e.g., `id integer PK`, `email varchar(255)`)
- Below data table: collapsible "Indices" section
- **Pros:** Types visible at a glance while browsing data, no tab switching
- **Cons:** Headers get noisy/wide, limited space for full constraint info
- **Backend needs:** Extend API to return column metadata + indices

### Option C: Expandable "Table Details" Section Above Data
- Collapsible panel at top showing columns grid + indices list
- "Show Structure" / "Hide Structure" toggle
- **Pros:** Everything on one page, no tab switching, scannable when expanded
- **Cons:** Takes vertical space when expanded, pushes data down
- **Backend needs:** Extend API to return column metadata + indices

### Option D: Tooltip/Popover on Column Headers
- Hover column header → tooltip shows type, default, nullable, constraints
- Small "Indices" button opens a dialog/drawer
- **Pros:** Minimal clutter, headers stay clean
- **Cons:** Info hidden by default, not scannable, requires interaction
- **Backend needs:** Same as above

## Open Questions

1. Which UI pattern do we prefer?
2. What specific metadata to show per column? (type, nullable, default, constraints, comments?)
3. What index details to show? (name, columns, type, unique?)
4. Should we add a new API endpoint or extend the existing one?
5. Do we want to show foreign key relationships too?

## Backend Requirements (regardless of UI choice)

Need to query:
- `information_schema.columns` for types, defaults, nullability
- `information_schema.table_constraints` + `constraint_column_usage` for PK, FK, unique constraints
- `pg_indexes` or `pg_class` + `pg_index` for index info

## Decisions Log

| Date | Decision | Notes |
|------|----------|-------|
| 2026-04-27 | Hybrid UI (tabs + inline badges) | Structure tab for full details, inline badges for minimal at-a-glance |
| 2026-04-27 | Column metadata scope | type + nullable + default value + constraints (PK, FK, unique) + comments if available |
| 2026-04-27 | Foreign keys | Yes — show FK references in structure tab |
| 2026-04-27 | Backend approach | Extend existing endpoint (structure metadata is tiny, avoids loading state on tab switch) |

## Implementation Status

| Task | Status | Notes |
|------|--------|-------|
| Backend types (ColumnInfo, IndexInfo, FKInfo, TableStructure) | ✅ Complete | Added to `apps/db/shared/types/table.ts` |
| Backend `fetchTableStructure` helper | ✅ Complete | Added to `apps/db/server/utils/db.ts` with 4 SQL queries |
| Extend API endpoint | ✅ Complete | `GET /api/tables/:schema/:name` now returns `structure` field |
| E2E tests | ✅ Complete | 4 tests covering columns, indexes, FKs, composite indexes, empty tables |
| Frontend inline badges | ✅ Complete | `table-detail.vue` shows `:type` with PK/FK icons, nullable `?` indicator, tooltip with full details |
| Frontend tab switcher | ✅ Complete | `Data` / `Structure` tabs on table page |
| Frontend `table-structure.vue` component | ✅ Complete | Shows columns, indexes, foreign keys in separate sections |
| Browser verification | ✅ Complete | Both tabs render correctly; error states handled gracefully |

---

## Implementation Notes & Differences from Plan

### What changed during implementation:

1. **Template structure fix:** The original page had a `v-if="toast.visible"` element between `v-else-if="!data"` and `v-else`, which broke Vue's `v-if/v-else` chain. This caused the content div to render even when `data` was null, leading to "Cannot read properties of undefined" errors. Fixed by moving the toast notification outside the `v-if` chain (using `v-show` and placing it after the content div).

2. **Type display in structure tab:** Instead of showing just `text?` for nullable columns in the structure table, we show `text` in the Type column and `NULL` in the Nullable column for clarity.

3. **Index column display:** Index columns are shown as individual badges (one per column) rather than a comma-separated list, for better scannability.

4. **No changes needed for:**
   - The SQL queries from the plan worked as-is (with `::text[]` cast for array_agg)
   - The types from the plan matched the actual implementation
   - The hybrid UI approach worked well

---

## Final Design

### Hybrid UI: Tabs + Inline Badges

**Tab bar** at top of page (next to breadcrumb/back button area):
- **Data** (default) — current records table
- **Structure** — full schema metadata

**Data tab — inline minimal badges:**
- Column headers show: `columnName :type` (e.g., `email :varchar(255)`)
- Constraint icons next to type: 🔑 PK, 🔗 FK, ⭐ UQ
- Nullable indicator: `?` suffix or dimmed type (e.g., `:integer?`)
- FK columns get a link to referenced table (clickable)

**Structure tab — full details:**
- **Columns section:** Table listing all columns with:
  - Name, Type, Nullable, Default, Constraints, Comment
  - Visual distinction for PK/FK/UQ columns
- **Indices section:** Table listing indexes with:
  - Index name, Type (B-tree, Hash, GiST, etc.), Columns, Unique?, Partial?
- **Foreign Keys section:** Table listing FKs with:
  - Constraint name, Column(s), References (table.column), On Update/On Delete

### Backend Changes

**Extend `GET /api/tables/:schema/:name`** to return:
```typescript
{
  records: TableRecord[],
  totalCount: number,
  columns: string[],           // keep for backward compat / table-detail
  structure: {
    columns: ColumnInfo[],     // NEW
    indexes: IndexInfo[],      // NEW
    foreignKeys: FKInfo[],     // NEW
  }
}
```

**New types to add to `apps/db/shared/types/table.ts`:**
```typescript
interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  defaultValue: string | null
  constraints: ('PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK')[]
  comment: string | null
  isPrimaryKey: boolean
  isForeignKey: boolean
  foreignKey?: {
    referencedTable: string
    referencedColumn: string
    referencedSchema: string
  }
}

interface IndexInfo {
  name: string
  columns: string[]
  type: string        // btree, hash, gist, gin, etc.
  unique: boolean
  partial: boolean    // has WHERE clause
  primary: boolean    // is this the PK index?
}

interface FKInfo {
  name: string
  column: string
  referencedSchema: string
  referencedTable: string
  referencedColumn: string
  onUpdate: string
  onDelete: string
}
```

**SQL queries needed in backend:**

1. **Column info with constraints:**
```sql
SELECT 
  c.column_name,
  c.data_type || COALESCE('(' || c.character_maximum_length || ')', '') AS type,
  c.is_nullable = 'YES' AS nullable,
  c.column_default AS default_value,
  col_description(pgc.oid, a.attnum) AS comment
FROM information_schema.columns c
JOIN pg_class pgc ON pgc.relname = c.table_name
JOIN pg_namespace pgn ON pgn.oid = pgc.relnamespace AND pgn.nspname = c.table_schema
LEFT JOIN pg_attribute a ON a.attrelid = pgc.oid AND a.attname = c.column_name
WHERE c.table_schema = $1 AND c.table_name = $2
```

2. **Constraints (PK, FK, UQ):**
```sql
SELECT 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema AS referenced_schema,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = $1 AND tc.table_name = $2
```

3. **Indexes:**
```sql
SELECT 
  i.relname AS index_name,
  am.amname AS index_type,
  ix.indisunique AS is_unique,
  ix.indisprimary AS is_primary,
  ix.indpred IS NOT NULL AS is_partial,
  array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_am am ON am.oid = i.relam
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE n.nspname = $1 AND t.relname = $2
GROUP BY i.relname, am.amname, ix.indisunique, ix.indisprimary, ix.indpred
```

4. **Foreign key details:**
```sql
SELECT 
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema AS referenced_schema,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column,
  rc.update_rule AS on_update,
  rc.delete_rule AS on_delete
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
WHERE tc.table_schema = $1 AND tc.table_name = $2 AND tc.constraint_type = 'FOREIGN KEY'
```

### Implementation Plan

1. **Backend:**
   a. Add new types to `apps/db/shared/types/table.ts`
   b. Add helper functions in `apps/db/server/utils/db.ts` for fetching column info, indexes, and FKs
   c. Extend `apps/db/server/api/tables/[schema]/[name].get.ts` to include structure in response
   d. Write tests for new backend queries

2. **Frontend — Data tab inline badges:**
   a. Update `table-detail.vue` column headers to show `:type` with constraint icons
   b. Update `apps/db/app/pages/table/[schema]/[name].vue` to pass structure metadata to table-detail
   c. Style: small muted text for type, icon for PK/FK/UQ, nullable indicator

3. **Frontend — Structure tab:**
   a. Add tab switcher UI in `[name].vue` page
   b. Create new component `table-structure.vue`:
      - Columns table (name, type, nullable, default, constraints, comment)
      - Indexes table (name, type, columns, unique, partial)
      - Foreign keys table (name, column, references, on update/delete)
   c. Style with shadcn Table components

4. **Edge cases / considerations:**
   - Very long column comments → truncate with tooltip
   - Composite indexes → show all columns in order
   - Composite FKs → show all referencing columns
   - Enum types → show allowed values if possible
   - Array types → display properly
   - No indexes → show "No indexes defined" message
   - No FKs → omit section or show "No foreign keys"

