import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '@/components/badges/StatusBadge.vue'

describe('StatusBadge.vue', () => {
  it('renders Submitted status correctly with amber theme', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'Submitted' },
    })
    expect(wrapper.text()).toContain('Submitted')
    expect(wrapper.classes()).toContain('border-amber-200')
    expect(wrapper.classes()).toContain('text-amber-700')
  })

  it('renders Approved status correctly with emerald theme', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'Approved' },
    })
    expect(wrapper.text()).toContain('Approved')
    expect(wrapper.classes()).toContain('border-emerald-200')
    expect(wrapper.classes()).toContain('text-emerald-700')
  })

  it('renders Rejected status correctly with rose theme', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'Rejected' },
    })
    expect(wrapper.text()).toContain('Rejected')
    expect(wrapper.classes()).toContain('border-rose-200')
    expect(wrapper.classes()).toContain('text-rose-700')
  })
})
