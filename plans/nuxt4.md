# Nuxt 4 Migration Analysis for apps/db

## Current State Assessment

### What is apps/db Today?
ASO-DB is a **CLI tool** (not a web application) distributed via npm. It launches a local HTTP server that serves database overview pages.

**Key Characteristics:**
- **Type**: CLI binary (`npx asodb postgresql://...`)
- **Distribution**: npm package `asodb`
- **Runtime**: Node.js HTTP server (vanilla, no framework)
- **Frontend**: Server-side rendered HTML strings with embedded CSS/JS
- **Purpose**: Local database browser tool (not a SaaS/web app)

### Current Architecture

```
apps/db/
├── bin/asodb.ts                    # CLI entry point
│   - Parses CLI args (connection string, --port, --no-open)
│   - Creates HTTP server
│   - Opens browser
│   - Handles SIGINT/SIGTERM
│
├── src/cli/parse-cli-args.ts       # Argument parsing
├── src/server/create-overview-server.ts  # HTTP server + routing
├── src/server/render-overview-html.ts    # ~534 lines HTML/CSS/JS
├── src/server/render-table-html.ts       # ~416 lines HTML/CSS/JS  
├── src/db/list-tables.ts           # PostgreSQL table listing
├── src/db/fetch-table-records.ts   # Paginated record fetching
└── src/server/table-info.ts        # Type definitions
```

### Current Tech Stack
- **Runtime**: Node.js 20+
- **Server**: `node:http` (vanilla)
- **Database**: `pg` (PostgreSQL client)
- **Build**: `tsup` (bundles to single executable)
- **Testing**: Vitest
- **TypeScript**: ES2022, strict mode

### Current Features
1. **Overview Page** (`/overview`): Grid of all database tables with command palette (Cmd+K)
2. **Table Detail** (`/table/:name`): Paginated table data viewer
3. **JSON API** (`/api/tables`): REST endpoint for table list
4. **CLI Arguments**:
   - Connection string (required)
   - `--port` (optional, random if not specified)
   - `--no-open` (don't auto-open browser)

---

## Migration to Nuxt 4: Analysis

### What Nuxt 4 Brings

**Pros:**
1. **Unified Stack**: Same tech as `apps/web` (Nuxt, Vue, TypeScript, Tailwind)
2. **Developer Experience**: Hot reload, devtools, better DX
3. **Component Architecture**: Reusable components vs HTML string templates
4. **Ecosystem**: Access to Vue ecosystem (headless UI, charts, etc.)
5. **Future-Proof**: Easier to add features per product spec (AI chat, SQL editor, etc.)

**Cons/Challenges:**
1. **Distribution Complexity**: Nuxt apps aren't typically CLI tools
2. **Bundle Size**: Much larger than current ~500-line vanilla JS
3. **Startup Time**: Slower than instant HTTP server
4. **CLI Integration**: Need to bridge CLI args → Nuxt runtime config
5. **Single Binary**: Nuxt builds aren't single-file executables like tsup

---

## Decision Points (Need Your Input)

### 1. Distribution Model
**Options:**

**A) Keep CLI Distribution** (Recommended for MVP)
- Build Nuxt app to static + API routes
- Package with `pkg` or `nexe` into single binary
- Tradeoff: Larger binary (~50-100MB vs current ~1MB)

**B) Web-Only Distribution**
- User runs `npx asodb` which starts dev server
- No single binary, requires node_modules
- Tradeoff: Simpler, but breaks CLI paradigm

**C) Hybrid Approach**
- CLI downloads pre-built Nuxt output on first run
- Caches in ~/.aso-db/
- Tradeoff: Complex but best UX

**My Recommendation**: Option A for now, but accept larger binary size.

### 2. Server Architecture
**Current**: Single HTTP server, stateless

**Nuxt Options:**

**A) Nitro Server (Recommended)**
- Use Nuxt's built-in Nitro for API routes
- Server routes: `/server/api/tables.get.ts`
- Single process, simpler

**B) Separate API Server**
- Nuxt frontend + Express/Fastify API
- More flexible but adds complexity

**My Recommendation**: Option A - embrace Nuxt/Nitro fully.

### 3. Build Output
**Challenge**: Nuxt generates many files (`.output/`, `.nuxt/`)

