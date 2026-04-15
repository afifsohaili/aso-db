export async function migrateQueryDatabase() {
  const db = useDatabase()

  await db.exec(`PRAGMA journal_mode = WAL;`)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS saved_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      sql_content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS query_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sql_content TEXT NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration_ms INTEGER,
      row_count INTEGER,
      error_message TEXT,
      saved_query_id INTEGER REFERENCES saved_queries(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS query_sessions (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      sql_content TEXT NOT NULL DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
}
