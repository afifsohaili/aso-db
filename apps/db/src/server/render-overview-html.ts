import type { TableInfo } from './table-info'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeJsString(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('"', '\\"')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')
}

export function renderOverviewHtml(tables: TableInfo[]) {
  const tablesJson = JSON.stringify(tables)

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

      .muted {
        font-size: 0.95rem;
        color: #94a3b8;
      }

      .keyboard-hint {
        font-size: 0.85rem;
        color: #71717a;
        margin-top: 16px;
      }

      .keyboard-hint kbd {
        background: #27272a;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      /* Grid layout */
      .tables-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 12px;
        margin-top: 24px;
      }

      @media (max-width: 1200px) {
        .tables-grid {
          grid-template-columns: repeat(5, 1fr);
        }
      }

      @media (max-width: 900px) {
        .tables-grid {
          grid-template-columns: repeat(4, 1fr);
        }
      }

      @media (max-width: 600px) {
        .tables-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 400px) {
        .tables-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .table-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px 8px;
        background: #1f2937;
        border: 1px solid #374151;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
      }

      .table-card:hover {
        background: #374151;
        border-color: #4b5563;
        transform: translateY(-2px);
      }

      .table-card .icon {
        width: 32px;
        height: 32px;
        color: #9ca3af;
      }

      .table-card:hover .icon {
        color: #e5e7eb;
      }

      .table-card .name {
        font-size: 0.75rem;
        text-align: center;
        word-break: break-word;
        max-width: 100%;
        color: #d1d5db;
      }

      .table-card .schema {
        font-size: 0.65rem;
        color: #6b7280;
        text-transform: uppercase;
      }

      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 48px;
        color: #6b7280;
      }

      /* Command Palette */
      .command-palette-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: none;
        align-items: flex-start;
        justify-content: center;
        padding-top: 20vh;
        z-index: 1000;
      }

      .command-palette-overlay.active {
        display: flex;
      }

      .command-palette {
        width: 100%;
        max-width: 560px;
        background: #18181b;
        border: 1px solid #27272a;
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        overflow: hidden;
      }

      .command-input-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid #27272a;
      }

      .command-input-wrapper svg {
        width: 20px;
        height: 20px;
        color: #71717a;
        flex-shrink: 0;
      }

      .command-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: #fafafa;
        font-size: 1rem;
        font-family: inherit;
      }

      .command-input::placeholder {
        color: #71717a;
      }

      .command-results {
        max-height: 400px;
        overflow-y: auto;
      }

      .command-result {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        border-left: 3px solid transparent;
      }

      .command-result:hover,
      .command-result.selected {
        background: #27272a;
      }

      .command-result.selected {
        border-left-color: #3b82f6;
      }

      .command-result .icon {
        width: 20px;
        height: 20px;
        color: #9ca3af;
        flex-shrink: 0;
      }

      .command-result .info {
        flex: 1;
        min-width: 0;
      }

      .command-result .name {
        font-size: 0.9rem;
        color: #e4e4e7;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .command-result .schema {
        font-size: 0.75rem;
        color: #71717a;
      }

      .command-result .shortcut {
        font-size: 0.75rem;
        color: #52525b;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      .command-result.selected .shortcut {
        color: #3b82f6;
      }

      .no-results {
        padding: 48px 16px;
        text-align: center;
        color: #71717a;
      }

      /* Scrollbar styling */
      .command-results::-webkit-scrollbar {
        width: 8px;
      }

      .command-results::-webkit-scrollbar-track {
        background: transparent;
      }

      .command-results::-webkit-scrollbar-thumb {
        background: #3f3f46;
        border-radius: 4px;
      }

      .command-results::-webkit-scrollbar-thumb:hover {
        background: #52525b;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>ASO-DB</h1>
      <p>Overview</p>

      <section>
        <h2>Tables</h2>
        <p class="muted">Database tables available in your PostgreSQL connection.</p>
        <div class="keyboard-hint">Press <kbd>Cmd</kbd> + <kbd>K</kbd> to search tables</div>
        <div class="tables-grid" id="tablesGrid"></div>
      </section>
    </main>

    <!-- Command Palette -->
    <div class="command-palette-overlay" id="commandPalette">
      <div class="command-palette" role="dialog" aria-label="Command palette">
        <div class="command-input-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            class="command-input"
            id="commandInput"
            placeholder="Search tables..."
            autocomplete="off"
          />
        </div>
        <div class="command-results" id="commandResults"></div>
      </div>
    </div>

    <script>
      // Table icon SVG
      const tableIconSvg = \`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-8.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 18.375v-1.5" />
      </svg>\`;

      // Simple fuzzy search implementation
      function fuzzyMatch(pattern, text) {
        pattern = pattern.toLowerCase();
        text = text.toLowerCase();
        
        let patternIdx = 0;
        let textIdx = 0;
        let score = 0;
        
        while (patternIdx < pattern.length && textIdx < text.length) {
          if (pattern[patternIdx] === text[textIdx]) {
            // Bonus for consecutive matches
            if (textIdx > 0 && text[textIdx - 1] === pattern[patternIdx - 1]) {
              score += 2;
            }
            // Bonus for start of word
            if (textIdx === 0 || text[textIdx - 1] === '.' || text[textIdx - 1] === '_') {
              score += 3;
            }
            score += 1;
            patternIdx++;
          }
          textIdx++;
        }
        
        // Return score only if all pattern characters were matched
        return patternIdx === pattern.length ? score : 0;
      }

      // Tables data
      const tables = ${tablesJson};

      // Render grid
      function renderGrid() {
        const grid = document.getElementById('tablesGrid');

        if (tables.length === 0) {
          grid.innerHTML = '<div class="empty-state">No user tables found.</div>';
          return;
        }

        grid.innerHTML = tables.map((table) => {
          const href = '/table/' + encodeURIComponent(table.schema + '.' + table.name);
          return '<a class="table-card" href="' + escapeHtml(href) + '">' +
            tableIconSvg +
            '<div class="schema">' + escapeHtml(table.schema) + '</div>' +
            '<div class="name">' + escapeHtml(table.name) + '</div>' +
          '</a>';
        }).join('');
      }

      function escapeHtml(value) {
        return value
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
      }

      // Command Palette
      const commandPalette = document.getElementById('commandPalette');
      const commandInput = document.getElementById('commandInput');
      const commandResults = document.getElementById('commandResults');
      
      let selectedIndex = 0;
      let filteredTables = [];

      function openCommandPalette() {
        commandPalette.classList.add('active');
        commandInput.value = '';
        commandInput.focus();
        filterTables('');
      }

      function closeCommandPalette() {
        commandPalette.classList.remove('active');
        commandInput.blur();
      }

      function filterTables(query) {
        if (!query) {
          filteredTables = tables.map((t, i) => ({ ...t, originalIndex: i }));
        } else {
          filteredTables = tables
            .map((t, i) => ({ 
              ...t, 
              originalIndex: i, 
              score: fuzzyMatch(query, t.schema + '.' + t.name)
            }))
            .filter(t => t.score > 0)
            .sort((a, b) => b.score - a.score);
        }
        
        selectedIndex = 0;
        renderResults();
      }

      function renderResults() {
        if (filteredTables.length === 0) {
          commandResults.innerHTML = '<div class="no-results">No tables found</div>';
          return;
        }
        
        commandResults.innerHTML = filteredTables.map((table, index) => \`
          <div class="command-result \${index === selectedIndex ? 'selected' : ''}" data-index="\${index}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-8.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 18.375v-1.5" />
            </svg>
            <div class="info">
              <div class="name">\${escapeHtml(table.name)}</div>
              <div class="schema">\${escapeHtml(table.schema)}</div>
            </div>
            <div class="shortcut">↵</div>
          </div>
        \`).join('');
      }

      function navigateToTable(table) {
        const url = '/table/' + encodeURIComponent(table.schema + '.' + table.name);
        window.location.href = url;
      }

      function selectTable(index) {
        if (filteredTables[index]) {
          navigateToTable(filteredTables[index]);
        }
      }

      // Event listeners
      document.addEventListener('keydown', (e) => {
        // Cmd+K or Ctrl+K to open
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          openCommandPalette();
        }
        
        // Escape to close
        if (e.key === 'Escape') {
          closeCommandPalette();
        }
        
        // Navigation when open
        if (commandPalette.classList.contains('active')) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, filteredTables.length - 1);
            renderResults();
            scrollToSelected();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            renderResults();
            scrollToSelected();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            selectTable(selectedIndex);
          }
        }
      });

      function scrollToSelected() {
        const selected = commandResults.querySelector('.command-result.selected');
        if (selected) {
          selected.scrollIntoView({ block: 'nearest' });
        }
      }

      commandInput.addEventListener('input', (e) => {
        filterTables(e.target.value);
      });

      commandPalette.addEventListener('click', (e) => {
        if (e.target === commandPalette) {
          closeCommandPalette();
        }
      });

      commandResults.addEventListener('click', (e) => {
        const result = e.target.closest('.command-result');
        if (result) {
          selectTable(parseInt(result.dataset.index));
        }
      });

      // Initialize
      renderGrid();
    </script>
  </body>
</html>`
}
