import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Pagination from '~/components/pagination.vue'

describe('Pagination', () => {

  it('renders correct page numbers', async () => {
    const component = await mountSuspended(Pagination, {
      props: {
        page: 2,
        limit: 25,
        totalCount: 100,
      },
    })

    expect(component.text()).toContain('Page 2')
    expect(component.text()).toContain('100 rows')
  })

  it('disables previous button on first page', async () => {
    const component = await mountSuspended(Pagination, {
      props: {
        page: 1,
        limit: 25,
        totalCount: 100,
      },
    })

    const prevButton = component.find('button:first-child')
    expect(prevButton.attributes('disabled')).toBeDefined()
  })

  it('disables next button on last page', async () => {
    const component = await mountSuspended(Pagination, {
      props: {
        page: 4,
        limit: 25,
        totalCount: 100,
      },
    })

    const nextButton = component.find('button:last-child')
    expect(nextButton.attributes('disabled')).toBeDefined()
  })

  it('emits prev event when clicking previous', async () => {
    const component = await mountSuspended(Pagination, {
      props: {
        page: 2,
        limit: 25,
        totalCount: 100,
      },
    })

    await component.find('button:first-child').trigger('click')
    expect(component.emitted('prev')).toHaveLength(1)
  })

  it('emits next event when clicking next', async () => {
    const component = await mountSuspended(Pagination, {
      props: {
        page: 2,
        limit: 25,
        totalCount: 100,
      },
    })

    await component.find('button:last-child').trigger('click')
    expect(component.emitted('next')).toHaveLength(1)
  })

  it('displays limit selector with correct options', async () => {
    const component = await mountSuspended(Pagination, {
      props: {
        page: 1,
        limit: 50,
        totalCount: 100,
      },
    })

    const select = component.find('select')
    expect(select.exists()).toBe(true)
    expect(component.text()).toContain('25')
    expect(component.text()).toContain('50')
    expect(component.text()).toContain('100')
  })
})