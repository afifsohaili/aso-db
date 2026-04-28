import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { useSchema } from '~/composables/useSchema'

// Test helper: mount a component that uses the composable
async function withUseSchema() {
  const TestComponent = defineComponent({
    setup() {
      return useSchema()
    },
    template: '<div>{{ schema ? schema.tables.length : 0 }}</div>',
  })

  return mountSuspended(TestComponent)
}

describe('useSchema composable', () => {
  it('returns schema data from /api/schema', async () => {
    const mockSchema = {
      tables: [
        { name: 'users', schema: 'public' },
        { name: 'posts', schema: 'public' },
      ],
    }

    const fetchMock = vi.fn().mockReturnValue({
      data: { value: mockSchema },
      error: { value: null },
      status: { value: 'success' },
    })
    vi.stubGlobal('useFetch', fetchMock)

    const wrapper = await withUseSchema()
    // Should not throw ReferenceError: schema is not defined
    expect(wrapper.find('div').text()).toBe('2')

    vi.unstubAllGlobals()
  })

  it('returns loading state when pending', async () => {
    const fetchMock = vi.fn().mockReturnValue({
      data: { value: null },
      error: { value: null },
      status: { value: 'pending' },
    })
    vi.stubGlobal('useFetch', fetchMock)

    const TestComponent = defineComponent({
      setup() {
        const { loading } = useSchema()
        return { loading }
      },
      template: '<div>{{ loading }}</div>',
    })

    const wrapper = await mountSuspended(TestComponent)
    expect(wrapper.find('div').text()).toBe('true')

    vi.unstubAllGlobals()
  })
})
