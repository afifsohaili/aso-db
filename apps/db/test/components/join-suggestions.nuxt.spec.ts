import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import JoinSuggestions from '@/components/join-suggestions'
import type { RelationInfo } from '@/shared/types/table'

describe('join-suggestions', () => {
  const relations: RelationInfo[] = [
    {
      sourceSchema: 'public',
      sourceTable: 'orders',
      sourceColumn: 'user_id',
      targetSchema: 'public',
      targetTable: 'users',
      targetColumn: 'id',
    },
    {
      sourceSchema: 'public',
      sourceTable: 'profiles',
      sourceColumn: 'user_id',
      targetSchema: 'public',
      targetTable: 'users',
      targetColumn: 'id',
    },
    {
      sourceSchema: 'public',
      sourceTable: 'users',
      sourceColumn: 'org_id',
      targetSchema: 'public',
      targetTable: 'organisations',
      targetColumn: 'id',
    },
  ]

  it('renders outgoing joins (tables this table references)', async () => {
    const component = await mountSuspended(JoinSuggestions, {
      props: {
        relations,
        schema: 'public',
        tableName: 'users',
      },
    })

    // users has 1 outgoing relation: to organisations
    const joinTargets = component.findAll('[data-testid="join-target"]')
    expect(joinTargets.length).toBe(1)
    expect(joinTargets[0]!.text()).toContain('organisations')
  })

  it('renders incoming joins (tables referencing this table)', async () => {
    const component = await mountSuspended(JoinSuggestions, {
      props: {
        relations,
        schema: 'public',
        tableName: 'users',
      },
    })

    // users has 2 incoming relations: from orders and profiles
    const joinSources = component.findAll('[data-testid="join-source"]')
    expect(joinSources.length).toBe(2)
    const texts = joinSources.map(el => el.text())
    expect(texts).toContain('orders')
    expect(texts).toContain('profiles')
  })

  it('emits select event when clicking a join target', async () => {
    const component = await mountSuspended(JoinSuggestions, {
      props: {
        relations,
        schema: 'public',
        tableName: 'users',
      },
    })

    const joinTargets = component.findAll('[data-testid="join-target"]')
    await joinTargets[0]!.trigger('click')

    const emitted = component.emitted()
    expect(emitted['select']).toBeDefined()
    expect(emitted['select']).toHaveLength(1)
    expect(emitted['select']![0]![0]).toMatchObject({
      sourceSchema: 'public',
      sourceTable: 'users',
      targetTable: 'organisations',
    })
  })

  it('shows no relations message when empty', async () => {
    const component = await mountSuspended(JoinSuggestions, {
      props: {
        relations: [],
        schema: 'public',
        tableName: 'standalone',
      },
    })

    expect(component.text()).toContain('No relations found')
    expect(component.findAll('[data-testid="join-target"]').length).toBe(0)
    expect(component.findAll('[data-testid="join-source"]').length).toBe(0)
  })

  it('deduplicates relations by target table', async () => {
    const duplicateRelations: RelationInfo[] = [
      {
        sourceSchema: 'public',
        sourceTable: 'users',
        sourceColumn: 'org_id',
        targetSchema: 'public',
        targetTable: 'organisations',
        targetColumn: 'id',
      },
      {
        sourceSchema: 'public',
        sourceTable: 'users',
        sourceColumn: 'other_org_id',
        targetSchema: 'public',
        targetTable: 'organisations',
        targetColumn: 'id',
      },
    ]

    const component = await mountSuspended(JoinSuggestions, {
      props: {
        relations: duplicateRelations,
        schema: 'public',
        tableName: 'users',
      },
    })

    // Should deduplicate: only one button for organisations
    const joinTargets = component.findAll('[data-testid="join-target"]')
    expect(joinTargets.length).toBe(1)
  })
})
