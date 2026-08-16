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
})
