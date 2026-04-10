import type { TableInfo } from './table-info'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderOverviewHtml(tables: TableInfo[]) {
  const listItems = tables.length > 0
    ? tables.map(table => `<li><strong>${escapeHtml(table.schema)}</strong>.${escapeHtml(table.name)}</li>`).join('')
    : '<li>No user tables found.</li>'

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ASO-DB Overview</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        margin: 0;
        background: #09090b;
        color: #fafafa;
      }

      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 48px 24px 72px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 2rem;
      }

      p {
        color: #a1a1aa;
      }

      section {
        margin-top: 32px;
        padding: 24px;
        border: 1px solid #27272a;
        border-radius: 16px;
        background: #111827;
      }

      ul {
        margin: 16px 0 0;
        padding-left: 20px;
      }

      li {
        margin: 10px 0;
      }

      .muted {
        font-size: 0.95rem;
        color: #94a3b8;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>ASO-DB</h1>
      <p>Overview</p>

      <section>
        <h2>Tables</h2>
        <p class="muted">First iteration: list all PostgreSQL base tables reachable from the provided connection string.</p>
        <ul>${listItems}</ul>
      </section>
    </main>
  </body>
</html>`
}
