import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import JoinSuggestions from '@/components/join-suggestions'
import type { RelationInfo } from '@/shared/types/table'

describe('join-suggestions add/remove', () => {
  const relations: RelationInfo[] = [
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
      sourceTable: 'profiles',
      sourceColumn: 'user_id',
      targetSchema: 'public',
      targetTable: 'users',
      targetColumn: 'id',
    },
  ]

  it('shows add (+) button for non-joined tables', async () => {
    const component = await mountSuspended(JoinSuggestions, {
      props: {
        relations,
        schema: 'public',
        tableName: 'users',
        joinedTables: [],
      },
    })

    const addButtons = component.findAll('[data-testid="add-join"]')
    expect(addButtons.length).toBe(2) // organisations + profiles

    const removeButtons = component.findAll('[data-testid="remove-join"]')
    expect(removeButtons.length).toBe(0)
  })

  it('shows remove (×) button for joined tables', async () => {
    const component = await mountSuspended(JoinSuggestions, {
      props: {
        relations,
        schema: 'public',
        tableName: 'users',
        joinedTables: ['organisations'],
      },
    })

    // organisations is shown as joined (with ×), profiles as joinable (with +)
    const removeButtons = component.findAll('[data-testid="remove-join"]')
    expect(removeButtons.length).toBe(1)

    const addButtons = component.findAll('[data-testid="add-join"]')
    expect(addButtons.length).toBe(1)
  })

  it('emits add event when clicking + button', async () => {
    const component = await mountSuspended(JoinSuggestions, {
      props: {
        relations,
        schema: 'public',
        tableName: 'users',
        joinedTables: [],
      },
    })

    const addButton = component.find('[data-testid="add-join"]')
    await addButton.trigger('click')

    const emitted = component.emitted()
    expect(emitted['add']).toBeDefined()
    expect(emitted['add']).toHaveLength(1)
  })

  it('emits remove event when clicking × button', async () => {
    const component = await mountSuspended(JoinSuggestions, {
      props: {
        relations,
        schema: 'public',
        tableName: 'users',
        joinedTables: ['organisations'],
      },
    })

    const removeButton = component.find('[data-testid="remove-join"]')
    await removeButton.trigger('click')

    const emitted = component.emitted()
    expect(emitted['remove']).toBeDefined()
    expect(emitted['remove']).toHaveLength(1)
  })

  it('applies different styling for joined vs non-joined', async () => {
    const component = await mountSuspended(JoinSuggestions, {
      props: {
        relations,
        schema: 'public',
        tableName: 'users',
        joinedTables: ['organisations'],
      },
    })

    const joinTargets = component.findAll('[data-testid="join-target"]')
    // organisations should be joined (primary styling)
    expect(joinTargets[0]!.classes()).toContain('bg-primary')
  })
})
