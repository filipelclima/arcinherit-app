import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useReadContract } from 'wagmi'
import { VaultStatus } from './VaultStatus'
import { generateInheritancePdf } from '@/lib/generateInheritancePdf'
import { CONTRACT_ADDRESS, LEGACY_CONTRACT_ADDRESS } from '@/lib/contract'

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
      contractAddress: CONTRACT_ADDRESS,
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

describe('VaultStatus visual structure', () => {
  const OWNER = '0x1111111111111111111111111111111111111111'
  const HEIRS = [
    { wallet: '0x2222222222222222222222222222222222222222', percentage: 60 },
    { wallet: '0x3333333333333333333333333333333333333333', percentage: 40 },
  ]

  beforeEach(() => {
    vi.useFakeTimers()
    mockGenerateInheritancePdf.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function renderVault({ canClaim = false, daysLeft = 300 }: { canClaim?: boolean; daysLeft?: number } = {}) {
    const now = new Date('2026-01-01T00:00:00Z')
    vi.setSystemTime(now)

    const lastCheckIn = BigInt(Math.floor(now.getTime() / 1000) - 10 * DAY)
    mockUseAccount.mockReturnValue({ address: OWNER } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'getVault':
          return { data: [BigInt(TIMELOCK_DAYS * DAY), BigInt(GRACE_DAYS * DAY), lastCheckIn, true, HEIRS], isLoading: false }
        case 'timeUntilClaim':
          return { data: BigInt(daysLeft * DAY) }
        case 'canClaim':
          return { data: canClaim }
        default:
          return { data: undefined }
      }
    }) as any)
    return render(<VaultStatus />)
  }

  it('shows the four vault facts as a matching set of detail boxes, each with an icon, a label and a same-size value', () => {
    renderVault()

    const labels = ['Check-in every', 'Safety window', 'Last check-in', 'Next check-in deadline']
    const boxes = labels.map(label => screen.getByText(label).closest('.ui-card-sm') as HTMLElement)

    boxes.forEach(box => {
      expect(box).not.toBeNull()
      expect(box.querySelector('svg')).not.toBeNull()
    })
    // The old layout mixed 16px and 14px values; every value is now the same size and weight.
    const values = boxes.map(box => box.children[1] as HTMLElement)
    expect(new Set(values.map(v => v.style.fontSize)).size).toBe(1)
    expect(new Set(values.map(v => v.style.fontWeight)).size).toBe(1)
    expect(values[0]).toHaveTextContent('6 months')
    expect(values[1]).toHaveTextContent('7 days')
  })

  it('lists every heir in its own hoverable row with an avatar chip and the share', () => {
    renderVault()

    expect(screen.getByText('Your heirs (2)')).toBeInTheDocument()
    const rows = [HEIRS[0], HEIRS[1]].map(h => screen.getByText(`${h.wallet.slice(0, 12)}...${h.wallet.slice(-8)}`).closest('.ui-card-sm') as HTMLElement)

    rows.forEach(row => {
      expect(row).not.toBeNull()
      expect(row.querySelector('svg')).not.toBeNull()
    })
    expect(rows[0]).toHaveTextContent('60%')
    expect(rows[1]).toHaveTextContent('40%')
  })

  it('gives the two big cards the same header treatment as the action cards (icon chip + title)', () => {
    renderVault()

    for (const title of ['Your Vault', 'Your heirs (2)']) {
      const card = screen.getByText(title).closest('.ui-card') as HTMLElement
      expect(card).not.toBeNull()
      expect(card.style.padding).toBe('1.5rem')
      expect(screen.getByText(title).parentElement!.querySelector('svg')).not.toBeNull()
    }
  })

  it('shows a "Protected" badge with an icon, and no emoji, while the vault is safe', () => {
    renderVault()

    const badge = screen.getByText('Protected')
    expect(badge.querySelector('svg') ?? badge.parentElement?.querySelector('svg')).not.toBeNull()
    expect(document.body.textContent).not.toMatch(/[✓⚠️⏰]/u)
  })

  it('flips to a "Claimable" badge and a prominent alert banner when heirs can claim right now', () => {
    renderVault({ canClaim: true })

    expect(screen.getByText('Claimable')).toBeInTheDocument()
    const banner = screen.getByRole('alert')
    expect(banner).toHaveTextContent('Your heirs can claim your funds right now')
    expect(banner.style.padding).toBe('14px 16px') // prominent variant
  })

  it('shows the time remaining as a calm success message when there is plenty of time left', () => {
    renderVault({ daysLeft: 300 })

    const message = screen.getByText('300 days until heirs can claim').closest('[role="status"]') as HTMLElement
    expect(message).not.toBeNull()
    expect(message.querySelector('svg')).not.toBeNull()
  })

  it('shows a warning banner when the deadline is close', () => {
    renderVault({ daysLeft: 3 })

    const banner = screen.getByText('Only 3 days left — check in now!').closest('[role="status"]') as HTMLElement
    expect(banner).not.toBeNull()
    expect(banner.style.padding).toBe('14px 16px') // prominent variant
  })

  it('pins each detail value to the bottom of its box, so values in the same row line up even when one label wraps', () => {
    // Regression: at 375px "Next check-in deadline" wraps to two lines, and its value used to drop
    // below its neighbour's value ("Last check-in") instead of staying level with it.
    renderVault()

    for (const label of ['Check-in every', 'Safety window', 'Last check-in', 'Next check-in deadline']) {
      const box = screen.getByText(label).closest('.ui-card-sm') as HTMLElement
      expect(box.style.display).toBe('flex')
      expect(box.style.flexDirection).toBe('column')
      expect(box.style.justifyContent).toBe('space-between')
    }
  })
})

