import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PriorityBadge from '@/components/badges/PriorityBadge.vue'

describe('PriorityBadge.vue', () => {
  it('renders Low priority correctly', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'Low' },
    })
    expect(wrapper.text()).toContain('Low')
    expect(wrapper.classes()).toContain('border-slate-200')
    expect(wrapper.classes()).toContain('text-slate-700')
  })

  it('renders Medium priority correctly', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'Medium' },
    })
    expect(wrapper.text()).toContain('Medium')
    expect(wrapper.classes()).toContain('border-blue-200')
    expect(wrapper.classes()).toContain('text-blue-700')
  })

  it('renders High priority correctly', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'High' },
    })
    expect(wrapper.text()).toContain('High')
    expect(wrapper.classes()).toContain('border-orange-200')
    expect(wrapper.classes()).toContain('text-orange-700')
  })

  it('renders Critical priority correctly with animated indicator', () => {
    const wrapper = mount(PriorityBadge, {
      props: { priority: 'Critical' },
    })
    expect(wrapper.text()).toContain('Critical')
    expect(wrapper.classes()).toContain('border-red-300')
    expect(wrapper.classes()).toContain('text-red-700')
    expect(wrapper.classes()).toContain('animate-pulse')
  })
})
