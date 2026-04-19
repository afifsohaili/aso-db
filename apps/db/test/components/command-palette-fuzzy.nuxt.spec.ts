import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import CommandPalette from '@/components/command-palette'
import type { TableInfo } from '@/shared/types/table'

describe('command-palette fuzzy search', () => {
  const tables: TableInfo[] = [
    { schema: 'public', name: 'users' },
    { schema: 'public', name: 'user_profiles' },
    { schema: 'analytics', name: 'user_events' },
    { schema: 'public', name: 'orders' },
    { schema: 'public', name: 'products' },
  ]

  it('filters tables with fuzzy matching via searchQuery prop', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        modelValue: true,
        tables,
      },
    })

    // Set searchQuery directly on component instance
    component.vm.searchQuery = 'us'
    await component.vm.$nextTick()

    // Check filteredTables computed property - 'us' should match 'users', 'user_profiles', 'user_events'
    expect(component.vm.filteredTables.length).toBeGreaterThanOrEqual(1)
    const names = component.vm.filteredTables.map((t: TableInfo) => t.name)
    expect(names).toContain('users')
  })

  it('filters by partial schema.table match', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        modelValue: true,
        tables,
      },
    })

    component.vm.searchQuery = 'analytics'
    await component.vm.$nextTick()

    expect(component.vm.filteredTables.length).toBe(1)
    expect(component.vm.filteredTables[0].name).toBe('user_events')
  })

  it('shows all tables when search is empty', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        modelValue: true,
        tables,
      },
    })

    component.vm.searchQuery = ''
    await component.vm.$nextTick()

    expect(component.vm.filteredTables.length).toBe(tables.length)
  })

  it('returns empty when no fuzzy matches', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        modelValue: true,
        tables,
      },
    })

    component.vm.searchQuery = 'zzzzzzzzz'
    await component.vm.$nextTick()

    expect(component.vm.filteredTables.length).toBe(0)
  })
})
