import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import TableDetail from '@/components/table-detail'

describe('table-detail visible columns', () => {
  const columns = ['id', 'name', 'email', 'created_at']
  const records = [
    { id: 1, name: 'Alice', email: 'alice@example.com', created_at: '2024-01-01' },
    { id: 2, name: 'Bob', email: 'bob@example.com', created_at: '2024-01-02' },
  ]

  it('shows only specified visible columns', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns,
        records,
        visibleColumns: ['id', 'name'],
      },
    })

    const headers = component.findAll('th')
    expect(headers.length).toBe(2)
    expect(headers[0]!.text()).toContain('id')
    expect(headers[1]!.text()).toContain('name')

    // email and created_at should not be visible
    expect(component.text()).not.toContain('email')
    expect(component.text()).not.toContain('created_at')
  })

  it('shows all columns when visibleColumns is empty array', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns,
        records,
        visibleColumns: [],
      },
    })

    // Empty array means show all (fallback behavior)
    const headers = component.findAll('th')
    expect(headers.length).toBe(4)
  })

  it('shows all columns when visibleColumns is undefined', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns,
        records,
      },
    })

    const headers = component.findAll('th')
    expect(headers.length).toBe(4)
    expect(headers[0]!.text()).toContain('id')
    expect(headers[1]!.text()).toContain('name')
    expect(headers[2]!.text()).toContain('email')
    expect(headers[3]!.text()).toContain('created_at')
  })

  it('renders data only for visible columns', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns,
        records,
        visibleColumns: ['name', 'email'],
      },
    })

    const cells = component.findAll('td')
    // 2 records x 2 columns = 4 cells
    expect(cells.length).toBe(4)
    expect(cells[0]!.text()).toContain('Alice')
    expect(cells[1]!.text()).toContain('alice@example.com')
    expect(cells[2]!.text()).toContain('Bob')
    expect(cells[3]!.text()).toContain('bob@example.com')
  })

  it('colspan is correct for empty state with filtered columns', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns,
        records: [],
        visibleColumns: ['id', 'name'],
      },
    })

    const emptyCell = component.find('td[colspan]')
    expect(emptyCell.exists()).toBe(true)
    expect(emptyCell.attributes('colspan')).toBe('2')
  })
})
