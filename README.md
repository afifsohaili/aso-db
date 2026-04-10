# ASO-DB

AI-assisted database tool for developers. Query with natural language, explore schemas visually, and get intelligent SQL suggestions.

## Quick Start

```bash
# Run with npx (no install)
npx asodb postgresql://user:pass@localhost:5432/dbname

# Or install globally
npm install -g asodb
asodb
```

## Monorepo Structure

```
aso-db/
├── apps/
│   ├── web/          # Marketing site (Nuxt.js)
│   └── db/           # CLI tool (Nitro + Vite) [IN DEVELOPMENT]
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

# Run CLI tool (when available)
cd apps/db && pnpm dev
```

See [product.md](./product.md) for full specifications.
