import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { ContractFunctionExecutionError, ContractFunctionRevertedError, encodeErrorResult } from 'viem'
import { ClaimInheritance } from './ClaimInheritance'
import { ABI, CONTRACT_ADDRESS, LEGACY_CONTRACT_ADDRESS } from '@/lib/contract'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
}))

const invalidateQueries = vi.fn()
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
}))

const mockUseAccount = vi.mocked(useAccount)
const mockUseReadContract = vi.mocked(useReadContract)
const mockUseWriteContract = vi.mocked(useWriteContract)
const mockUseWaitForTransactionReceipt = vi.mocked(useWaitForTransactionReceipt)

const HEIR_ADDRESS = '0x1111111111111111111111111111111111111111'
const OWNER_ADDRESS = '0x3333333333333333333333333333333333333333'
const TOKEN_ADDRESS = '0x4444444444444444444444444444444444444444'

describe('ClaimInheritance', () => {
  it('lets a connected heir claim even when useAccount().chain is undefined (e.g. wallet active on a different network)', () => {
    const writeContract = vi.fn()

    // Same bug scenario as CreateVault/Deposit/CheckIn: address present, chain undefined.
    mockUseAccount.mockReturnValue({ address: HEIR_ADDRESS, chain: undefined } as any)
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false, reset: vi.fn() } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'canClaim':
          return { data: true }
        case 'timeUntilClaim':
          return { data: 0n }
        case 'getVault':
          return { data: [0n, 0n, 0n, true, [{ wallet: HEIR_ADDRESS, percentage: 100 }]] }
        default:
          return { data: undefined }
      }
    }) as any)

    render(<ClaimInheritance />)

    fireEvent.change(screen.getByPlaceholderText('0x... the person who created the vault'), {
      target: { value: OWNER_ADDRESS },
    })
    fireEvent.change(screen.getByPlaceholderText('0x... token contract address'), {
      target: { value: TOKEN_ADDRESS },
    })
    fireEvent.click(screen.getByText('Claim my inheritance'))

    expect(screen.queryByText('Connect your wallet first')).not.toBeInTheDocument()
    expect(writeContract).toHaveBeenCalledTimes(1)
    expect(writeContract.mock.calls[0][0]).toMatchObject({ account: HEIR_ADDRESS, functionName: 'claimInheritance' })
    expect(writeContract.mock.calls[0][0].chain).toBeDefined()
  })

  it('disables the claim button while the connected wallet is on the wrong network, even when otherwise claimable', () => {
    const writeContract = vi.fn()

    mockUseAccount.mockReturnValue({ address: HEIR_ADDRESS, isConnected: true, chainId: 42161 } as any) // Arbitrum, not Arc Testnet
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false, reset: vi.fn() } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'canClaim':
          return { data: true }
        case 'timeUntilClaim':
          return { data: 0n }
        case 'getVault':
          return { data: [0n, 0n, 0n, true, [{ wallet: HEIR_ADDRESS, percentage: 100 }]] }
        default:
          return { data: undefined }
      }
    }) as any)

    render(<ClaimInheritance />)

    fireEvent.change(screen.getByPlaceholderText('0x... the person who created the vault'), {
      target: { value: OWNER_ADDRESS },
    })
    fireEvent.change(screen.getByPlaceholderText('0x... token contract address'), {
      target: { value: TOKEN_ADDRESS },
    })
    const button = screen.getByText('Claim my inheritance')
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(writeContract).not.toHaveBeenCalled()
  })

  function mockVaultOwnedBy(heirWallets: string[], canClaim: boolean) {
    mockUseAccount.mockReturnValue({ address: HEIR_ADDRESS, isConnected: true, chainId: 5042002 } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false, reset: vi.fn() } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'canClaim':
          return { data: canClaim }
        case 'timeUntilClaim':
          return { data: canClaim ? 0n : 3n * 86400n }
        case 'getVault':
          return { data: [0n, 0n, 0n, true, heirWallets.map(wallet => ({ wallet, percentage: 100 }))] }
        default:
          return { data: undefined }
      }
    }) as any)
  }

  function enterOwner() {
    fireEvent.change(screen.getByPlaceholderText('0x... the person who created the vault'), { target: { value: OWNER_ADDRESS } })
  }

  it('tells a listed heir so with the shared success message, and shows the remaining time as a warning with an icon', () => {
    mockVaultOwnedBy([HEIR_ADDRESS], false)
    render(<ClaimInheritance />)
    enterOwner()

    const listed = screen.getByText(/You are listed as an heir \(100% share\)/).closest('[role="status"]') as HTMLElement
    expect(listed).not.toBeNull()
    expect(listed.querySelector('svg')).not.toBeNull()

    const remaining = screen.getByText(/3 days and 0 hours remaining before this vault can be claimed/).closest('[role="status"]') as HTMLElement
    expect(remaining).not.toBeNull()
    expect(remaining.querySelector('svg')).not.toBeNull()
  })

  it('tells a wallet that is not an heir so with the shared error message', () => {
    mockVaultOwnedBy(['0x9999999999999999999999999999999999999999'], true)
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.getByRole('alert')).toHaveTextContent('Your wallet is not listed as an heir of this vault')
  })

  it('only turns the claim button into the gradient primary action when the claim is actually possible', () => {
    mockVaultOwnedBy([HEIR_ADDRESS], false)
    const { unmount } = render(<ClaimInheritance />)
    enterOwner()
    const notYet = screen.getByText('Claim my inheritance')
    expect(notYet).toBeDisabled()
    expect(notYet.style.background).not.toContain('linear-gradient')
    unmount()

    mockVaultOwnedBy([HEIR_ADDRESS], true)
    render(<ClaimInheritance />)
    enterOwner()
    const ready = screen.getByText('Claim my inheritance')
    expect(ready).not.toBeDisabled()
    expect(ready.style.background).toContain('linear-gradient')
    expect(ready).toHaveClass('ui-press')
  })

  it('shows a small skeleton for the status box between typing a valid owner address and the reads about it resolving', () => {
    mockUseAccount.mockReturnValue({ address: HEIR_ADDRESS, isConnected: true, chainId: 5042002 } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false, reset: vi.fn() } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      if (params.functionName === 'getVault') return { data: undefined, isLoading: true }
      return { data: undefined }
    }) as any)

    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.getByTestId('claim-status-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('You are listed as an heir')).not.toBeInTheDocument()
  })

  it('shows no status skeleton before an owner address has been typed', () => {
    mockUseAccount.mockReturnValue({ address: HEIR_ADDRESS, isConnected: true, chainId: 5042002 } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false, reset: vi.fn() } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      if (params.functionName === 'getVault') return { data: undefined, isLoading: true }
      return { data: undefined }
    }) as any)

    render(<ClaimInheritance />)

    expect(screen.queryByTestId('claim-status-skeleton')).not.toBeInTheDocument()
  })

  it('replaces the status skeleton with the real status once the reads resolve', () => {
    mockVaultOwnedBy([HEIR_ADDRESS], false)
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.queryByTestId('claim-status-skeleton')).not.toBeInTheDocument()
    expect(screen.getByText(/You are listed as an heir/)).toBeInTheDocument()
  })
})

