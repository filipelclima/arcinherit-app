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
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: '0xhash', isPending: false, reset: vi.fn() } as any)

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
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false, reset: vi.fn() } as any)
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
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false, reset: vi.fn() } as any)
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
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false, reset: vi.fn() } as any)
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

    // With no amount typed, the flow sits on the Approve step (an empty amount never counts as approved).
    fireEvent.click(screen.getByText('1. Approve'))

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
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false, reset: vi.fn() } as any)
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
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false, reset: vi.fn() } as any)
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
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: '0xhash', isPending: false, reset: vi.fn() } as any)
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

describe('Deposit: resetting after a successful deposit', () => {
  const address = '0x1111111111111111111111111111111111111111'

  // Mutable chain state, so a test can "confirm" a tx and re-render like wagmi would.
  function setup({ allowance }: { allowance: bigint }) {
    const state = { allowance, isSuccess: false, hash: undefined as string | undefined }
    const writeContract = vi.fn(() => { state.hash = '0xhash' })
    const reset = vi.fn(() => { state.hash = undefined; state.isSuccess = false })
    mockUseAccount.mockReturnValue({ address, isConnected: true, chainId: 5042002 } as any)
    mockUseWriteContract.mockImplementation((() => ({ writeContract, data: state.hash, isPending: false, reset })) as any)
    mockUseWaitForTransactionReceipt.mockImplementation((() => ({ isLoading: false, isSuccess: state.isSuccess })) as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      switch (params.functionName) {
        case 'getVault': return { data: [0n, 0n, 0n, true, []] }
        case 'decimals': return { data: 6 }
        case 'symbol': return { data: 'USDC' }
        case 'balanceOf': return { data: 1000_000000n }
        case 'allowance': return { data: state.allowance, refetch: vi.fn() }
        default: return { data: undefined }
      }
    }) as any)
    return { state, writeContract, reset }
  }

  const amountInput = () => screen.getByPlaceholderText('0.00') as HTMLInputElement

  it('clears the amount, disables "2. Deposit" and resets the tx once a deposit confirms, so another click cannot deposit again', () => {
    const { state, writeContract, reset } = setup({ allowance: 10_000000n })
    const { rerender } = render(<Deposit />)

    fireEvent.change(amountInput(), { target: { value: '10' } })
    fireEvent.click(screen.getByText('2. Deposit'))
    expect(writeContract).toHaveBeenCalledTimes(1)
    expect((writeContract.mock.calls[0] as any)[0]).toMatchObject({ functionName: 'deposit' })

    // The deposit confirms; it used up the whole allowance.
    state.isSuccess = true
    state.allowance = 0n
    rerender(<Deposit />)
    rerender(<Deposit />)

    expect(reset).toHaveBeenCalled()
    expect(amountInput().value).toBe('')
    expect(screen.getByTestId('deposit-notice')).toHaveTextContent('Deposit successful: 10 USDC added to your vault.')
    expect(screen.getByText('2. Deposit')).toBeDisabled()

    fireEvent.click(screen.getByText('2. Deposit'))
    expect(writeContract).toHaveBeenCalledTimes(1)
  })

  it('needs a new approve for the next deposit when the allowance was used up', () => {
    const { state } = setup({ allowance: 10_000000n })
    const { rerender } = render(<Deposit />)
    fireEvent.change(amountInput(), { target: { value: '10' } })
    fireEvent.click(screen.getByText('2. Deposit'))
    state.isSuccess = true
    state.allowance = 0n
    rerender(<Deposit />)
    rerender(<Deposit />)

    fireEvent.change(amountInput(), { target: { value: '5' } })
    expect(screen.getByText('1. Approve')).not.toBeDisabled()
    expect(screen.getByText('1. Approve').style.background).toContain('linear-gradient')
    expect(screen.getByText('2. Deposit')).toBeDisabled()
  })

  it('goes straight to "2. Deposit" for a new amount the remaining allowance still covers', () => {
    const { state } = setup({ allowance: 50_000000n })
    const { rerender } = render(<Deposit />)
    fireEvent.change(amountInput(), { target: { value: '10' } })
    fireEvent.click(screen.getByText('2. Deposit'))
    state.isSuccess = true
    state.allowance = 40_000000n
    rerender(<Deposit />)
    rerender(<Deposit />)

    expect(screen.getByText('2. Deposit')).toBeDisabled() // empty amount after the reset
    fireEvent.change(amountInput(), { target: { value: '5' } })
    expect(screen.getByText('Approved')).toBeDisabled()
    expect(screen.getByText('2. Deposit')).not.toBeDisabled()
  })

  it('keeps the amount after an approval (the deposit still has to happen) and says what is next', () => {
    const { state, reset } = setup({ allowance: 0n })
    const { rerender } = render(<Deposit />)
    fireEvent.change(amountInput(), { target: { value: '10' } })
    fireEvent.click(screen.getByText('1. Approve'))

    state.isSuccess = true
    state.allowance = 10_000000n
    rerender(<Deposit />)
    rerender(<Deposit />)

    expect(reset).toHaveBeenCalled()
    expect(amountInput().value).toBe('10')
    expect(screen.getByTestId('deposit-notice')).toHaveTextContent('Approval successful — now deposit')
    expect(screen.getByText('2. Deposit')).not.toBeDisabled()
  })

  it('never enables "2. Deposit" for an empty amount, however large the allowance', () => {
    setup({ allowance: 1_000_000_000000n })
    render(<Deposit />)
    expect(screen.getByText('2. Deposit')).toBeDisabled()
  })
})
