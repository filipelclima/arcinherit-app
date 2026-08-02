import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAccount, useReadContract } from 'wagmi'
import { VaultStatus } from './VaultStatus'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
}))

const mockUseAccount = vi.mocked(useAccount)
const mockUseReadContract = vi.mocked(useReadContract)

const DAY = 86400
const TIMELOCK_DAYS = 180
const GRACE_DAYS = 7

describe('VaultStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a progress bar reflecting how much of the check-in period has elapsed', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    vi.setSystemTime(now)

    const elapsedDays = 90 // halfway through a 180-day period
    const lastCheckIn = BigInt(Math.floor(now.getTime() / 1000) - elapsedDays * DAY)
    const timelockDuration = BigInt(TIMELOCK_DAYS * DAY)
    const gracePeriod = BigInt(GRACE_DAYS * DAY)
    const heirs = [{ wallet: '0x2222222222222222222222222222222222222222', percentage: 100 }]

    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111' } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'getVault':
          return { data: [timelockDuration, gracePeriod, lastCheckIn, true, heirs], isLoading: false }
        case 'timeUntilClaim':
          return { data: BigInt((TIMELOCK_DAYS + GRACE_DAYS - elapsedDays) * DAY) }
        case 'canClaim':
          return { data: false }
        default:
          return { data: undefined }
      }
    }) as any)

    render(<VaultStatus />)

    expect(screen.getByText('90 / 180 days')).toBeInTheDocument()
    expect(screen.getByTestId('checkin-progress-bar')).toHaveStyle({ width: '50%' })
  })

  it('caps the progress bar at 100% once the check-in period has fully elapsed', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    vi.setSystemTime(now)

    const lastCheckIn = BigInt(Math.floor(now.getTime() / 1000) - (TIMELOCK_DAYS + 20) * DAY)
    const timelockDuration = BigInt(TIMELOCK_DAYS * DAY)
    const gracePeriod = BigInt(GRACE_DAYS * DAY)

    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111' } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'getVault':
          return { data: [timelockDuration, gracePeriod, lastCheckIn, true, []], isLoading: false }
        case 'timeUntilClaim':
          return { data: BigInt(0) }
        case 'canClaim':
          return { data: false }
        default:
          return { data: undefined }
      }
    }) as any)

    render(<VaultStatus />)

    expect(screen.getByTestId('checkin-progress-bar')).toHaveStyle({ width: '100%' })
  })
})
