import { formatUnits } from 'viem'

// Human-readable token amount: thousands separators, at least 2 and at most `decimals` fraction
// digits (trailing zeros beyond the 2nd are trimmed, so 2 USDC reads "2.00" and 0.123456 stays exact).
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const [whole, fraction = ''] = formatUnits(amount, decimals).split('.')
  const trimmed = fraction.replace(/0+$/, '')
  const shownFraction = trimmed.padEnd(2, '0')
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${groupedWhole}.${shownFraction}`
}
