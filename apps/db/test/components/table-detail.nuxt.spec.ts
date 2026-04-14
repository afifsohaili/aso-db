import { describe, expect, it } from 'vitest'
import { setup } from '@nuxt/test-utils/e2e'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TableDetail from '~/components/table-detail.vue'

describe('TableDetail', async () => {
  await setup({
    nuxtConfig: {
      runtimeConfig: {
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
      },
    },
  })

  const mockColumns = ['id', 'name', 'is_active', 'created_at']
  const mockRecords = [
    { id: 1, name: 'Alice', is_active: true, created_at: '2024-01-01' },
    { id: 2, name: 'Bob', is_active: false, created_at: '2024-01-02' },
  ]

  it('renders column headers', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: mockRecords,
        totalCount: 2,
      },
    })

    mockColumns.forEach(col => {
      expect(component.text()).toContain(col)
    })
  })

  it('renders records correctly', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: mockRecords,
        totalCount: 2,
      },
    })

    expect(component.text()).toContain('Alice')
    expect(component.text()).toContain('true')
    expect(component.text()).toContain('false')
  })

  it('handles empty records array', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: [],
        totalCount: 0,
      },
    })

    expect(component.text()).toContain('No records found')
  })

  it('formats null values correctly', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: ['id', 'nullable_col'],
        records: [{ id: 1, nullable_col: null }],
        totalCount: 1,
      },
    })

    expect(component.text()).toContain('null')
  })

  it('renders boolean values as badges', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: ['id', 'is_active'],
        records: [
          { id: 1, is_active: true },
          { id: 2, is_active: false },
        ],
        totalCount: 2,
      },
    })

    // True should have green badge class
    expect(component.html()).toContain('bg-green-500/50')
    // False should have red badge class
    expect(component.html()).toContain('bg-red-500/50')
  })

  it('emits update:sort when clicking a header', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: mockRecords,
        totalCount: 2,
        sort: { column: null, direction: null },
      },
    })

    const header = component.findAll('th')[0] // 'id' column
    await header.trigger('click')

    expect(component.emitted('update:sort')).toHaveLength(1)
    expect(component.emitted('update:sort')![0]).toEqual([{ column: 'id', direction: 'asc' }])
  })

  it('cycles sort direction on repeated header clicks', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: mockRecords,
        totalCount: 2,
        sort: { column: 'id', direction: 'asc' },
      },
    })

    const header = component.findAll('th')[0] // 'id' column
    await header.trigger('click')

    expect(component.emitted('update:sort')![0]).toEqual([{ column: 'id', direction: 'desc' }])
  })

  it('shows different sort icons based on sort state', async () => {
    const componentAsc = await mountSuspended(TableDetail, {
      props: {
        columns: ['id'],
        records: [{ id: 1 }],
        totalCount: 1,
        sort: { column: 'id', direction: 'asc' },
      },
    })

    // ArrowUp icon should be present for asc sort
    expect(componentAsc.html()).toContain('arrow-up')

    const componentDesc = await mountSuspended(TableDetail, {
      props: {
        columns: ['id'],
        records: [{ id: 1 }],
        totalCount: 1,
        sort: { column: 'id', direction: 'desc' },
      },
    })

    // ArrowDown icon should be present for desc sort
    expect(componentDesc.html()).toContain('arrow-down')
  })

  it('applies dark theme styling', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: mockRecords,
        totalCount: 2,
      },
    })

    expect(component.find('.bg-gray-900').exists()).toBe(true)
  })
})