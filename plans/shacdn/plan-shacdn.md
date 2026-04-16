# shadcn-vue Integration Plan for ASO-DB

> **Status:** Implementation in progress — `apps/db` migration complete, `apps/web` pending  
> **Goal:** Full theming swap to shadcn-vue in `apps/db` and `apps/web` with preset-based theming  
> **Starting Preset:** `reka-nova` (swappable via CLI)  
> **Priority:** `apps/db` first, then `apps/web`

---

## Implementation Status

| Plan | Task | Status | Notes |
|------|------|--------|-------|
| 001 | Create `@monorepo/theme` package | Done | `useTheme()` + `ThemeToggle.vue` |
| 002 | Bootstrap shadcn-vue in `apps/db` | Done | Used `nova` preset (CLI name for reka-nova) |
| 003 | `/overview` page shell + layout | Done | Theme toggle wired, e2e test added |
| 004 | `TableGrid` → `UiCard` | Done | Component test updated |
| 005 | `CommandPalette` → `UiCommandDialog` | Done | Fuzzy filter kept, test updated |
| 006 | `Pagination` → `UiButton` + `UiSelect` | Done | |
| 007 | `QueryResults` → `UiCard` + `UiAlert` + `UiSkeleton` | Done | |
| 008 | `QueryEditor` chrome → shadcn | Done | CodeMirror kept, tooltip provider added |
| 009 | `TableDetail` → `UiTable` + `UiBadge` | Done | Sorting logic preserved |
| 010 | `QueryHistorySidebar` → `UiCollapsible` + `UiScrollArea` | Done | Fixed `title`/`sqlContent` type mismatches |
| 011 | `query.vue` page shell | Done | Fixed API payload bugs, replaced missing compress icon |
| 012 | Bootstrap shadcn-vue in `apps/web` | Todo | Low priority |
| 013 | Migrate `apps/web` components | Todo | Low priority |

**Known Issue:** `apps/db` component tests fail globally due to `@nuxt/test-utils` environment regression after adding `shadcn-nuxt`. E2E tests and `pnpm build` pass. This needs investigation before relying on component test suite.

---

## 1. Project Context

### 1.1 Current Stack
- **Framework:** Nuxt 4.3.1
- **Styling:** Tailwind CSS v4.1.17 + `@tailwindcss/vite`
- **Language:** TypeScript (strict mode)
- **Icons:** `unplugin-icons` with `~icons/` prefix (lucide, heroicons, mdi)
- **Vue API:** Composition API with `<script setup lang="ts">`
- **Radix already present:** `radix-vue@1.9.17` in both `apps/db` and `apps/web`
- **Monorepo packages:** `@monorepo/shared` (DB types), `@monorepo/components` (component exports)

### 1.2 `apps/db` Comprehensive Component Audit

| Component | File | Current Implementation | shadcn Replacement |
|-----------|------|------------------------|-------------------|
| Layout | `app/layouts/default.vue` | `min-h-screen bg-gray-950` wrapper | `bg-background` via preset |
| Query Page | `app/pages/query.vue` | Three-pane resizable layout, header with badges, connection popover, write-mode warning | `Badge`, `Button`, `Separator`, `Tooltip`, `Card`, `Sheet` |
| Overview Page | `app/pages/overview.vue` | Header, table count, `TableGrid`, `CommandPalette` trigger, keyboard hint | `Card`, `Badge`, `Command` |
| Table Detail Page | `app/pages/table/[schema]/[name].vue` | Back button + breadcrumb, `TableDetail`, `Pagination`, error states | `Button`, `Breadcrumb`, `Table`, `Skeleton`, `Alert` |
| Redirect | `app/pages/index.vue` | `navigateTo('/overview')` | No change |
| Query Editor | `app/components/query-editor.vue` | CodeMirror 6 + custom toolbar. Hard-coded `bg-blue-600`, `bg-gray-800`/`bg-red-600`, `bg-gray-950` | Keep CodeMirror, wrap in `Button`, `Badge`, `Separator`, `Tooltip`, `Card` |
| Query Results | `app/components/query-results.vue` | Loading/empty/error cards. Hard-coded `border-gray-700 bg-gray-900` vs `border-red-700 bg-red-900/20` | `Card`, `Alert`, `Skeleton` |
| Query History Sidebar | `app/components/query-history-sidebar.vue` | Collapsible sidebar. Hard-coded `w-64 border-r border-gray-700 bg-gray-900` | `Collapsible`, `ScrollArea`, `Button`, `Tooltip`, `Separator`, `Badge` |
| Table Detail (data grid) | `app/components/table-detail.vue` | Native HTML `<table>` with sorting. Hard-coded gray colors, boolean badges | `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`, `Badge` |
| Command Palette | `app/components/command-palette.vue` | Teleported modal overlay. Hard-coded `bg-black/50`, `bg-gray-900` container | `CommandDialog`, `CommandInput`, `CommandList`, `CommandItem`, `CommandEmpty` |
| Pagination | `app/components/pagination.vue` | Native `<select>`, prev/next buttons. Hard-coded `bg-gray-800 border-gray-700` | `Button`, `Select` |
| Table Grid | `app/components/table-grid.vue` | Grid of table cards. Hard-coded gray backgrounds and borders | `Card`, `CardHeader`, `CardTitle`, `CardContent` |

