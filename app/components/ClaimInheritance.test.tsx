import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { ClaimInheritance } from './ClaimInheritance'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
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
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false } as any)
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
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false } as any)
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
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
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
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
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
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
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
