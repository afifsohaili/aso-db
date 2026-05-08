# ASO-DB

AI-assisted database tool for developers. Query with natural language, explore schemas visually, and get intelligent SQL suggestions.

## Quick Start

```bash
# Run with npx (no install)
npx asodb postgresql://user:pass@localhost:5432/dbname

# Or install globally
npm install -g asodb
asodb postgresql://user:pass@localhost:5432/dbname
```

> **ASO-DB runs in read-only mode by default.** Add `-w` or `--allow-write` to enable mutating queries. See [CLI Options](#cli-options).

## CLI Options

```
asodb [options] <postgresql-connection-string>
```

| Option | Description |
|--------|-------------|
| `-w`, `--allow-write` | **Enable write queries.** Without this flag, ASO-DB blocks INSERT, UPDATE, DELETE, and DDL. A red border appears on the page when writes are enabled as a safety warning. |
| `--no-open` | Do not open the browser automatically. |
| `--port <number>` | Run the server on a custom port (default: auto). |
| `--ai-enabled` | Enable AI-powered query generation and SQL suggestions. |
| `--ai-provider <name>` | AI provider: `openai` or `anthropic`. |
| `--ai-model <name>` | Model name, e.g. `gpt-4o` or `claude-sonnet-4`. |
| `--ai-api-key <key>` | API key for the chosen AI provider. |
| `--ai-max-tokens <number>` | Max tokens per AI request. |

### Examples

```bash
# Read-only mode (default) — safe for production
asodb postgresql://user:pass@localhost:5432/mydb

# Enable writes — for local development
asodb -w postgresql://user:pass@localhost:5432/mydb
asodb --allow-write postgresql://user:pass@localhost:5432/mydb

# Custom port, no browser
asodb --port 3333 --no-open postgresql://user:pass@localhost:5432/mydb

# With AI enabled
asodb --ai-enabled --ai-provider openai --ai-api-key $OPENAI_KEY postgresql://user:pass@localhost:5432/mydb
```

## Monorepo Structure

```
aso-db/
├── apps/
│   ├── web/          # Marketing site (Nuxt.js)
│   └── db/           # CLI tool (Nitro + Vite)
├── packages/
│   ├── shared/       # Shared types
│   └── components/   # Shared UI components
└── product.md        # Full product specification
```

## Development

```bash
# Install dependencies
pnpm install

# Run marketing site
pnpm dev

# Run CLI tool
pnpm dev:db
```

See [product.md](./product.md) for full specifications.