**CSS:** `app/assets/css/main.css` has `@import 'tailwindcss';`, `@plugin '@tailwindcss/typography';`, hard-coded `color-scheme: dark` in `:root`, and default border color `var(--color-gray-700, currentcolor)`.

### 1.3 `apps/web` UI State
Marketing site with lighter theme (`border-gray-200` default):
- Auth forms (`login-form.vue`, `signup-form.vue`): native inputs, custom buttons
- Landing page: hero, features, testimonials, FAQ, CTA sections
- Notifications UI
- `floating-dialog.vue`: custom toast/alert
- Admin forms

**Scope for `apps/web`:** shadcn-ify everything, but it's the lowest priority.

---

## 2. shadcn-vue Research

### 2.1 Nuxt 4 Installation
1. `pnpm dlx nuxi@latest module add shadcn-nuxt`
2. Register `shadcn-nuxt` in `nuxt.config.ts`
3. `pnpm dlx shadcn-vue@latest init --preset reka-nova`
4. `pnpm dlx shadcn-vue@latest add <component>`

### 2.2 Presets
- `init --preset reka-nova` sets up colors, radius, icon library
- `apply --preset <name|URL>` swaps preset on existing project
- `migrate icons` updates all `components/ui/*` icon imports
- Presets configure `components.json` and base theme CSS

---

## 3. User Decisions (Locked)

| # | Decision | User Input |
|---|----------|------------|
| 1 | **Scope** | `apps/db` AND `apps/web` |
| 2 | **Strategy** | Full theming swap |
| 3 | **Preset** | Start with `reka-nova`. Keep vanilla for easy swapping. |
| 4 | **Components** | All components |
| 5 | **Colors** | Use preset-defined colors |
| 6 | **Icons** | Keep `unplugin-icons` alongside preset icons |
| 7 | **Dark mode** | Add toggle. Default: **dark** for both apps. |
| 8 | **Theme persistence** | **LocalStorage** |
| 9 | **Table detail** | Replace with shadcn `Table` |
| 10 | **Query Editor** | Wrap chrome in shadcn, keep CodeMirror |
| 11 | **Shared preset** | Use `@packages/` shared space for uniform theme logic |
| 12 | **apps/web scope** | shadcn-ify everything |
| 13 | **Priority** | `apps/db` first, `apps/web` last |

---

## 4. Shared Theme Package Plan

### What's Shareable vs Per-App

| Aspect | Shareable? | Approach |
|--------|------------|----------|
| `useTheme()` composable | ✅ Yes | Create in `@monorepo/shared` or new `@monorepo/theme` |
| Theme toggle component | ✅ Yes | Add to `@monorepo/components` |
| LocalStorage persistence | ✅ Yes | Part of shared composable |
| Dark mode class logic | ✅ Yes | Shared composable handles `.dark`/`.light` toggling |
| shadcn preset (colors, radius) | ⚠️ Partial | `components.json` + base CSS are per-app, but we can copy the same preset to both |
| `components/ui/*` components | ❌ No | Generated per-app by shadcn CLI |

