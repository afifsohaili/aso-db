import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Pagination from '~/components/pagination.vue'
import { Button } from '~/components/ui/button'

describe('Pagination', () => {
  it('renders page numbers correctly', async () => {
    const component = await mountSuspended(Pagination, {
      props: {
        page: 2,
        limit: 25,
        totalCount: 100,
      },
    })

    expect(component.text()).toContain('26-50 of 100')
  })

  it('disables previous button on first page', async () => {
    const component = await mountSuspended(Pagination, {
      props: {
        page: 1,
        limit: 25,
        totalCount: 100,
      },
    })

    const buttons = component.findAllComponents(Button)
    const prevButton = buttons.find(b => b.attributes('aria-label') === 'Previous page')
    expect(prevButton?.attributes('disabled')).toBeDefined()
  })

  it('disables next button on last page', async () => {
    const component = await mountSuspended(Pagination, {
      props: {
        page: 4,
        limit: 25,
        totalCount: 100,
      },
    })

    const buttons = component.findAllComponents(Button)
    const nextButton = buttons.find(b => b.attributes('aria-label') === 'Next page')
    expect(nextButton?.attributes('disabled')).toBeDefined()
  })

  it('emits prev event when previous button is clicked', async () => {
    const component = await mountSuspended(Pagination, {
      props: {
        page: 2,
        limit: 25,
        totalCount: 100,
      },
    })

    const buttons = component.findAllComponents(Button)
    const prevButton = buttons.find(b => b.attributes('aria-label') === 'Previous page')
    await prevButton?.trigger('click')

    expect(component.emitted('prev')).toHaveLength(1)
  })

  it('emits next event when next button is clicked', async () => {
    const component = await mountSuspended(Pagination, {
      props: {
        page: 1,
        limit: 25,
        totalCount: 100,
      },
    })

    const buttons = component.findAllComponents(Button)
    const nextButton = buttons.find(b => b.attributes('aria-label') === 'Next page')
    await nextButton?.trigger('click')

    expect(component.emitted('next')).toHaveLength(1)
  })

  it('displays limit selector with correct options', async () => {
    const component = await mountSuspended(Pagination, {
      props: {
        page: 1,
        limit: 25,
        totalCount: 100,
      },
    })

    expect(component.text()).toContain('25')
    expect(component.text()).toContain('50')
    expect(component.text()).toContain('100')
  })
})
