import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useReadContract } from 'wagmi'
import { VaultStatus } from './VaultStatus'
import { generateInheritancePdf } from '@/lib/generateInheritancePdf'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
}))

vi.mock('@/lib/generateInheritancePdf', () => ({
  generateInheritancePdf: vi.fn(),
}))

const mockUseAccount = vi.mocked(useAccount)
const mockUseReadContract = vi.mocked(useReadContract)
const mockGenerateInheritancePdf = vi.mocked(generateInheritancePdf)

const DAY = 86400
const TIMELOCK_DAYS = 180
const GRACE_DAYS = 7

describe('VaultStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockGenerateInheritancePdf.mockReset()
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

  it('generates the inheritance instructions PDF with the real vault data when the download button is clicked', async () => {
    const now = new Date('2026-01-01T00:00:00Z')
    vi.setSystemTime(now)

    const owner = '0x1111111111111111111111111111111111111111'
    const lastCheckIn = BigInt(Math.floor(now.getTime() / 1000) - 10 * DAY)
    const timelockDuration = BigInt(TIMELOCK_DAYS * DAY)
    const gracePeriod = BigInt(GRACE_DAYS * DAY)
    const heirs = [
      { wallet: '0x2222222222222222222222222222222222222222', percentage: 60 },
      { wallet: '0x3333333333333333333333333333333333333333', percentage: 40 },
    ]

    mockUseAccount.mockReturnValue({ address: owner } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'getVault':
          return { data: [timelockDuration, gracePeriod, lastCheckIn, true, heirs], isLoading: false }
        case 'timeUntilClaim':
          return { data: BigInt((TIMELOCK_DAYS + GRACE_DAYS - 10) * DAY) }
        case 'canClaim':
          return { data: false }
        default:
          return { data: undefined }
      }
    }) as any)
    mockGenerateInheritancePdf.mockResolvedValue(undefined)

    render(<VaultStatus />)

    const button = screen.getByTestId('download-instructions-button')
    expect(button).toHaveTextContent('Download instructions for your heirs')

    // The mocked generateInheritancePdf is invoked synchronously by the click handler
    // (before its `await`), so no need to wait for it here.
    fireEvent.click(button)

    expect(mockGenerateInheritancePdf).toHaveBeenCalledTimes(1)
    expect(mockGenerateInheritancePdf).toHaveBeenCalledWith({
      ownerAddress: owner,
      heirs: [
        { wallet: heirs[0].wallet, percentage: 60 },
        { wallet: heirs[1].wallet, percentage: 40 },
      ],
      timelockDuration,
      gracePeriod,
    })

    // Flush the resolved mock promise (and the resulting isGeneratingPdf state update)
    // within an act() boundary so nothing leaks into the next test.
    await act(async () => {})
  })

  it('shows a generating state while the PDF is being built, and an error message if generation fails', async () => {
    const now = new Date('2026-01-01T00:00:00Z')
    vi.setSystemTime(now)

    const lastCheckIn = BigInt(Math.floor(now.getTime() / 1000) - 10 * DAY)
    const timelockDuration = BigInt(TIMELOCK_DAYS * DAY)
    const gracePeriod = BigInt(GRACE_DAYS * DAY)
    const heirs = [{ wallet: '0x2222222222222222222222222222222222222222', percentage: 100 }]

    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111' } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'getVault':
          return { data: [timelockDuration, gracePeriod, lastCheckIn, true, heirs], isLoading: false }
        case 'timeUntilClaim':
          return { data: BigInt((TIMELOCK_DAYS + GRACE_DAYS - 10) * DAY) }
        case 'canClaim':
          return { data: false }
        default:
          return { data: undefined }
      }
    }) as any)
    mockGenerateInheritancePdf.mockRejectedValue(new Error('boom'))

    render(<VaultStatus />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('download-instructions-button'))
    })

    expect(screen.getByText('Could not generate the PDF. Please try again.')).toBeInTheDocument()
    expect(screen.getByTestId('download-instructions-button')).not.toBeDisabled()
  })
})