### Proposed Shared Package: `@monorepo/theme`
Create `packages/theme/` with:
- `composables/useTheme.ts` — `useColorMode` from `@vueuse/core`, persists to `localStorage`, defaults to `dark`
- `components/ThemeToggle.vue` — button that cycles light/dark/system (or just light/dark)
- `styles/theme.css` — optional shared CSS tokens if we want both apps to share exact variable overrides

Alternatively, add to existing `@monorepo/shared`:
- Less overhead, but `@monorepo/shared` currently only has DB types
- **Recommendation:** Create `packages/theme/` for clarity and future expansion

### How Each App Uses It
**`apps/db/nuxt.config.ts`:**
```ts
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  // ...
})
```

**`apps/db/app/app.vue`:**
```vue
<script setup lang="ts">
import { useTheme } from '@monorepo/theme/composables/useTheme'
useTheme()
</script>
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

**`apps/db/app/layouts/default.vue`:**
```vue
<template>
  <div class="min-h-screen bg-background text-foreground">
    <slot />
  </div>
</template>
```

---

## 5. Implementation Strategy

### Phase 1: Shared Theme Package
1. Create `packages/theme/package.json`
2. Create `packages/theme/composables/useTheme.ts`
3. Create `packages/theme/components/ThemeToggle.vue`
4. Add `@monorepo/theme` to `apps/db/package.json` and `apps/web/package.json`
5. Verify monorepo resolution works

### Phase 2: Bootstrap `apps/db` with shadcn-vue
1. Install `shadcn-nuxt` module in `apps/db`
2. Add `shadcn` config to `apps/db/nuxt.config.ts`
3. Run `pnpm dlx shadcn-vue@latest init --preset reka-nova` in `apps/db`
4. Update `main.css` to remove hard-coded `:root { color-scheme: dark; }` and use class-based theming
5. Integrate `useTheme()` in `app.vue`
6. Add `ThemeToggle` to `query.vue` header
7. Run `nuxt prepare` and verify build

### Phase 3: `apps/db` Component Migration (in order)

| Order | Component | shadcn Components Needed | Est. Effort |
|-------|-----------|--------------------------|-------------|
| 1 | `Pagination` | `Button`, `Select` | Small |
| 2 | `query-results.vue` | `Card`, `Alert`, `Skeleton` | Small |
| 3 | `query-editor.vue` (chrome) | `Button`, `Badge`, `Separator`, `Tooltip`, `Card` | Medium |
| 4 | `table-detail.vue` | `Table`, `Badge` | Medium |
| 5 | `query-history-sidebar.vue` | `Collapsible`, `ScrollArea`, `Button`, `Tooltip`, `Separator` | Medium |
| 6 | `command-palette.vue` | `CommandDialog`, `CommandInput`, `CommandList`, `CommandItem`, `CommandEmpty` | Medium |
| 7 | `table-grid.vue` | `Card` | Small |
| 8 | `query.vue` (page shell) | `Sheet`, `Popover`, `Badge`, `Button`, `Separator` | Medium |
| 9 | `overview.vue` | `Card`, `Badge`, `Command` | Small |
| 10 | `table/[schema]/[name].vue` | `Breadcrumb`, `Button`, `Table`, `Skeleton`, `Alert` | Small |
| 11 | `layouts/default.vue` | `bg-background text-foreground` | Tiny |

### Phase 4: `apps/web` Bootstrap (low priority)
1. Install `shadcn-nuxt` in `apps/web`
2. Run `shadcn-vue@latest init --preset reka-nova`
3. Integrate shared `useTheme()` and `ThemeToggle`
4. Migrate auth forms, floating dialog, notifications, admin forms, landing page sections

### Phase 5: Testing & Verification
1. `pnpm lint:fix`
2. `vitest run`
3. Test dark/light toggle in `apps/db`
4. Test preset swap: `pnpm dlx shadcn-vue@latest apply --preset reka-vega`

---

## 6. Detailed Component Mapping

### `Pagination.vue` → `UiButton` + `UiSelect`
- Replace native `<select>` with `UiSelect` for rows-per-page
- Replace prev/next buttons with `UiButton` (variants: `outline`, `default`, `ghost`)
- Use `ChevronLeft` / `ChevronRight` icons (from preset or `unplugin-icons`)

### `query-results.vue` → `UiCard` + `UiAlert` + `UiSkeleton`
- Loading state: `UiSkeleton` lines
- Empty state: `UiCard` with muted text
- Error state: `UiAlert` with `variant="destructive"`
- Success state: `UiCard` containing `TableDetail`

### `query-editor.vue` → `UiCard` + `UiButton` + `UiBadge` + `UiSeparator` + `UiTooltip`
- Wrap editor in `UiCard`
- Toolbar buttons: `UiButton` with `UiTooltip`
- Status badges (read-only, write mode): `UiBadge` (variants: `secondary`, `destructive`)
- Separator between toolbar sections: `UiSeparator`

### `table-detail.vue` → `UiTable`
- Replace native `<table>` with `UiTable`, `UiTableHeader`, `UiTableBody`, `UiTableRow`, `UiTableHead`, `UiTableCell`
- Sort indicators: `UiButton` ghost with arrow icons
- Boolean values: `UiBadge` (variants for true/false)
- Null values: `span` with `text-muted-foreground italic`

### `query-history-sidebar.vue` → `UiCollapsible` + `UiScrollArea` + `UiButton`
- Sections as `UiCollapsible` (trigger + content)
- List inside `UiScrollArea`
- Action buttons (load, star, delete) as `UiButton` `variant="ghost"` `size="icon"`
- Wrap in `UiCard` or plain `div` with `border-r`

### `command-palette.vue` → `UiCommandDialog`
- Full replacement with `CommandDialog`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandEmpty`
- Much better keyboard navigation and accessibility