**Solution for CLI:**
```bash
# Build steps
1. nuxt build
2. Copy .output/ to dist/
3. Create wrapper script that:
   - Sets PORT from CLI args
   - Sets DATABASE_URL from CLI args
   - Runs node .output/server/index.mjs
```

### 4. Database Connection Handling
**Current**: Connection string passed as CLI arg, stored in memory

**Nuxt Options:**
- Use Nitro's `useRuntimeConfig()`
- Connection string passed via env var at runtime
- CLI wrapper sets `NUXT_DATABASE_URL` before starting Nuxt

---

## Migration Plan

### Phase 1: Project Restructure (Foundation)

#### New Structure
```
apps/db/
├── bin/
│   └── asodb.ts                    # CLI wrapper (lighter)
├── app/
│   ├── app.vue                     # Root layout
│   ├── components/
│   │   ├── TableGrid.vue           # Replace render-overview-html.ts
│   │   ├── TableDetail.vue         # Replace render-table-html.ts
│   │   ├── CommandPalette.vue      # Extract from overview
│   │   └── Pagination.vue          # Extract from table detail
│   ├── composables/
│   │   └── useTables.ts            # Table data fetching
│   ├── layouts/
│   │   └── default.vue
│   ├── pages/
│   │   ├── index.vue               # Redirect to /overview
│   │   ├── overview.vue            # Table grid page
│   │   └── table/[schema]/[name].vue  # Table detail with pagination
│   └── assets/
│       └── css/
│           └── main.css            # Tailwind + custom styles
├── server/
│   ├── api/
│   │   └── tables.get.ts           # API route
│   ├── utils/
│   │   ├── db.ts                   # PostgreSQL client setup
│   │   └── tables.ts               # DB queries (migrate from src/db/)
│   └── middleware/
│       └── connection.ts           # Validate connection on startup
├── shared/
│   └── types/
│       └── table.ts                # Shared TableInfo type
├── nuxt.config.ts
├── package.json
└── tsconfig.json
```

#### Dependencies to Add
```json
{
  "dependencies": {
    "nuxt": "^4.3.1",
    "pg": "^8.16.3",
    "@tailwindcss/vite": "^4.1.17",
    "tailwindcss": "^4.1.17",
    "@vueuse/core": "^10.11.1",
    "@vueuse/nuxt": "^14.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/pg": "^8.15.6"
  }
}
```

### Phase 2: Core Migration

#### Step 1: Package.json & Config
- Replace tsup with Nuxt build
- Add Nuxt 4.3.1 (same as apps/web)
- Configure nitro preset for Node

#### Step 2: Database Layer Migration
```typescript
// server/utils/db.ts
import { Client } from 'pg'

export function useDbClient() {
  const config = useRuntimeConfig()
  return new Client({ connectionString: config.databaseUrl })
}
```

#### Step 3: API Routes
```typescript
// server/api/tables.get.ts
export default defineEventHandler(async () => {
  const client = useDbClient()
  await client.connect()
  try {
    const result = await client.query(/* ... */)
    return { tables: result.rows }
  } finally {
    await client.end()
  }
})
```

#### Step 4: Pages Migration
- Convert HTML string templates to Vue components
- Extract reusable components (CommandPalette, Pagination)
- Migrate CSS to Tailwind + scoped styles

#### Step 5: CLI Wrapper
```typescript
// bin/asodb.ts (simplified)
import { spawn } from 'node:child_process'
import { parseCliArgs } from './src/cli/parse-cli-args'

const args = parseCliArgs(process.argv.slice(2))

const child = spawn('node', ['.output/server/index.mjs'], {
  env: {
    ...process.env,
    NUXT_DATABASE_URL: args.connectionString,
    NUXT_PORT: String(args.port ?? 0),
  },
  stdio: 'inherit',
})

if (args.openBrowser) {
  // Wait for server, then open
}
```

### Phase 3: Feature Parity

| Current Feature | Nuxt Implementation |
|----------------|---------------------|
| Table grid | `pages/overview.vue` + `components/TableGrid.vue` |
| Command palette | `components/CommandPalette.vue` with `@vueuse/integrations` |
| Table detail | `pages/table/[schema]/[name].vue` |
| Pagination | `components/Pagination.vue` |
| Dark theme | `tailwind.config.js` dark mode + `:root` styles |
| JSON API | `server/api/tables.get.ts` |

