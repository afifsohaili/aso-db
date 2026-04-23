import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ColumnVisibilityDialog from '@/components/column-visibility-dialog'

describe('column-visibility-dialog fuzzy search', () => {
  const columns = [
    'users.id',
    'users.name',
    'users.email',
    'branch_user.user_id',
    'branch_user.branch_id',
    'branches.id',
    'branches.name',
    'branches.location',
  ]

  it('filters columns with fuzzy search', async () => {
    const component = await mountSuspended(ColumnVisibilityDialog, {
      props: {
        modelValue: true,
        columns,
        visibleColumns: ['users.id', 'users.name'],
      },
    })

    // Search "brau" - should match "branch_user.user_id" via fuzzy search
    component.vm.searchQuery = 'brau'
    await component.vm.$nextTick()

    const filtered = component.vm.filteredColumns
    expect(filtered.length).toBeGreaterThanOrEqual(1)
    expect(filtered).toContain('branch_user.user_id')
  })

  it('shows all columns when search is empty', async () => {
    const component = await mountSuspended(ColumnVisibilityDialog, {
      props: {
        modelValue: true,
        columns,
        visibleColumns: ['users.id'],
      },
    })

    component.vm.searchQuery = ''
    await component.vm.$nextTick()

    expect(component.vm.filteredColumns.length).toBe(columns.length)
  })

  it('filters by table name prefix', async () => {
    const component = await mountSuspended(ColumnVisibilityDialog, {
      props: {
        modelValue: true,
        columns,
        visibleColumns: ['users.id'],
      },
    })

    component.vm.searchQuery = 'branch_user'
    await component.vm.$nextTick()

    const filtered = component.vm.filteredColumns
    expect(filtered.length).toBe(2)
    expect(filtered).toContain('branch_user.user_id')
    expect(filtered).toContain('branch_user.branch_id')
  })

  it('handles no fuzzy matches', async () => {
    const component = await mountSuspended(ColumnVisibilityDialog, {
      props: {
        modelValue: true,
        columns,
        visibleColumns: ['users.id'],
      },
    })

    component.vm.searchQuery = 'zzzzzzzzz'
    await component.vm.$nextTick()

    expect(component.vm.filteredColumns.length).toBe(0)
  })
})
