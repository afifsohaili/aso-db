import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import QueryPage from '~/pages/query.vue'

// Helper to wait for onMounted async operations
async function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 50))
}

describe('QueryPage read-only banner', () => {
  it('shows write mode alert when config returns isReadOnly=false', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ isReadOnly: false })
    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = await mountSuspended(QueryPage, {
      global: {
        stubs: {
          QueryBottomTabs: true,
        },
      },
    })
    await flushPromises()
    await nextTick()

    // Alert variant="destructive" with "Write mode enabled" text
    const alert = wrapper.find('[data-testid="write-mode-alert"]')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('Write mode enabled')

    vi.unstubAllGlobals()
  })

  it('hides write mode alert when config returns isReadOnly=true', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ isReadOnly: true })
    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = await mountSuspended(QueryPage, {
      global: {
        stubs: {
          QueryBottomTabs: true,
        },
      },
    })
    await flushPromises()
    await nextTick()

    const alert = wrapper.find('[data-testid="write-mode-alert"]')
    expect(alert.exists()).toBe(false)

    vi.unstubAllGlobals()
  })

  it('defaults to read-only when config fetch fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'))
    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = await mountSuspended(QueryPage, {
      global: {
        stubs: {
          QueryBottomTabs: true,
        },
      },
    })
    await flushPromises()
    await nextTick()

    const alert = wrapper.find('[data-testid="write-mode-alert"]')
    expect(alert.exists()).toBe(false)

    vi.unstubAllGlobals()
  })
})
