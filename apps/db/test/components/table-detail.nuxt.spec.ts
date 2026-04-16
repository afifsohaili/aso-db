import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TableDetail from '~/components/table-detail.vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Badge } from '~/components/ui/badge'

describe('TableDetail', () => {
  const mockColumns = ['id', 'email', 'name', 'is_active']
  const mockRecords = [
    { id: 1, email: 'a@b.com', name: 'Alice', is_active: true },
    { id: 2, email: 'b@c.com', name: 'Bob', is_active: false },
    { id: 3, email: null, name: 'Charlie', is_active: true },
  ]

  it('renders column headers', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: mockRecords,
      },
    })

    mockColumns.forEach((column) => {
      expect(component.text()).toContain(column)
    })
  })

  it('renders records', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: mockRecords,
      },
    })

    expect(component.text()).toContain('a@b.com')
    expect(component.text()).toContain('Alice')
    expect(component.text()).toContain('Bob')
  })

  it('shows empty state when no records', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: [],
      },
    })

    expect(component.text()).toContain('No records found')
  })

  it('formats null values', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: mockRecords,
      },
    })

    expect(component.text()).toContain('null')
  })

  it('renders boolean values as badges', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: mockRecords,
      },
    })

    const badges = component.findAllComponents(Badge)
    const badgeTexts = badges.map(b => b.text())
    expect(badgeTexts).toContain('true')
    expect(badgeTexts).toContain('false')
  })

  it('emits update:sort when clicking column header', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: mockRecords,
        sort: {
          column: undefined,
          direction: 'asc',
        },
      },
    })

    const headers = component.findAllComponents(TableHead)
    await headers[0].trigger('click')

    expect(component.emitted('update:sort')).toHaveLength(1)
    expect(component.emitted('update:sort')![0]).toEqual([{ column: 'id', direction: 'asc' }])
  })

  it('cycles sort direction on subsequent clicks', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: mockRecords,
        sort: {
          column: 'id',
          direction: 'asc',
        },
      },
    })

    const headers = component.findAllComponents(TableHead)
    await headers[0].trigger('click')

    expect(component.emitted('update:sort')![0]).toEqual([{ column: 'id', direction: 'desc' }])
  })

  it('shows sort icons', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: mockColumns,
        records: mockRecords,
        sort: {
          column: 'id',
          direction: 'asc',
        },
      },
    })

    const html = component.html()
    expect(html).toContain('lucide-arrow-up')
  })
})