describe('VaultStatus loading state', () => {
  it('shows the skeleton (not a blank screen) while getVault is still loading', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111' } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      if (params.functionName === 'getVault') return { data: undefined, isLoading: true }
      return { data: undefined }
    }) as any)

    const { container } = render(<VaultStatus />)

    expect(screen.getByTestId('vault-status-skeleton')).toBeInTheDocument()
    expect(container).not.toBeEmptyDOMElement()
    expect(screen.queryByText('Your Vault')).not.toBeInTheDocument()
  })

  it('replaces the skeleton with the real cards once getVault resolves', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111' } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'getVault':
          return { data: [BigInt(TIMELOCK_DAYS * DAY), BigInt(GRACE_DAYS * DAY), 0n, true, []], isLoading: false }
        case 'timeUntilClaim':
          return { data: BigInt(TIMELOCK_DAYS * DAY) }
        case 'canClaim':
          return { data: false }
        default:
          return { data: undefined }
      }
    }) as any)

    render(<VaultStatus />)

    expect(screen.queryByTestId('vault-status-skeleton')).not.toBeInTheDocument()
    expect(screen.getByText('Your Vault')).toBeInTheDocument()
    expect(screen.getByText('Your Vault').closest('.ui-card')).toHaveClass('ui-enter')
  })

  it('shows nothing once loading is done and the wallet genuinely has no vault (not the skeleton)', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111' } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      if (params.functionName === 'getVault') return { data: [0n, 0n, 0n, false, []], isLoading: false }
      return { data: undefined }
    }) as any)

    const { container } = render(<VaultStatus />)

    expect(screen.queryByTestId('vault-status-skeleton')).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })
})

