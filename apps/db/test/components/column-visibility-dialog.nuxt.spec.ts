import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ColumnVisibilityDialog from '@/components/column-visibility-dialog'

describe('column-visibility-dialog logic', () => {
  const columns = ['id', 'name', 'email', 'created_at', 'updated_at']

  it('initializes localVisible from visibleColumns prop', async () => {
    const component = await mountSuspended(ColumnVisibilityDialog, {
      props: {
        modelValue: true,
        columns,
        visibleColumns: ['id', 'name'],
      },
    })

    expect(component.vm.localVisible).toEqual(['id', 'name'])
  })

  it('filters columns by search query', async () => {
    const component = await mountSuspended(ColumnVisibilityDialog, {
      props: {
        modelValue: true,
        columns,
        visibleColumns: ['id', 'name'],
      },
    })

    component.vm.searchQuery = 'id'
    await component.vm.$nextTick()

    expect(component.vm.filteredColumns).toEqual(['id'])
  })

  it('toggles column visibility', async () => {
    const component = await mountSuspended(ColumnVisibilityDialog, {
      props: {
        modelValue: true,
        columns,
        visibleColumns: ['id', 'name'],
      },
    })

    // Toggle off
    component.vm.toggleColumn('id')
    expect(component.vm.localVisible).toEqual(['name'])

    // Toggle on
    component.vm.toggleColumn('email')
    expect(component.vm.localVisible).toEqual(['name', 'email'])
  })

  it('emits update:visibleColumns on apply', async () => {
    const component = await mountSuspended(ColumnVisibilityDialog, {
      props: {
        modelValue: true,
        columns,
        visibleColumns: ['id', 'name'],
      },
    })

    component.vm.localVisible = ['id', 'name', 'email']
    component.vm.apply()

    const emitted = component.emitted()
    expect(emitted['update:visibleColumns']).toBeDefined()
    expect(emitted['update:visibleColumns']![0]).toEqual([['id', 'name', 'email']])
    expect(emitted['update:modelValue']![0]).toEqual([false])
  })

  it('resets localVisible on cancel', async () => {
    const component = await mountSuspended(ColumnVisibilityDialog, {
      props: {
        modelValue: true,
        columns,
        visibleColumns: ['id', 'name'],
      },
    })

    component.vm.localVisible = ['email']
    component.vm.cancel()

    const emitted = component.emitted()
    expect(emitted['update:modelValue']![0]).toEqual([false])
    // localVisible should be reset to prop value
    expect(component.vm.localVisible).toEqual(['id', 'name'])
  })

  it('showAll selects all columns', async () => {
    const component = await mountSuspended(ColumnVisibilityDialog, {
      props: {
        modelValue: true,
        columns,
        visibleColumns: ['id'],
      },
    })

    component.vm.showAll()
    expect(component.vm.localVisible).toEqual(columns)
  })

  it('hideAll deselects all columns', async () => {
    const component = await mountSuspended(ColumnVisibilityDialog, {
      props: {
        modelValue: true,
        columns,
        visibleColumns: ['id', 'name', 'email'],
      },
    })

    component.vm.hideAll()
    expect(component.vm.localVisible).toEqual([])
  })
})
