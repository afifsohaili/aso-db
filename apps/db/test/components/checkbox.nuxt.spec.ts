import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { Checkbox } from '@/components/ui/checkbox'

describe('checkbox', () => {
  it('renders unchecked by default', async () => {
    const wrapper = await mountSuspended(Checkbox)
    expect(wrapper.find('[data-state="unchecked"]').exists()).toBe(true)
  })

  it('toggles checked state on click', async () => {
    const wrapper = await mountSuspended(Checkbox)
    await wrapper.find('[data-slot="checkbox"]').trigger('click')
    expect(wrapper.find('[data-state="checked"]').exists()).toBe(true)
    await wrapper.find('[data-slot="checkbox"]').trigger('click')
    expect(wrapper.find('[data-state="unchecked"]').exists()).toBe(true)
  })

  it('renders check icon when checked', async () => {
    const wrapper = await mountSuspended(Checkbox, {
      props: { modelValue: true },
    })
    expect(wrapper.find('[data-slot="checkbox-indicator"]').exists()).toBe(true)
    expect(wrapper.find('[data-state="checked"]').exists()).toBe(true)
  })
})
