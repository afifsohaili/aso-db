import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CommandPalette from '~/components/command-palette.vue'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import type { TableInfo } from '~/shared/types/table'

describe('CommandPalette', () => {

  const mockTables: TableInfo[] = [
    { schema: 'public', name: 'users' },
    { schema: 'public', name: 'posts' },
    { schema: 'analytics', name: 'events' },
    { schema: 'analytics', name: 'page_views' },
  ]

  it('is initially hidden', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        tables: mockTables,
        modelValue: false,
      },
    })

    expect(component.findComponent(CommandDialog).exists()).toBe(true)
    expect(component.findComponent(CommandInput).exists()).toBe(false)
  })

  it('opens when modelValue is true', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        tables: mockTables,
        modelValue: true,
      },
    })

    expect(component.findComponent(CommandInput).exists()).toBe(true)
  })

  it('displays all tables when open', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        tables: mockTables,
        modelValue: true,
      },
    })

    const items = component.findAllComponents(CommandItem)
    expect(items.length).toBe(mockTables.length)
    mockTables.forEach((table, index) => {
      expect(items[index].text()).toContain(table.name)
    })
  })

  it('filters tables by search term', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        tables: mockTables,
        modelValue: true,
      },
    })

    const input = component.findComponent(CommandInput).find('input')
    await input.setValue('users')
    // allow reka-ui command filtering to flush
    await new Promise(r => setTimeout(r, 0))

    const items = component.findAllComponents(CommandItem)
    expect(items.some(item => item.text().includes('users'))).toBe(true)
    expect(items.some(item => item.text().includes('posts'))).toBe(false)
    expect(items.some(item => item.text().includes('events'))).toBe(false)
  })

  it('emits select event when clicking a table', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        tables: mockTables,
        modelValue: true,
      },
    })

    const tableItem = component.findAllComponents(CommandItem)[0]
    await tableItem.trigger('click')

    expect(component.emitted('select')).toHaveLength(1)
    expect(component.emitted('select')![0]).toEqual([mockTables[0]])
  })

  it('emits update:modelValue false when dialog closes', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        tables: mockTables,
        modelValue: true,
      },
    })

    const dialog = component.findComponent(CommandDialog)
    dialog.vm.$emit('update:open', false)

    expect(component.emitted('update:modelValue')).toHaveLength(1)
    expect(component.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('shows no results message when search has no matches', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        tables: mockTables,
        modelValue: true,
      },
    })

    const input = component.findComponent(CommandInput).find('input')
    await input.setValue('xyznonexistent')
    // allow reka-ui command filtering to flush
    await new Promise(r => setTimeout(r, 0))

    expect(component.findAll('[data-testid="table-item"]').length).toBe(0)
  })

  it('filters tables with fuzzy search', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        tables: mockTables,
        modelValue: true,
      },
    })

    const input = component.findComponent(CommandInput).find('input')
    // Typo: 'usrs' should still match 'users' via fuzzy search
    await input.setValue('usrs')
    // allow fuse.js filtering to flush
    await new Promise(r => setTimeout(r, 0))

    const items = component.findAllComponents(CommandItem)
    expect(items.some(item => item.text().includes('users'))).toBe(true)
    expect(items.some(item => item.text().includes('posts'))).toBe(false)
  })
})
