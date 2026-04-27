import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import VueJsonPretty from 'vue-json-pretty'
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

  it('pretty-prints JSON object values', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: ['id', 'metadata'],
        records: [
          { id: 1, metadata: { name: 'Alice', tags: ['a', 'b'] } },
        ],
      },
    })

    const html = component.html()
    expect(html).toContain('"name": "Alice"')
    expect(html).toContain('"tags": [')
  })

  it('pretty-prints JSON string values', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: ['id', 'metadata'],
        records: [
          { id: 1, metadata: '{"name":"Alice","active":true}' },
        ],
      },
    })

    const html = component.html()
    expect(html).toContain('"name": "Alice"')
    expect(html).toContain('"active": true')
  })

  it('applies whitespace-pre class to JSON values', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: ['id', 'metadata'],
        records: [
          { id: 1, metadata: { name: 'Alice' } },
        ],
      },
    })

    const html = component.html()
    expect(html).toContain('whitespace-pre')
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
    // Arrow-up icon SVG path from lucide
    expect(html).toContain('m5 12l7-7l7 7m-7 7V5')
  })

  it('renders JSON cells as clickable with cursor-pointer', async () => {
    const component = await mountSuspended(TableDetail, {
      props: {
        columns: ['id', 'metadata'],
        records: [
          { id: 1, metadata: { name: 'Alice', tags: ['a', 'b'] } },
        ],
      },
    })

    const html = component.html()
    expect(html).toContain('cursor-pointer')
  })

  it('opens modal with VueJsonPretty when JSON cell is clicked', async () => {
    const component = await mountSuspended(TableDetail, {
      attachTo: document.body,
      props: {
        columns: ['id', 'metadata'],
        records: [
          { id: 1, metadata: { name: 'Alice', tags: ['a', 'b'] } },
        ],
      },
    })

    // Find JSON cell by looking for whitespace-pre in data cells (not headers)
    const jsonCell = component.find('td .cursor-pointer')
    await jsonCell.trigger('click')

    // Dialog uses teleport, search in document.body
    const vueJsonPretty = component.findComponent(VueJsonPretty)
    expect(vueJsonPretty.exists()).toBe(true)
    expect(vueJsonPretty.props('data')).toEqual({ name: 'Alice', tags: ['a', 'b'] })
  })

  it('opens modal with parsed JSON string data when clicked', async () => {
    const component = await mountSuspended(TableDetail, {
      attachTo: document.body,
      props: {
        columns: ['id', 'metadata'],
        records: [
          { id: 1, metadata: '{"name":"Alice","active":true}' },
        ],
      },
    })

    const jsonCell = component.find('td .cursor-pointer')
    await jsonCell.trigger('click')

    const vueJsonPretty = component.findComponent(VueJsonPretty)
    expect(vueJsonPretty.exists()).toBe(true)
    expect(vueJsonPretty.props('data')).toEqual({ name: 'Alice', active: true })
  })

  it('shows column name as dialog title in JSON modal', async () => {
    const component = await mountSuspended(TableDetail, {
      attachTo: document.body,
      props: {
        columns: ['id', 'metadata'],
        records: [
          { id: 1, metadata: { name: 'Alice' } },
        ],
      },
    })

    const jsonCell = component.find('td .cursor-pointer')
    await jsonCell.trigger('click')

    expect(component.text()).toContain('metadata')
  })

  it('truncates JSON values to 7 lines in table cell', async () => {
    const deepObject: Record<string, any> = {}
    for (let i = 0; i < 10; i++) {
      deepObject[`key${i}`] = `value${i}`
    }

    const component = await mountSuspended(TableDetail, {
      props: {
        columns: ['id', 'metadata'],
        records: [
          { id: 1, metadata: deepObject },
        ],
      },
    })

    const jsonCell = component.find('td .cursor-pointer')
    const cellText = jsonCell.text()
    const lineCount = cellText.split('\n').length
    expect(lineCount).toBeLessThanOrEqual(8) // 7 lines + "..."
    expect(cellText).toContain('...')
  })
})
