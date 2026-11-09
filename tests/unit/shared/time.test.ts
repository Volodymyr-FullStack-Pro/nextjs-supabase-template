import { describe, expect, it } from 'vitest'

import { formatDate, formatDay } from '@/shared/domain/time'

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

describe('formatDay', () => {
  it('shows a date column as the same calendar day without a time zone shift', () => {
    expect(formatDay('2026-03-01')).toBe('1 марта 2026 г.')
    expect(formatDay('2026-03-01', { locale: 'en-US' })).toBe('March 1, 2026')
  })

  it('refuses a value that is not a calendar date', () => {
    expect(() => formatDay('2026-03-01T10:00:00Z')).toThrow(RangeError)
  })
})
