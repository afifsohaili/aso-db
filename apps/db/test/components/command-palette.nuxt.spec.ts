import { describe, expect, it } from 'vitest'
import { setup } from '@nuxt/test-utils/e2e'
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

describe('CommandPalette', async () => {
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

    mockTables.forEach((table) => {
      expect(component.text()).toContain(table.name)
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

    expect(component.text()).toContain('users')
    expect(component.text()).not.toContain('posts')
    expect(component.text()).not.toContain('events')
  })

  it('emits select event when clicking a table', async () => {
    const component = await mountSuspended(CommandPalette, {
      props: {
        tables: mockTables,
        modelValue: true,
      },
    })

    const tableItem = component.find('[data-testid="table-item"]')
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

    expect(component.findComponent(CommandEmpty).exists()).toBe(true)
    expect(component.text()).toContain('No tables found')
  })
})