describe('VaultStatus balance section', () => {
  const OWNER = '0x1111111111111111111111111111111111111111'
  const USDC = '0x3600000000000000000000000000000000000000'
  const EURC = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a'

  // getBalances result + per-token symbol/decimals; `overrides` lets a test swap any read (e.g. loading).
  function mockVault(balances: any, tokenInfo: Record<string, { symbol: string; decimals: number }> = {}, overrides: Record<string, any> = {}) {
    mockUseAccount.mockReturnValue({ address: OWNER } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      if (overrides[params.functionName]) return overrides[params.functionName]
      switch (params.functionName) {
        case 'getVault':
          return { data: [BigInt(TIMELOCK_DAYS * DAY), BigInt(GRACE_DAYS * DAY), 0n, true, []], isLoading: false }
        case 'timeUntilClaim':
          return { data: BigInt(TIMELOCK_DAYS * DAY) }
        case 'canClaim':
          return { data: false }
        case 'getBalances':
          return { data: balances, isLoading: false }
        case 'symbol':
          return { data: tokenInfo[params.address]?.symbol, isLoading: false }
        case 'decimals':
          return { data: tokenInfo[params.address]?.decimals, isLoading: false }
        default:
          return { data: undefined }
      }
    }) as any)
  }

  it('reads the balance for the connected owner via getBalances (not the contract-wide token balance)', () => {
    mockVault([])
    render(<VaultStatus />)

    const call = mockUseReadContract.mock.calls.map(c => c[0] as any).find(p => p.functionName === 'getBalances')
    expect(call.args).toEqual([OWNER])
  })

  it('shows the deposited amount with the token symbol, formatted with the token\'s own decimals', () => {
    mockVault([{ token: USDC, amount: 2_000_000n }], { [USDC]: { symbol: 'USDC', decimals: 6 } })
    render(<VaultStatus />)

    expect(screen.getByText('Vault balance')).toBeInTheDocument()
    const row = screen.getByTestId('vault-balance-row')
    expect(row).toHaveTextContent('USDC')
    expect(row).toHaveTextContent('2.00')
  })

  it('lists one row per token when several are deposited, each with its own decimals', () => {
    mockVault(
      [{ token: USDC, amount: 1_500_000n }, { token: EURC, amount: 10n ** 18n }],
      { [USDC]: { symbol: 'USDC', decimals: 6 }, [EURC]: { symbol: 'WEIRD', decimals: 18 } },
    )
    render(<VaultStatus />)

    const rows = screen.getAllByTestId('vault-balance-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('1.50')
    expect(rows[1]).toHaveTextContent('WEIRD')
    expect(rows[1]).toHaveTextContent('1.00')
  })

  it('hides tokens whose balance is zero and shows a token listed twice by the contract only once', () => {
    mockVault(
      [
        { token: USDC, amount: 2_000_000n },
        { token: EURC, amount: 0n },
        { token: USDC.toLowerCase(), amount: 2_000_000n },
      ],
      { [USDC]: { symbol: 'USDC', decimals: 6 }, [USDC.toLowerCase()]: { symbol: 'USDC', decimals: 6 } },
    )
    render(<VaultStatus />)

    expect(screen.getAllByTestId('vault-balance-row')).toHaveLength(1)
  })

  it('says so when nothing has been deposited yet', () => {
    mockVault([])
    render(<VaultStatus />)

    expect(screen.getByText('No funds deposited yet.')).toBeInTheDocument()
    expect(screen.queryByTestId('vault-balance-row')).not.toBeInTheDocument()
  })

  it('shows a balance skeleton (not an empty state) while getBalances is loading', () => {
    mockVault(undefined, {}, { getBalances: { data: undefined, isLoading: true } })
    render(<VaultStatus />)

    expect(screen.getByTestId('vault-balances-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('No funds deposited yet.')).not.toBeInTheDocument()
    // The rest of the card is already real content.
    expect(screen.getByText('Your Vault')).toBeInTheDocument()
  })

  it('shows skeletons in the row while the token symbol/decimals are still loading, then the real values', () => {
    mockVault(
      [{ token: USDC, amount: 2_000_000n }],
      {},
      { symbol: { data: undefined, isLoading: true }, decimals: { data: undefined, isLoading: true } },
    )
    const { unmount } = render(<VaultStatus />)

    const row = screen.getByTestId('vault-balance-row')
    expect(row.querySelectorAll('.ui-skeleton').length).toBeGreaterThan(0)
    expect(row).not.toHaveTextContent('2.00')
    unmount()

    mockVault([{ token: USDC, amount: 2_000_000n }], { [USDC]: { symbol: 'USDC', decimals: 6 } })
    render(<VaultStatus />)
    expect(screen.getByTestId('vault-balance-row').querySelectorAll('.ui-skeleton')).toHaveLength(0)
    expect(screen.getByTestId('vault-balance-row')).toHaveTextContent('2.00')
  })

  it('never guesses decimals: an unreadable token shows its address and a dash, not a made-up amount', () => {
    mockVault([{ token: EURC, amount: 123n }], {})
    render(<VaultStatus />)

    const row = screen.getByTestId('vault-balance-row')
    expect(row).toHaveTextContent('0x89B5...D72a')
    expect(row).toHaveTextContent('—')
  })

  it('includes a balance section in the whole-card loading skeleton, so nothing shifts when it resolves', () => {
    mockUseAccount.mockReturnValue({ address: OWNER } as any)
    mockUseReadContract.mockImplementation(((params: any) =>
      params.functionName === 'getVault' ? { data: undefined, isLoading: true } : { data: undefined }) as any)
    render(<VaultStatus />)

    expect(screen.getByTestId('vault-status-skeleton').querySelector('[data-testid="vault-balances-skeleton"]')).not.toBeNull()
  })
})

describe('VaultStatus: v2 vs legacy (v1) contract', () => {
  beforeEach(() => { mockUseReadContract.mockClear() })

  const owner = '0x1111111111111111111111111111111111111111'
  const heirs = [{ wallet: '0x2222222222222222222222222222222222222222', percentage: 100 }]

  function mockClaimableVault() {
    mockUseAccount.mockReturnValue({ address: owner } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'getVault':
          return { data: [BigInt(30 * 86400), BigInt(7 * 86400), 0n, true, heirs], isLoading: false }
        case 'timeUntilClaim':
          return { data: 0n }
        case 'canClaim':
          return { data: true }
        default:
          return { data: undefined }
      }
    }) as any)
  }

  it('reads from the v2 contract by default and explains claim rounds when heirs can claim', () => {
    mockClaimableVault()
    render(<VaultStatus />)

    const addresses = mockUseReadContract.mock.calls.map(c => (c[0] as any).address)
    expect(addresses).toContain(CONTRACT_ADDRESS)
    expect(addresses).not.toContain(LEGACY_CONTRACT_ADDRESS)
    expect(screen.getByTestId('claim-round-note')).toHaveTextContent(/new claim round/)
    expect(screen.getByTestId('claim-round-note')).toHaveTextContent(/keep what they already claimed/)
  })

  it('reads every vault value from v1 for a legacy vault, and has no claim-round note (rounds are v2-only)', () => {
    mockClaimableVault()
    render(<VaultStatus contract={LEGACY_CONTRACT_ADDRESS} />)

    const vaultReads = mockUseReadContract.mock.calls
      .map(c => c[0] as any)
      .filter(p => ['getVault', 'timeUntilClaim', 'canClaim', 'getBalances'].includes(p.functionName))
    expect(vaultReads.length).toBeGreaterThan(0)
    for (const read of vaultReads) expect(read.address).toBe(LEGACY_CONTRACT_ADDRESS)
    expect(screen.queryByTestId('claim-round-note')).not.toBeInTheDocument()
  })

  it('puts the legacy contract address in the heirs\' PDF for a legacy vault', () => {
    mockClaimableVault()
    mockGenerateInheritancePdf.mockResolvedValue(undefined)
    render(<VaultStatus contract={LEGACY_CONTRACT_ADDRESS} />)

    fireEvent.click(screen.getByTestId('download-instructions-button'))
    expect(mockGenerateInheritancePdf).toHaveBeenLastCalledWith(expect.objectContaining({ contractAddress: LEGACY_CONTRACT_ADDRESS }))
  })
})
