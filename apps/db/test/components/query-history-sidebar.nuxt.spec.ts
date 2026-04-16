import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import QueryHistorySidebar from '~/components/query-history-sidebar.vue'
import { Button } from '~/components/ui/button'

describe('QueryHistorySidebar', () => {
  const mockSavedQueries = [
    { id: '1', title: 'Users Query', sqlContent: 'SELECT * FROM users' },
    { id: '2', title: 'Posts Query', sqlContent: 'SELECT * FROM posts' },
  ]

  const mockHistory = [
    { id: '1', sqlContent: 'SELECT * FROM users', executedAt: '2024-01-01T10:00:00Z', isStarred: false },
    { id: '2', sqlContent: 'SELECT * FROM posts', executedAt: '2024-01-01T11:00:00Z', isStarred: true },
  ]

  it('renders saved queries and history', async () => {
    const wrapper = await mountSuspended(QueryHistorySidebar, {
      props: {
        savedQueries: mockSavedQueries,
        history: mockHistory,
      },
    })

    expect(wrapper.text()).toContain('Saved Queries')
    expect(wrapper.text()).toContain('Recent History')
    expect(wrapper.text()).toContain('Users Query')
    expect(wrapper.text()).toContain('Posts Query')
  })

  it('emits load-saved when clicking a saved query', async () => {
    const wrapper = await mountSuspended(QueryHistorySidebar, {
      props: {
        savedQueries: mockSavedQueries,
        history: mockHistory,
      },
    })

    const items = wrapper.findAll('.cursor-pointer')
    const savedQueryItem = items.find(el => el.text().includes('Users Query'))
    await savedQueryItem?.trigger('click')

    expect(wrapper.emitted('load-saved')).toHaveLength(1)
    expect(wrapper.emitted('load-saved')![0]).toEqual([mockSavedQueries[0]])
  })

  it('emits create-new when clicking New Query button', async () => {
    const wrapper = await mountSuspended(QueryHistorySidebar, {
      props: {
        savedQueries: mockSavedQueries,
        history: mockHistory,
      },
    })

    const buttons = wrapper.findAllComponents(Button)
    const newQueryButton = buttons.find(b => b.text().includes('New Query'))
    await newQueryButton?.trigger('click')

    expect(wrapper.emitted('create-new')).toHaveLength(1)
  })

  it('emits star-history when clicking star button', async () => {
    const wrapper = await mountSuspended(QueryHistorySidebar, {
      props: {
        savedQueries: mockSavedQueries,
        history: mockHistory,
      },
    })

    const starButtons = wrapper.findAllComponents(Button).filter(b => b.attributes('aria-label')?.includes('Star query') || b.attributes('aria-label')?.includes('Unstar query'))
    await starButtons[0]?.trigger('click')

    expect(wrapper.emitted('star-history')).toHaveLength(1)
    expect(wrapper.emitted('star-history')![0]).toEqual([mockHistory[0]])
  })

  it('emits delete-saved when clicking delete button', async () => {
    const wrapper = await mountSuspended(QueryHistorySidebar, {
      props: {
        savedQueries: mockSavedQueries,
        history: mockHistory,
      },
    })

    const deleteButton = wrapper.findAllComponents(Button).find(b => b.attributes('aria-label') === 'Delete saved query')
    await deleteButton?.trigger('click')

    expect(wrapper.emitted('delete-saved')).toHaveLength(1)
    expect(wrapper.emitted('delete-saved')![0]).toEqual([mockSavedQueries[0]])
  })
})
