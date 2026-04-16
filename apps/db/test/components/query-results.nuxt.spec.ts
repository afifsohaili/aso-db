import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import QueryResults from '~/components/query-results.vue'
import { Alert, AlertTitle, AlertDescription } from '~/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import TableDetail from '~/components/table-detail.vue'

describe('QueryResults', () => {
  it('shows placeholder when no results', async () => {
    const component = await mountSuspended(QueryResults, {
      props: {
        results: [],
        loading: false,
      },
    })

    expect(component.text()).toContain('Run a query to see results')
  })

  it('shows loading state', async () => {
    const component = await mountSuspended(QueryResults, {
      props: {
        results: [],
        loading: true,
      },
    })

    expect(component.findComponent(Skeleton).exists()).toBe(true)
    expect(component.text()).toContain('Executing query')
  })

  it('shows successful result panel', async () => {
    const results = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]

    const component = await mountSuspended(QueryResults, {
      props: {
        results,
        loading: false,
        sql: 'SELECT * FROM users',
        durationMs: 42.5,
      },
    })

    expect(component.text()).toContain('Results (2 rows)')
    expect(component.text()).toContain('42.50ms')
    expect(component.text()).toContain('SELECT * FROM users')
    expect(component.findComponent(TableDetail).exists()).toBe(true)
  })

  it('shows error panel', async () => {
    const component = await mountSuspended(QueryResults, {
      props: {
        results: [],
        loading: false,
        error: {
          title: 'Execution Error',
          message: 'Syntax error at line 1',
        },
      },
    })

    expect(component.findComponent(Alert).exists()).toBe(true)
    expect(component.findComponent(AlertTitle).exists()).toBe(true)
    expect(component.findComponent(AlertDescription).exists()).toBe(true)
    expect(component.text()).toContain('Execution Error')
    expect(component.text()).toContain('Syntax error at line 1')
  })
})
