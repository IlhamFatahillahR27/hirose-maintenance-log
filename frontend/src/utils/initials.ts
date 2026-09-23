/**
 * Helper utility to extract uppercase initials from a username or full name.
 * 
 * Rules:
 * - Null/empty/undefined -> "?"
 * - Multi-word (separated by space, dot, underscore, hyphen) -> First letter of first & last word
 * - Single-word -> First two characters uppercase
 * 
 * Examples:
 * - "operator1" -> "OP"
 * - "supervisor1" -> "SU"
 * - "admin1" -> "AD"
 * - "John Doe" -> "JD"
 * - "john.doe" -> "JD"
 * - "john_doe" -> "JD"
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) {
    return '?'
  }

  const clean = name.trim().replace(/[._-]+/g, ' ')
  const parts = clean.split(/\s+/).filter((p): p is string => Boolean(p && p.length > 0))

  if (parts.length === 0) {
    return '?'
  }

  const firstPart = parts[0]
  if (!firstPart) {
    return '?'
  }

  if (parts.length === 1) {
    return firstPart.slice(0, 2).toUpperCase()
  }

  const lastPart = parts[parts.length - 1]
  const firstChar = firstPart[0] ?? ''
  const lastChar = lastPart?.[0] ?? ''

  return (firstChar + lastChar).toUpperCase() || '?'
}