### Phase 4: Testing Migration

**Current**: Vitest testing HTTP server directly

**Nuxt Approach**:
```typescript
// test/api/tables.get.spec.ts
import { setup } from '@nuxt/test-utils/e2e'

describe('API', () => {
  await setup({
    nuxtConfig: {
      runtimeConfig: { databaseUrl: 'postgresql://test...' }
    }
  })
  
  it('returns tables', async () => {
    const res = await fetch('/api/tables')
    // ...
  })
})
```

---

## Technical Considerations

### 1. Tailwind CSS v4
apps/web uses Tailwind v4 with `@tailwindcss/vite`. Should follow same setup:
```typescript
// nuxt.config.ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  css: ['~/assets/css/main.css'],
})
```

### 2. Compatibility with apps/web
- Use same Nuxt version (4.3.1)
- Use same Tailwind version (4.1.17)
- Share eslint config from root
- Consider sharing components via `packages/components` later

### 3. Bundle Size Optimization
For CLI distribution:
- Use `nuxt build` (not generate, need server)
- Nitro preset: `node-server`
- Minimize deps (no need for @nuxt/content, @nuxt/image, etc.)

### 4. Environment Variables
Nuxt 4 runtime config:
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    databaseUrl: '', // Server-only
  },
})
```

Set via env in CLI wrapper:
```bash
NUXT_DATABASE_URL=postgresql://... node .output/server/index.mjs
```

---

## Implementation Checklist

### Setup
- [ ] Create new nuxt.config.ts
- [ ] Update package.json dependencies
- [ ] Create directory structure (app/, server/)
- [ ] Set up Tailwind CSS v4
- [ ] Configure TypeScript

### Migration
- [ ] Migrate `src/db/*.ts` → `server/utils/*.ts`
- [ ] Create API routes
- [ ] Build Vue components from HTML templates
- [ ] Migrate styles to Tailwind
- [ ] Update CLI wrapper
- [ ] Migrate tests

### Build & Distribution
- [ ] Configure build output
- [ ] Test CLI binary creation
- [ ] Verify single-file distribution works
- [ ] Update root package.json scripts

---

## Open Questions

1. **Should we keep the vanilla JS approach for now?**
   - Current implementation is simple and working
   - Migration adds complexity
   - But enables future features (AI chat, SQL editor)

2. **Do we need single-file distribution?**
   - Current: ~1MB tsup bundle
   - Nuxt: ~50-100MB with pkg/nexe
   - Acceptable tradeoff?

3. **Should we share components with apps/web?**
   - apps/web has existing UI components
   - Could extract to `packages/components`
   - Or keep db-specific UI separate

4. **Server-side vs Client-side rendering?**
   - Current: Server renders HTML
   - Nuxt options: SSR (default), SPA, or hybrid
   - Recommendation: SSR for initial load, client-side for interactions

5. **Hot reload in development?**
   - Current: Restart server on changes
   - Nuxt: Built-in HMR
   - How to pass connection string in dev mode?

---

## My Recommendation

**Proceed with Nuxt 4 migration** for these reasons:

1. **Future Feature Enablement**: The product spec calls for AI chat, SQL editor, complex UI - all much easier with Nuxt/Vue
2. **Developer Velocity**: Team already knows Nuxt from apps/web
3. **Ecosystem**: Access to Vue components (command palettes, editors, etc.)
4. **Maintainability**: Component-based architecture vs HTML strings

**Accept these tradeoffs:**
- Larger binary size (acceptable for dev tool)
- More complex build process
- Slightly slower startup

**Migration approach:**
- Phase 1: Basic Nuxt setup + table grid (feature parity)
- Phase 2: Add future features (AI chat, SQL editor per product spec)
- Phase 3: Polish and optimize

---

## References

- Current code: `apps/db/src/`
- Reference Nuxt setup: `apps/web/`
- Product spec: `product.md` (ASO-DB section)
- Nuxt docs: https://nuxt.com/docs
- Nitro docs: https://nitro.unjs.io/