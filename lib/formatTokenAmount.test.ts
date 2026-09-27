import { describe, expect, it } from 'vitest'
import { formatTokenAmount } from './formatTokenAmount'

describe('formatTokenAmount', () => {
  it('shows whole amounts with two decimals', () => {
    expect(formatTokenAmount(2_000_000n, 6)).toBe('2.00')
    expect(formatTokenAmount(0n, 6)).toBe('0.00')
  })

  it('keeps every significant decimal and trims only trailing zeros beyond the second', () => {
    expect(formatTokenAmount(1_500_000n, 6)).toBe('1.50')
    expect(formatTokenAmount(123_456n, 6)).toBe('0.123456')
    expect(formatTokenAmount(1_230_000n, 6)).toBe('1.23')
  })

  it('groups thousands', () => {
    expect(formatTokenAmount(1_234_567_890_000n, 6)).toBe('1,234,567.89')
  })

  it('uses the token decimals it is given, not a fixed 6 or 18', () => {
    expect(formatTokenAmount(10n ** 18n, 18)).toBe('1.00')
    expect(formatTokenAmount(5n, 0)).toBe('5.00')
  })
})
