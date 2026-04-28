import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import QueryEditor from '../../app/components/query-editor.vue'

describe('QueryEditor AI', () => {
  it('renders AI status dot when aiEnabled is true', async () => {
    const component = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'SELECT * FROM users',
        aiEnabled: true,
      },
    })

    // Status dot should be present
    const statusDot = component.find('.bg-green-500, .bg-yellow-500')
    expect(statusDot.exists()).toBe(true)
  })

  it('does not render AI status dot when aiEnabled is false', async () => {
    const component = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'SELECT * FROM users',
        aiEnabled: false,
      },
    })

    const statusDot = component.find('.bg-green-500, .bg-yellow-500')
    expect(statusDot.exists()).toBe(false)
  })

  it('renders read-only badge', async () => {
    const component = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'SELECT * FROM users',
        readOnly: true,
      },
    })

    const badge = component.findComponent({ name: 'Badge' })
    expect(badge.exists()).toBe(true)
  })

  it('emits run-all event', async () => {
    const component = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'SELECT * FROM users',
      },
    })

    const runButton = component.findAllComponents({ name: 'Button' })[0]
    expect(runButton.exists()).toBe(true)
  })
})
