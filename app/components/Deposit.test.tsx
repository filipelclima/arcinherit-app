import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { Deposit } from './Deposit'

const invalidateQueries = vi.fn()
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
}))

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

  function mockActiveVault(allowance: bigint) {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: 5042002 } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
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
          return { data: allowance, refetch: vi.fn() }
        default:
          return { data: undefined }
      }
    }) as any)
  }

  it('shows a validation error with the shared error message (alert role + icon) instead of an ad-hoc box', () => {
    mockActiveVault(0n)
    render(<Deposit />)

    // With no amount typed, allowance (0) >= amount (0), so the flow already sits on the Deposit step.
    fireEvent.click(screen.getByText('2. Deposit'))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Enter an amount')
    expect(alert.querySelector('svg')).not.toBeNull()
  })

  it('keeps exactly one gradient primary action at a time: Approve first, then Deposit once approved', () => {
    mockActiveVault(0n)
    const { unmount } = render(<Deposit />)
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } })

    expect(screen.getByText('1. Approve').style.background).toContain('linear-gradient')
    expect(screen.getByText('2. Deposit').style.background).not.toContain('linear-gradient')
    unmount()

    mockActiveVault(10_000_000n)
    render(<Deposit />)
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } })

    expect(screen.getByText('Approved').style.background).not.toContain('linear-gradient')
    expect(screen.getByText('2. Deposit').style.background).toContain('linear-gradient')
  })

  it('uses the shared card header and gives both step buttons the same size, weight and press feedback', () => {
    mockActiveVault(0n)
    render(<Deposit />)
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } })

    const title = screen.getByText('Deposit Tokens')
    expect(title.parentElement?.querySelector('svg')).not.toBeNull()
    const approve = screen.getByText('1. Approve')
    const deposit = screen.getByText('2. Deposit')
    expect(approve).toHaveClass('ui-press')
    expect(deposit).toHaveClass('ui-press')
    for (const key of ['fontSize', 'fontWeight', 'borderRadius', 'padding'] as const) {
      expect(approve.style[key]).toBe(deposit.style[key])
    }
  })

  it('shows a skeleton (not a blank screen) while the vault is still loading', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: 5042002 } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      if (params.functionName === 'getVault') return { data: undefined, isLoading: true }
      return { data: undefined }
    }) as any)

    const { container } = render(<Deposit />)

    expect(screen.getByTestId('deposit-skeleton')).toBeInTheDocument()
    expect(container).not.toBeEmptyDOMElement()
    expect(screen.queryByText('Deposit Tokens')).not.toBeInTheDocument()
  })

  it('goes back to blank (not the skeleton) once loading finishes and there is no active vault', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: 5042002 } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      if (params.functionName === 'getVault') return { data: undefined, isLoading: false }
      return { data: undefined }
    }) as any)

    const { container } = render(<Deposit />)

    expect(screen.queryByTestId('deposit-skeleton')).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })
})

describe('Deposit → vault balance refresh', () => {
  it('invalidates the vault balance and wallet balance reads (and only those) once a transaction succeeds', () => {
    invalidateQueries.mockClear()
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111' } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: '0xhash', isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      if (params.functionName === 'getVault') return { data: [0n, 0n, 0n, true, []] }
      if (params.functionName === 'allowance') return { data: 0n, refetch: vi.fn() }
      return { data: undefined }
    }) as any)

    const { rerender } = render(<Deposit />)
    expect(invalidateQueries).not.toHaveBeenCalled()

    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: true } as any)
    rerender(<Deposit />)

    expect(invalidateQueries).toHaveBeenCalledTimes(1)
    const { predicate } = invalidateQueries.mock.calls[0][0]
    const key = (functionName: string, root = 'readContract') => ({ queryKey: [root, { functionName }] })
    expect(predicate(key('getBalances'))).toBe(true)
    expect(predicate(key('balanceOf'))).toBe(true)
    expect(predicate(key('getVault'))).toBe(false)
    expect(predicate(key('getBalances', 'somethingElse'))).toBe(false)
  })
})
