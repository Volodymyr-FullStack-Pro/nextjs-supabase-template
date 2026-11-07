import { describe, expect, it } from 'vitest'

import { formatDate } from '@/shared/domain/time'

describe('formatDate', () => {
  it('shows the calendar day in the project time zone, not in UTC', () => {
    expect(formatDate('2026-10-31T23:30:00Z')).toBe('1 ноября 2026 г.')
  })

  it('follows the requested locale and time zone', () => {
    expect(formatDate('2026-10-31T23:30:00Z', { locale: 'en-US', timeZone: 'UTC' })).toBe(
      'October 31, 2026',
    )
  })
})
