import { describe, expect, it, vi } from 'vitest'
import { ref, watch, nextTick, reactive } from 'vue'

describe('sort query param persistence', () => {
  it('should not fire watch when only query changes (array source pattern)', async () => {
    // This test verifies the fix: using watch([() => a, () => b])
    // instead of watch(() => [a, b]) prevents false positives
    // when the route object is replaced but param values stay the same.

    const route = reactive({
      params: { schema: 'public', name: 'users' },
      query: {} as Record<string, string>,
    })

    const replaceMock = vi.fn()
    const sort = ref({ column: null as string | null, direction: null as 'asc' | 'desc' | null })

    // FIXED pattern: watch individual sources, not a computed array
    watch([() => route.params.schema, () => route.params.name], () => {
      sort.value = { column: null, direction: null }
      const query = { ...route.query }
      delete query.sort
      delete query.order
      replaceMock({ query })
    })

    // Simulate setting sort via query change (like router.replace from updateSort)
    route.query = { sort: 'id', order: 'asc' }
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    // The watch should NOT have fired because params didn't change
    expect(replaceMock).not.toHaveBeenCalled()
    expect(sort.value).toEqual({ column: null, direction: null })
  })

  it('should fire watch when params actually change (array source pattern)', async () => {
    const route = reactive({
      params: { schema: 'public', name: 'users' },
      query: { sort: 'id', order: 'asc' } as Record<string, string>,
    })

    const replaceMock = vi.fn()
    const sort = ref({ column: 'id' as string | null, direction: 'asc' as 'asc' | 'desc' | null })

    watch([() => route.params.schema, () => route.params.name], () => {
      sort.value = { column: null, direction: null }
      const query = { ...route.query }
      delete query.sort
      delete query.order
      replaceMock({ query })
    })

    // Simulate navigating to a different table
    route.params.name = 'subscriptions'
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    // The watch SHOULD fire because params changed
    expect(replaceMock).toHaveBeenCalledOnce()
    expect(sort.value).toEqual({ column: null, direction: null })
  })

  it('demonstrates the buggy pattern: computed array watch fires when route ref changes', async () => {
    // In Vue Router, route is a ref. When router.replace() is called,
    // route.value is replaced with a new object, triggering re-evaluation
    // even though param values haven't changed.

    const route = ref({
      params: { schema: 'public', name: 'users' },
      query: {} as Record<string, string>,
    })

    const replaceMock = vi.fn()
    const sort = ref({ column: null as string | null, direction: null as 'asc' | 'desc' | null })

    // BUGGY pattern: computed array returns new reference every time
    watch(() => [route.value.params.schema, route.value.params.name], () => {
      sort.value = { column: null, direction: null }
      const query = { ...route.value.query }
      delete query.sort
      delete query.order
      replaceMock({ query })
    })

    // Simulate router.replace() which replaces the entire route.value
    route.value = {
      params: { schema: 'public', name: 'users' },
      query: { sort: 'id', order: 'asc' },
    }
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    // The buggy watch incorrectly fires because it compares array references
    expect(replaceMock).toHaveBeenCalledOnce()
    expect(sort.value).toEqual({ column: null, direction: null })
  })
})
