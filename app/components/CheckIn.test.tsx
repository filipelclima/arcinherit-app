import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { CheckIn } from './CheckIn'

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

describe('CheckIn', () => {
  it('lets a connected wallet check in even when useAccount().chain is undefined (e.g. wallet active on a different network)', () => {
    const writeContract = vi.fn()
    const address = '0x1111111111111111111111111111111111111111'

    // Same bug scenario as CreateVault/Deposit: address present, chain undefined.
    // Before the fix this silently did nothing (no error shown at all here).
    mockUseAccount.mockReturnValue({ address, chain: undefined } as any)
    mockUseReadContract.mockReturnValue({ data: [0n, 0n, 0n, true, []] } as any)
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    render(<CheckIn />)
    fireEvent.click(screen.getByText('Check in — I am alive'))

    expect(writeContract).toHaveBeenCalledTimes(1)
    expect(writeContract.mock.calls[0][0]).toMatchObject({ account: address, functionName: 'checkIn' })
    expect(writeContract.mock.calls[0][0].chain).toBeDefined()
  })

  it('renders nothing when there is no active vault', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', chain: undefined } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    const { container } = render(<CheckIn />)
    expect(container).toBeEmptyDOMElement()
  })
})
