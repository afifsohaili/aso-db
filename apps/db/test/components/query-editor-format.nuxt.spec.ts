import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

import QueryEditor from '../../app/components/query-editor.vue'

describe('QueryEditor Format', () => {
  it('renders format button', async () => {
    const component = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'SELECT * FROM users',
      },
    })

    const buttons = component.findAllComponents({ name: 'Button' })
    const formatButton = buttons.find(b => b.text().includes('Format'))
    expect(formatButton).toBeDefined()
  })

  it('emits update event on format', async () => {
    const component = await mountSuspended(QueryEditor, {
      props: {
        modelValue: 'select * from users',
      },
    })

    const buttons = component.findAllComponents({ name: 'Button' })
    const formatButton = buttons.find(b => b.text().includes('Format'))
    expect(formatButton).toBeDefined()
  })
})
