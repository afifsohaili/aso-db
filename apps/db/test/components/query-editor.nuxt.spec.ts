import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import QueryEditor from '~/components/query-editor.vue'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'

describe('QueryEditor', () => {
  it('renders toolbar buttons', async () => {
    const wrapper = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'SELECT 1',
        loading: false,
        readOnly: true,
      },
    })

    const buttons = wrapper.findAllComponents(Button)
    const runAllButton = buttons.find(b => b.text().includes('Run All'))
    const runSelectedButton = buttons.find(b => b.text().includes('Run Selected'))

    expect(runAllButton).toBeDefined()
    expect(runSelectedButton).toBeDefined()
  })

  it('emits run-all event when clicking Run All button', async () => {
    const wrapper = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'SELECT 1',
        loading: false,
        readOnly: true,
      },
    })

    const buttons = wrapper.findAllComponents(Button)
    const runAllButton = buttons.find(b => b.text().includes('Run All'))
    await runAllButton?.trigger('click')

    expect(wrapper.emitted('run-all')).toHaveLength(1)
  })

  it('disables Run Selected button when no text is selected', async () => {
    const wrapper = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'SELECT 1',
        loading: false,
        readOnly: true,
      },
    })

    const buttons = wrapper.findAllComponents(Button)
    const runSelectedButton = buttons.find(b => b.text().includes('Run Selected'))
    expect(runSelectedButton?.attributes('disabled')).toBeDefined()
  })

  it('shows read-only badge when readOnly is true', async () => {
    const wrapper = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'SELECT 1',
        loading: false,
        readOnly: true,
      },
    })

    const badge = wrapper.findComponent(Badge)
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Read-only')
  })

  it('shows write mode badge when readOnly is false', async () => {
    const wrapper = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'SELECT 1',
        loading: false,
        readOnly: false,
      },
    })

    const badge = wrapper.findComponent(Badge)
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Write mode')
  })

  it('emits update:modelValue when value changes', async () => {
    const wrapper = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'SELECT 1',
        loading: false,
        readOnly: true,
      },
    })

    await wrapper.setProps({ modelValue: 'SELECT 2' })
    expect(wrapper.emitted('update:modelValue')).toBeDefined()
  })

  it('accepts schema prop without errors', async () => {
    const wrapper = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'SELECT 1',
        loading: false,
        readOnly: true,
        schema: {
          public: {
            users: ['id', 'email', 'name'],
          },
        },
      },
    })

    // Should render without errors
    expect(wrapper.find('.cm-editor').exists()).toBe(true)
  })
})
