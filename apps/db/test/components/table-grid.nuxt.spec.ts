import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TableGrid from '~/components/table-grid.vue'
import { Card } from '~/components/ui/card'
import type { TableInfo } from '~/shared/types/table'

describe('TableGrid', () => {

  const mockTables: TableInfo[] = [
    { schema: 'public', name: 'users' },
    { schema: 'public', name: 'posts' },
    { schema: 'analytics', name: 'events' },
  ]

  it('renders list of tables', async () => {
    const component = await mountSuspended(TableGrid, {
      props: {
        tables: mockTables,
      },
    })

    expect(component.text()).toContain('users')
    expect(component.text()).toContain('posts')
    expect(component.text()).toContain('events')
  })

  it('displays schema.name format for each table', async () => {
    const component = await mountSuspended(TableGrid, {
      props: {
        tables: mockTables,
      },
    })

    mockTables.forEach((table) => {
      expect(component.text()).toContain(table.schema)
      expect(component.text()).toContain(table.name)
    })
  })

  it('links to correct table detail route', async () => {
    const component = await mountSuspended(TableGrid, {
      props: {
        tables: mockTables,
      },
    })

    const links = component.findAll('a')
    expect(links.length).toBe(3)
    
    // Check first link has correct href
    expect(links[0].attributes('href')).toBe('/table/public/users')
  })

  it('renders empty state when no tables', async () => {
    const component = await mountSuspended(TableGrid, {
      props: {
        tables: [],
      },
    })

    expect(component.text()).toContain('No tables found')
  })

  it('renders tables as cards', async () => {
    const component = await mountSuspended(TableGrid, {
      props: {
        tables: mockTables,
      },
    })

    const cards = component.findAllComponents(Card)
    expect(cards.length).toBe(3)
  })
})