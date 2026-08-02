import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
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
})
