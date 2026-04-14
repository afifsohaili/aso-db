import { describe, expect, it } from 'vitest'
import { setup } from '@nuxt/test-utils/e2e'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TableGrid from '~/components/table-grid.vue'
import type { TableInfo } from '~/shared/types/table'

describe('TableGrid', async () => {
  await setup({
    nuxtConfig: {
      runtimeConfig: {
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
      },
    },
  })

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

    expect(component.text()).toContain('public.users')
    expect(component.text()).toContain('analytics.events')
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

  it('applies dark theme styling', async () => {
    const component = await mountSuspended(TableGrid, {
      props: {
        tables: mockTables,
      },
    })

    // Check for dark theme classes
    expect(component.find('.bg-gray-900').exists()).toBe(true)
  })
})