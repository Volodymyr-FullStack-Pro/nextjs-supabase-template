import { describe, expect, it } from 'vitest'
import { formatMoney, shareOf, money } from '@/shared/domain/money'

describe('money helpers', () => {
  it('multiplies a value by a fraction exactly', () => {
    expect(shareOf('3080000', '0.6')).toBe('1848000.00')
    expect(shareOf('1760000', '0.35')).toBe('616000.00')
  })

  it('adds decimals without floating point drift', () => {
    expect(money('0.1').plus('0.2').toString()).toBe('0.3')
  })

  it('formats EUR with space thousands separator and no decimals', () => {
    expect(formatMoney('4218400')).toBe('€4 218 400')
  })

  it('formats negative amounts with a real minus sign', () => {
    expect(formatMoney('-8500')).toBe('−€8 500')
  })

  it('formats other currencies with the code after the number', () => {
    expect(formatMoney('1250.49', 'USD')).toBe('1 250 USD')
  })
})
