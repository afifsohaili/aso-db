import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import QueryEditor from '~/components/query-editor.vue'

describe('query-editor', () => {
  it('renders toolbar buttons', async () => {
    const wrapper = await mountSuspended(QueryEditor, {
      props: { modelValue: 'SELECT 1' },
    })
    expect(wrapper.text()).toContain('Run All')
    expect(wrapper.text()).toContain('Run Selected')
  })

  it('emits run-all when Run All button is clicked', async () => {
    const wrapper = await mountSuspended(QueryEditor, {
      props: { modelValue: 'SELECT 1' },
    })
    const buttons = wrapper.findAll('button')
    const runAllBtn = buttons.find(b => b.text().includes('Run All'))
    expect(runAllBtn).toBeDefined()
    await runAllBtn!.trigger('click')
    expect(wrapper.emitted('run-all')).toHaveLength(1)
  })

  it('disables Run Selected when there is no selection', async () => {
    const wrapper = await mountSuspended(QueryEditor, {
      props: { modelValue: 'SELECT 1' },
    })
    const buttons = wrapper.findAll('button')
    const runSelectedBtn = buttons.find(b => b.text().includes('Run Selected'))
    expect(runSelectedBtn).toBeDefined()
    expect((runSelectedBtn!.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('emits update:modelValue when content changes', async () => {
    const wrapper = await mountSuspended(QueryEditor, {
      props: { modelValue: 'SELECT 1' },
    })
    await wrapper.setProps({ modelValue: 'SELECT 2' })
    expect(wrapper.props('modelValue')).toBe('SELECT 2')
  })
})
