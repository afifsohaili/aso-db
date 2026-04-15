import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import QueryHistorySidebar from '~/components/query-history-sidebar.vue'

describe('query-history-sidebar', () => {
  const savedQueries = [
    { id: 1, title: 'Users Query', sqlContent: 'SELECT * FROM users', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]

  const history = [
    { id: 10, sqlContent: 'SELECT 1', executedAt: new Date().toISOString(), durationMs: 5, rowCount: 1, errorMessage: null, savedQueryId: null },
  ]

  it('renders saved queries and history', async () => {
    const wrapper = await mountSuspended(QueryHistorySidebar, {
      props: { savedQueries, history },
    })
    expect(wrapper.text()).toContain('Users Query')
    expect(wrapper.text()).toContain('SELECT 1')
  })

  it('emits load-saved when a saved query is clicked', async () => {
    const wrapper = await mountSuspended(QueryHistorySidebar, {
      props: { savedQueries, history },
    })
    const btn = wrapper.findAll('button').find(b => b.text().includes('Users Query'))
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    expect(wrapper.emitted('load-saved')).toHaveLength(1)
  })

  it('emits create-new when plus button is clicked', async () => {
    const wrapper = await mountSuspended(QueryHistorySidebar, {
      props: { savedQueries, history },
    })
    const buttons = wrapper.findAll('button')
    const plusBtn = buttons.find(b => b.attributes('title') === 'New query')
    expect(plusBtn).toBeDefined()
    await plusBtn!.trigger('click')
    expect(wrapper.emitted('create-new')).toHaveLength(1)
  })

  it('emits star-history when star button is clicked', async () => {
    const wrapper = await mountSuspended(QueryHistorySidebar, {
      props: { savedQueries, history },
    })
    const buttons = wrapper.findAll('button')
    const starBtn = buttons.find(b => b.attributes('title') === 'Star')
    expect(starBtn).toBeDefined()
    await starBtn!.trigger('click')
    expect(wrapper.emitted('star-history')).toHaveLength(1)
  })

  it('emits delete-saved when trash button is clicked', async () => {
    const wrapper = await mountSuspended(QueryHistorySidebar, {
      props: { savedQueries, history },
    })
    const buttons = wrapper.findAll('button')
    const trashBtn = buttons.find(b => b.attributes('title') === 'Delete')
    expect(trashBtn).toBeDefined()
    await trashBtn!.trigger('click')
    expect(wrapper.emitted('delete-saved')).toHaveLength(1)
  })
})
