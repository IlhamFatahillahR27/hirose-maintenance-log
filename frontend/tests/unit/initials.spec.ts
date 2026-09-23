import { describe, it, expect } from 'vitest'
import { getInitials } from '@/utils/initials'

describe('getInitials helper', () => {
  it('returns "?" for empty or null strings', () => {
    expect(getInitials('')).toBe('?')
    expect(getInitials(null)).toBe('?')
    expect(getInitials(undefined)).toBe('?')
    expect(getInitials('   ')).toBe('?')
  })

  it('extracts two initials from single-word names', () => {
    expect(getInitials('operator1')).toBe('OP')
    expect(getInitials('admin')).toBe('AD')
    expect(getInitials('supervisor')).toBe('SU')
  })

  it('extracts single character if name has only 1 char', () => {
    expect(getInitials('A')).toBe('A')
  })

  it('extracts first and last initial from multi-word names', () => {
    expect(getInitials('John Doe')).toBe('JD')
    expect(getInitials('Ilham Fatahillah')).toBe('IF')
    expect(getInitials('PT Hirose Indonesia')).toBe('PI')
  })

  it('handles names with dots, underscores, or hyphens', () => {
    expect(getInitials('john.doe')).toBe('JD')
    expect(getInitials('john_doe')).toBe('JD')
    expect(getInitials('john-doe')).toBe('JD')
  })
})