### `table-grid.vue` → `UiCard`
- Each table card becomes `UiCard`
- Hover effect comes from `UiCard` or wrapper `UiButton` if cards are clickable

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tailwind v4 + shadcn-vue CLI issues | Test `init` step-by-step; abort and report if CLI fails |
| Dark mode flash on hydration | `useTheme()` runs early in `app.vue`; default is dark |
| `apps/db` losing dev-tool aesthetic | Default to dark; `reka-nova` dark palette should look polished |
| Mixing `unplugin-icons` with preset icons | Keep both; use preset icons only inside `components/ui/*` |
| Large component count to migrate | Migrate incrementally within `apps/db`; test after each batch |
| shadcn `Table` may not support all `TableDetail` features | Keep sorting logic; only swap HTML structure + styling |
| Two apps need identical preset | Document preset name; re-run `apply` on both when swapping |

---

## 8. Immediate Next Steps (Post-Go-Ahead)

1. Create `packages/theme/` with `useTheme()` and `ThemeToggle`
2. Bootstrap `apps/db` with `shadcn-vue@latest init --preset reka-nova`
3. Wire up theme toggle and dark mode in `apps/db`
4. Replace `Pagination.vue` with shadcn components
5. Replace `query-results.vue` with shadcn components
6. Continue down the priority list

---

## 9. Questions Answered

| Question | Answer |
|----------|--------|
| `apps/db` default theme | Dark |
| `apps/web` default theme | Same as `apps/db` (dark) |
| Theme persistence | LocalStorage |
| `apps/web` preset | Same as `apps/db` (`reka-nova`) |
| Shared package | Yes, `@monorepo/theme` in `packages/theme/` |
| `apps/web` scope | shadcn-ify everything |
| Order | `apps/db` first, `apps/web` last |

---

## 10. Reference Links

- shadcn-vue: https://www.shadcn-vue.com/
- Nuxt installation: https://www.shadcn-vue.com/docs/installation/nuxt
- CLI docs: https://www.shadcn-vue.com/docs/cli
- Theming: https://www.shadcn-vue.com/docs/theming
- Preset create page: https://www.shadcn-vue.com/create

