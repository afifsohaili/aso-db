You are an expert full-stack developer with good insights into customer needs and user experience.

## Monorepo Structure

pnpm workspace (`apps/*`, `packages/*`). No turbo/nx.

| Package | Path | Purpose |
|---------|------|---------|
| `web` | `apps/web/` | Marketing site (Nuxt.js, port 3300) |
| `asodb` | `apps/db/` | CLI tool (Nuxt + Nitro, port 3301) |
| `@monorepo/shared` | `packages/shared/` | Shared types |
| `@monorepo/components` | `packages/components/` | Shared UI components |
| `@monorepo/theme` | `packages/theme/` | Shared theme/styles |

## Commands

Root scripts mostly delegate to `apps/web`:
- `pnpm dev` — runs **both** `web` (3300) and `db` (3301) in parallel
- `pnpm dev:db` — runs only `apps/db` (requires `NUXT_DATABASE_URL` env var, e.g. `export NUXT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asodb_test`)
- `pnpm build` — builds `apps/web`
- `pnpm generate` — generates static `apps/web`
- `pnpm lint` / `pnpm lint:fix` — runs eslint in `apps/web`
- `pnpm db:migrate` — runs Kysely migrations in `apps/web`
- `pnpm db:migrate:generate` — runs migrations **and** generates `packages/shared/types.d.ts`
- `pnpm test` — runs all test projects in `apps/web`
- `pnpm test:e2e` — e2e tests in `apps/web`
- `pnpm test:components` — Nuxt component tests in `apps/web`

Package-specific commands (must `cd` or use `--filter`):
- `pnpm --filter asodb build` — builds CLI (`nuxt build && esbuild bin/asodb.ts`)
- `pnpm --filter asodb test` — runs `apps/db` tests

## Code Style

- `@antfu/eslint-config` with Vue support
- TypeScript strict mode
- Vue 3 Composition API with `<script setup lang="ts">`
- Use `ref()` for primitives, `reactive()` for objects
- Error handling: `try/catch` with `error instanceof Error`
- Component naming: PascalCase for components, kebab-case in templates
- Tailwind CSS classes only, no inline styles
- Internationalization with `useI18n()` composable
- Auth via `useAuthClient()` from `better-auth/vue`
- Database queries via Kysely with proper typing

## Icons

- Use `unplugin-icons` (configured in nuxt configs)
- Import: `import BellIcon from '~icons/heroicons/bell'`
- Usage: `<BellIcon class="h-6 w-6" />`
- **Do NOT use inline SVGs, `<img>` tags for icons, or other icon libraries directly**

## Framework Quirks

- `apps/web` uses `radix-vue/nuxt`, `@nuxt/content`, `@nuxt/image`, `@nuxtjs/seo`
- `apps/db` uses `shadcn-nuxt` with component prefix `Ui` and components in `./app/components/ui`
- `apps/db` Nitro preset is `node-server` with `experimental.database` enabled
- `apps/db` runtime config has `public.isReadOnly` overridden by `--allow-write` CLI flag
- Kysely config lives at `apps/web/.config/kysely.config.ts`
- Migrations live in `apps/web/migrations/`
- `db:migrate:generate` writes generated types to `packages/shared/types.d.ts`

## Testing

- **Integration tests preferred** over unit tests for API endpoints and full flows
- Use `@nuxt/test-utils/e2e` for API route testing with real HTTP calls
- `apps/web` vitest projects: `unit`, `e2e`, `nuxt` (components)
- `apps/db` vitest projects: `unit`, `nuxt`, `e2e`

Fast mode (recommended for e2e):
```bash
# Terminal 1
pnpm dev --port 3001

# Terminal 2
TEST_HOST=http://localhost:3001 pnpm vitest run test/e2e/
```

Slow mode (isolated, ~20s per file startup):
```bash
pnpm vitest run test/e2e/notifications.get.spec.ts
```

All e2e tests must support `TEST_HOST`:
```typescript
await setup({ host: process.env.TEST_HOST })
```

## Testing Tips

- Vitest swallows `console.log`. Use `throw new Error(JSON.stringify(value))` to inspect values in test output.

## Tools

- Use `web_search` MCP to search the web
- Use `browser` MCP to check application state and take actions
