# Read-Only Connection Mode for ASO-DB

## Goal
Allow users to connect to a PostgreSQL database in read-only mode: view schema, run SELECT queries, but block all data-modifying operations (INSERT, UPDATE, DELETE, TRUNCATE) and DDL (CREATE, ALTER, DROP).

## Decisions (Locked)

1. **Default behavior: read-only.**
   - Users must explicitly pass `--allow-write` to enable mutating queries.
   - If `--allow-write` is not provided, ASO-DB runs in read-only mode.

2. **Visual warning in write mode.**
   - When the app is **not** in read-only mode (i.e., `--allow-write` was passed), the entire page gets a **fixed red border** as a persistent warning that writes are allowed.

3. **Two-layer accidental protection.**
   - **Layer 1 (App-level):** Parse the SQL query on the server and reject it if the first meaningful keyword is a known write/DDL command.
   - **Layer 2 (DB-level):** Pass `options: "-c default_transaction_read_only=on"` to the `pg` driver so Postgres itself rejects any write transaction.

4. **Blocked keywords (app-level guardrail).**
   The server should reject queries that start with any of the following keywords:
   - DML: `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `MERGE`
   - DDL: `CREATE`, `ALTER`, `DROP`
   - Privilege / utility writes: `GRANT`, `REVOKE`, `COPY` (can write), `CALL`
   - **Note:** `EXPLAIN` is allowed. `EXPLAIN ANALYZE` is tricky because it executes the query; for v1 we should allow `EXPLAIN` but reject `EXPLAIN ANALYZE` in read-only mode, or simply allow it and let the DB-level `default_transaction_read_only=on` block the underlying write.

## Implementation Notes

### Keyword Detection
This is easy to implement. A simple regex that strips leading comments/whitespace and checks the first word is sufficient for accidental protection:
```ts
const WRITE_KEYWORDS = /^(INSERT|UPDATE|DELETE|TRUNCATE|MERGE|CREATE|ALTER|DROP|GRANT|REVOKE|COPY|CALL)\b/i
```
We do **not** need a full AST parser for v1.

### Postgres Connection Config
In read-only mode, append the connection option:
```ts
new Client({
  // ...other config
  options: "-c default_transaction_read_only=on"
})
```
If the user passes `--allow-write`, omit this option.

### UI Warning
When `--allow-write` is active, apply a Tailwind class like `border-4 border-red-500 fixed inset-0 pointer-events-none z-50` to a full-page overlay or the root container so the user always sees the warning.

### Product.md Updates
- Added `--allow-write` to `CliArgs`.
- Added read-by-default checklist items under **Security & Safety**.
- Removed "App-level readonly / destructive-query guardrails" from Post-v1 (now in v1).

## Decisions on Edge Cases
- `EXPLAIN` is allowed in read-only mode.
- `EXPLAIN ANALYZE` is **blocked** in read-only mode because it executes the query and could run volatile functions.
- Detection: after stripping leading whitespace/comments, reject if the query matches `/^EXPLAIN\s+ANALYZE\b/i`.

---
*Gathered: 2026-04-15*
*Updated with decisions: 2026-04-15*
