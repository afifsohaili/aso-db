import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import QueryResults from '~/components/query-results.vue'

describe('query-results', () => {
  it('shows placeholder when results are empty', async () => {
    const wrapper = await mountSuspended(QueryResults, {
      props: { results: [], loading: false },
    })
    expect(wrapper.text()).toContain('No results yet')
  })

  it('shows loading text when loading', async () => {
    const wrapper = await mountSuspended(QueryResults, {
      props: { results: [], loading: true },
    })
    expect(wrapper.text()).toContain('Executing')
  })

  it('renders successful result panel with row count and duration', async () => {
    const wrapper = await mountSuspended(QueryResults, {
      props: {
        results: [
          {
            index: 0,
            sql: 'SELECT 1',
            success: true,
            columns: ['?column?'],
            rows: [{ '?column?': 1 }],
            rowCount: 1,
            durationMs: 5,
          },
        ],
        loading: false,
      },
    })
    expect(wrapper.text()).toContain('SELECT 1')
    expect(wrapper.text()).toContain('1 rows')
    expect(wrapper.text()).toContain('5ms')
  })

  it('renders error result panel with red styling', async () => {
    const wrapper = await mountSuspended(QueryResults, {
      props: {
        results: [
          {
            index: 0,
            sql: 'BAD SQL',
            success: false,
            columns: [],
            rows: [],
            rowCount: 0,
            durationMs: 0,
            errorMessage: 'syntax error',
          },
        ],
        loading: false,
      },
    })
    expect(wrapper.text()).toContain('BAD SQL')
    expect(wrapper.text()).toContain('syntax error')
  })
})
