import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { Deposit } from './Deposit'

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

describe('Deposit', () => {
  it('refetches the allowance once a transaction succeeds, so "2. Deposit" enables without a manual refresh', () => {
    const refetchAllowance = vi.fn()
    const address = '0x1111111111111111111111111111111111111111'

    mockUseAccount.mockReturnValue({ address, chain: { id: 5042002 } } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: '0xhash', isPending: false } as any)

    let isSuccess = false
    mockUseWaitForTransactionReceipt.mockImplementation(() => ({ isLoading: false, isSuccess }) as any)

    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'getVault':
          return { data: [0n, 0n, 0n, true, []] }
        case 'decimals':
          return { data: 6 }
        case 'symbol':
          return { data: 'USDC' }
        case 'balanceOf':
          return { data: 1000n }
        case 'allowance':
          return { data: 0n, refetch: refetchAllowance }
        default:
          return { data: undefined }
      }
    }) as any)

    const { rerender } = render(<Deposit />)
    expect(refetchAllowance).not.toHaveBeenCalled()

    isSuccess = true
    rerender(<Deposit />)

    expect(refetchAllowance).toHaveBeenCalled()
  })

  it('lets a connected wallet approve/deposit even when useAccount().chain is undefined (e.g. wallet active on a different network)', () => {
    const writeContract = vi.fn()
    const address = '0x1111111111111111111111111111111111111111'

    // Same bug scenario as CreateVault: address present, chain undefined.
    mockUseAccount.mockReturnValue({ address, chain: undefined } as any)
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'getVault':
          return { data: [0n, 0n, 0n, true, []] }
        case 'decimals':
          return { data: 6 }
        case 'symbol':
          return { data: 'USDC' }
        case 'balanceOf':
          return { data: 1000n }
        case 'allowance':
          return { data: 0n, refetch: vi.fn() }
        default:
          return { data: undefined }
      }
    }) as any)

    render(<Deposit />)

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } })
    fireEvent.click(screen.getByText('1. Approve'))

    expect(screen.queryByText('Connect your wallet first')).not.toBeInTheDocument()
    expect(writeContract).toHaveBeenCalledTimes(1)
    expect(writeContract.mock.calls[0][0]).toMatchObject({ account: address })
    expect(writeContract.mock.calls[0][0].chain).toBeDefined()
  })

  it('disables both approve and deposit buttons while the connected wallet is on the wrong network', () => {
    const writeContract = vi.fn()
    const address = '0x1111111111111111111111111111111111111111'

    mockUseAccount.mockReturnValue({ address, isConnected: true, chainId: 42161 } as any) // Arbitrum, not Arc Testnet
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'getVault':
          return { data: [0n, 0n, 0n, true, []] }
        case 'decimals':
          return { data: 6 }
        case 'symbol':
          return { data: 'USDC' }
        case 'balanceOf':
          return { data: 1000n }
        case 'allowance':
          return { data: 0n, refetch: vi.fn() }
        default:
          return { data: undefined }
      }
    }) as any)

    render(<Deposit />)
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } })

    expect(screen.getByText('1. Approve')).toBeDisabled()
    expect(screen.getByText('2. Deposit')).toBeDisabled()

    fireEvent.click(screen.getByText('1. Approve'))
    expect(writeContract).not.toHaveBeenCalled()
  })
})