describe('ClaimInheritance: v2 and legacy (v1) vaults', () => {
  beforeEach(() => { mockUseReadContract.mockClear() })

  const USDC = '0x3600000000000000000000000000000000000000'
  const OTHER_HEIR = '0x9999999999999999999999999999999999999999'

  type VaultSpec = { heirs: { wallet: string; percentage: number }[]; canClaim: boolean } | null

  // Address-aware mock: each contract answers for its own vault (null = no active vault there).
  function mockContracts({ v2, v1, balance = 600_000000n, snapshot = 0n, claimed = false, round = 0n, writeContract = vi.fn(), writeError = null as unknown }: {
    v2: VaultSpec
    v1: VaultSpec
    balance?: bigint
    snapshot?: bigint
    claimed?: boolean
    round?: bigint
    writeContract?: ReturnType<typeof vi.fn>
    writeError?: unknown
  }) {
    mockUseAccount.mockReturnValue({ address: HEIR_ADDRESS, isConnected: true, chainId: 5042002 } as any)
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false, reset: vi.fn(), error: writeError } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      if (params.address === USDC) {
        if (params.functionName === 'symbol') return { data: 'USDC', isLoading: false }
        if (params.functionName === 'decimals') return { data: 6, isLoading: false }
      }
      const spec = params.address === CONTRACT_ADDRESS ? v2 : params.address === LEGACY_CONTRACT_ADDRESS ? v1 : null
      switch (params.functionName) {
        case 'getVault':
          return { data: spec ? [0n, 0n, 0n, true, spec.heirs] : [0n, 0n, 0n, false, []], isLoading: false }
        case 'canClaim':
          return { data: !!spec?.canClaim }
        case 'timeUntilClaim':
          return { data: spec?.canClaim ? 0n : 3n * 86400n }
        case 'getBalances':
          return { data: [{ token: USDC, amount: balance }], isLoading: false }
        case 'claimSnapshot':
          return { data: snapshot, isLoading: false }
        case 'hasClaimed':
          return { data: claimed }
        case 'claimRound':
          return { data: round }
        default:
          return { data: undefined }
      }
    }) as any)
    return writeContract
  }

  const enterOwner = () =>
    fireEvent.change(screen.getByPlaceholderText('0x... the person who created the vault'), { target: { value: OWNER_ADDRESS } })

  it('finds a vault that only exists on the legacy contract and claims from v1', () => {
    const writeContract = mockContracts({ v2: null, v1: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: true } })
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.getByTestId('claim-legacy-notice')).toHaveTextContent(/original contract \(v1\)/)
    expect(screen.getByText(/You are listed as an heir \(100% share\)/)).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('claim-share-row'))
    fireEvent.click(screen.getByText('Claim my inheritance'))
    expect(writeContract).toHaveBeenCalledTimes(1)
    expect(writeContract.mock.calls[0][0]).toMatchObject({ address: LEGACY_CONTRACT_ADDRESS, functionName: 'claimInheritance', args: [OWNER_ADDRESS, USDC] })
  })

  it('claims from v2 for a v2 vault, with no legacy notice', () => {
    const writeContract = mockContracts({ v2: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: true }, v1: null })
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.queryByTestId('claim-legacy-notice')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('claim-share-row'))
    fireEvent.click(screen.getByText('Claim my inheritance'))
    expect(writeContract.mock.calls[0][0]).toMatchObject({ address: CONTRACT_ADDRESS })
  })

  it('uses the vault the wallet is an heir of when the owner has one on each contract', () => {
    mockContracts({
      v2: { heirs: [{ wallet: OTHER_HEIR, percentage: 100 }], canClaim: true },
      v1: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: true },
    })
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.getByTestId('claim-legacy-notice')).toBeInTheDocument()
    expect(screen.getByText(/You are listed as an heir/)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Which vault' })).not.toBeInTheDocument()
  })

  it('lets an heir of vaults on both contracts switch between them, defaulting to the current one', () => {
    const writeContract = mockContracts({
      v2: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: true },
      v1: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: true },
    })
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.getByRole('button', { name: 'Current contract' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('claim-legacy-notice')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Legacy contract (v1)' }))
    expect(screen.getByTestId('claim-legacy-notice')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('claim-share-row'))
    fireEvent.click(screen.getByText('Claim my inheritance'))
    expect(writeContract.mock.calls[0][0]).toMatchObject({ address: LEGACY_CONTRACT_ADDRESS })
  })

  it('says so when neither contract has an active vault for that owner', () => {
    mockContracts({ v2: null, v1: null })
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.getByRole('alert')).toHaveTextContent('No active vault found for this address')
    expect(screen.getByText('Claim my inheritance')).toBeDisabled()
  })

  it('v2: shows the heir their exact share from the claim snapshot, regardless of claim order', () => {
    // 40/60 split of 1000 USDC: the 40% heir already claimed, 600 left, snapshot 1000.
    mockContracts({
      v2: { heirs: [{ wallet: OTHER_HEIR, percentage: 40 }, { wallet: HEIR_ADDRESS, percentage: 60 }], canClaim: true },
      v1: null,
      balance: 600_000000n,
      snapshot: 1000_000000n,
    })
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.getByTestId('claim-share-amount')).toHaveTextContent('600.00 USDC')
    expect(screen.getByTestId('claim-share-row')).toHaveTextContent('60% of 1,000.00 USDC, the balance when the first heir claimed')
    expect(screen.getByTestId('claim-shares')).toHaveTextContent(/whatever order they claim in/)
    expect(screen.getByTestId('claim-shares')).toHaveTextContent(/new claim round starts/)
  })

  it('v2: before anyone claims, the share is a percentage of the current balance', () => {
    mockContracts({ v2: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 40 }], canClaim: true }, v1: null, balance: 1000_000000n, snapshot: 0n })
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.getByTestId('claim-share-amount')).toHaveTextContent('400.00 USDC')
    expect(screen.getByTestId('claim-share-row')).toHaveTextContent("the vault's balance now")
  })

  it('legacy: shows the v1 payout (percentage of what is left) and never queries claimSnapshot/claimRound on v1', () => {
    mockContracts({ v2: null, v1: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 60 }], canClaim: true }, balance: 600_000000n, snapshot: 1000_000000n })
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.getByTestId('claim-share-amount')).toHaveTextContent('360.00 USDC')
    const snapshotReads = mockUseReadContract.mock.calls.map(c => c[0] as any).filter(p => p.functionName === 'claimSnapshot')
    expect(snapshotReads.length).toBeGreaterThan(0)
    for (const read of snapshotReads) expect(read.query?.enabled).toBe(false)
    const roundReads = mockUseReadContract.mock.calls.map(c => c[0] as any).filter(p => p.functionName === 'claimRound')
    expect(roundReads).toHaveLength(0)
  })

  it('selecting a token row fills in the token address to claim', () => {
    mockContracts({ v2: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: true }, v1: null })
    render(<ClaimInheritance />)
    enterOwner()

    fireEvent.click(screen.getByTestId('claim-share-row'))
    expect(screen.getByPlaceholderText('0x... token contract address')).toHaveValue(USDC)
    expect(screen.getByTestId('claim-share-row')).toHaveAttribute('aria-pressed', 'true')
  })

  it('marks a token the heir already claimed in this round, and does not let it be picked again', () => {
    mockContracts({ v2: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: true }, v1: null, claimed: true })
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.getByTestId('claim-share-row')).toHaveTextContent('Already claimed')
    expect(screen.getByTestId('claim-share-row')).toBeDisabled()
  })

  it('does not show shares before claims open', () => {
    mockContracts({ v2: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: false }, v1: null })
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.queryByTestId('claim-shares')).not.toBeInTheDocument()
  })

  it('explains a new claim round in plain words after the owner checked in following a claim', () => {
    mockContracts({ v2: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: false }, v1: null, round: 2n })
    render(<ClaimInheritance />)
    enterOwner()

    const notice = screen.getByTestId('claim-round-notice')
    expect(notice).toHaveTextContent('claim round 3')
    expect(notice).toHaveTextContent('Heirs keep what they claimed before')
  })

  it('says claims are open again (not "if claims open again") when a later round is already claimable', () => {
    mockContracts({ v2: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: true }, v1: null, round: 1n })
    render(<ClaimInheritance />)
    enterOwner()

    const notice = screen.getByTestId('claim-round-notice')
    expect(notice).toHaveTextContent('claim round 2')
    expect(notice).toHaveTextContent('Claims are open again')
    expect(notice).not.toHaveTextContent('If claims open again')
  })

  it('clears a previous claim attempt\'s error when the owner address changes', () => {
    const reset = vi.fn()
    mockContracts({ v2: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: true }, v1: null })
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false, error: null, reset } as any)
    render(<ClaimInheritance />)

    // A local validation error from a first attempt...
    enterOwner()
    fireEvent.click(screen.getByText('Claim my inheritance')) // no token picked -> local error
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid token contract address')

    // ...is cleared, and the wagmi mutation reset, once another owner is typed.
    reset.mockClear()
    fireEvent.change(screen.getByPlaceholderText('0x... the person who created the vault'), { target: { value: '0x5555555555555555555555555555555555555555' } })
    expect(reset).toHaveBeenCalled()
    expect(screen.queryByText('Please enter a valid token contract address')).not.toBeInTheDocument()
  })

  it('shows no claim-round notice in the first round', () => {
    mockContracts({ v2: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: false }, v1: null, round: 0n })
    render(<ClaimInheritance />)
    enterOwner()

    expect(screen.queryByTestId('claim-round-notice')).not.toBeInTheDocument()
  })

  it('shows a reverted claim as a friendly message instead of the raw error', () => {
    const reverted = new ContractFunctionRevertedError({
      abi: ABI,
      data: encodeErrorResult({ abi: ABI, errorName: 'AlreadyClaimed' }),
      functionName: 'claimInheritance',
    })
    const writeError = new ContractFunctionExecutionError(reverted, { abi: ABI, functionName: 'claimInheritance', args: [] })
    mockContracts({ v2: { heirs: [{ wallet: HEIR_ADDRESS, percentage: 100 }], canClaim: true }, v1: null, writeError })
    render(<ClaimInheritance />)

    expect(screen.getByRole('alert')).toHaveTextContent('You have already claimed this token in the current claim round.')
  })
})
