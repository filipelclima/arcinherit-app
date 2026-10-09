import { describe, expect, it } from 'vitest'
import { computeClaimShare } from './claimShare'

describe('computeClaimShare', () => {
  it('v2: pays every heir their percentage of the snapshot, whatever the claim order', () => {
    // 40/60 split of 1000: the 40% heir claimed first (snapshot 1000, 600 left). The 60% heir still
    // gets 600 — in v1 they'd get 60% of 600 = 360.
    expect(computeClaimShare({ balance: 600n, percentage: 60, snapshot: 1000n, legacy: false })).toBe(600n)
  })

  it('v2: before anyone claims (snapshot 0), the next claim snapshots the current balance', () => {
    expect(computeClaimShare({ balance: 1000n, percentage: 40, snapshot: 0n, legacy: false })).toBe(400n)
    expect(computeClaimShare({ balance: 1000n, percentage: 40, snapshot: undefined, legacy: false })).toBe(400n)
  })

  it('v2: caps the share at what is left in the vault (the owner can still withdraw after claims open)', () => {
    expect(computeClaimShare({ balance: 100n, percentage: 60, snapshot: 1000n, legacy: false })).toBe(100n)
  })

  it('v2: rounds down like the contract', () => {
    expect(computeClaimShare({ balance: 999n, percentage: 33, snapshot: 0n, legacy: false })).toBe(329n)
  })

  it('v1 (legacy): pays the percentage of whatever is left, ignoring any snapshot', () => {
    expect(computeClaimShare({ balance: 600n, percentage: 60, snapshot: 1000n, legacy: true })).toBe(360n)
  })
})
