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

  const mockColumns = ['id', 'name', 'email', 'created_at']
  const mockRecords = [
    { id: 1, name: 'Alice', email: 'alice@example.com', created_at: '2024-01-01' },
    { id: 2, name: 'Bob', email: 'bob@example.com', created_at: '2024-01-02' },
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
    expect(component.text()).toContain('bob@example.com')
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