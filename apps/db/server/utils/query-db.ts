import { createHash } from 'node:crypto'

export function getDatabaseUrlHash(): string {
  const config = useRuntimeConfig()
  return createHash('sha256').update(config.databaseUrl || '').digest('hex')
}

export async function migrateQueryDatabase() {
  const db = useDatabase()

  await db.exec(`PRAGMA journal_mode = WAL;`)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS saved_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      sql_content TEXT NOT NULL,
      database_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS query_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sql_content TEXT NOT NULL,
      database_url TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration_ms INTEGER,
      row_count INTEGER,
      error_message TEXT,
      saved_query_id INTEGER REFERENCES saved_queries(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS query_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      database_url TEXT NOT NULL UNIQUE,
      sql_content TEXT NOT NULL DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Migrate legacy schema: add database_url columns if missing
  try {
    await db.exec(`ALTER TABLE saved_queries ADD COLUMN database_url TEXT`)
  }
  catch {
    // Column already exists
  }

  try {
    await db.exec(`ALTER TABLE query_history ADD COLUMN database_url TEXT`)
  }
  catch {
    // Column already exists
  }

  // Migrate query_sessions from single-row to per-DB-url rows
  const sessionsTableInfo = await db.sql`PRAGMA table_info(query_sessions)`
  const rows = sessionsTableInfo.rows ?? []
  const hasDatabaseUrlColumn = rows.some((row: any) => row.name === 'database_url')

  if (!hasDatabaseUrlColumn) {
    const legacySession = await db.sql`SELECT sql_content, updated_at FROM query_sessions WHERE id = 1`
    const sessionRows = legacySession.rows ?? []
    const sqlContent = (sessionRows[0] as any)?.sql_content ?? ''
    const updatedAt = (sessionRows[0] as any)?.updated_at ?? new Date().toISOString()

    await db.exec(`DROP TABLE query_sessions`)
    await db.exec(`
      CREATE TABLE query_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        database_url TEXT NOT NULL UNIQUE,
        sql_content TEXT NOT NULL DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.sql`
      INSERT INTO query_sessions (database_url, sql_content, updated_at)
      VALUES (${getDatabaseUrlHash()}, ${sqlContent}, ${updatedAt})
    `
  }
}
