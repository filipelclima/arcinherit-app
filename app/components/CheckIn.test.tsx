import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { CheckIn } from './CheckIn'
import { CONTRACT_ADDRESS, LEGACY_CONTRACT_ADDRESS } from '@/lib/contract'

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

  it('disables the check-in button while the connected wallet is on the wrong network', () => {
    const writeContract = vi.fn()
    const address = '0x1111111111111111111111111111111111111111'

    // 42161 = Arbitrum, not in this app's configured chains (see useEnsureArcNetwork.ts
    // for why useAccount().chainId, not useChainId(), is what must be mocked here).
    mockUseAccount.mockReturnValue({ address, isConnected: true, chainId: 42161 } as any)
    mockUseReadContract.mockReturnValue({ data: [0n, 0n, 0n, true, []] } as any)
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    render(<CheckIn />)
    const button = screen.getByText('Check in — I am alive')
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(writeContract).not.toHaveBeenCalled()
  })

  it('uses the shared card header (icon chip + title) and makes the check-in button the gradient primary action', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: 5042002 } as any)
    mockUseReadContract.mockReturnValue({ data: [0n, 0n, 0n, true, []] } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    render(<CheckIn />)

    const title = screen.getByText('I am alive')
    expect(title.parentElement?.querySelector('svg')).not.toBeNull()
    expect(title.closest('.ui-card')).not.toBeNull()
    const button = screen.getByText('Check in — I am alive')
    expect(button).toHaveClass('ui-press')
    expect(button.style.background).toContain('linear-gradient')
    expect(document.body.textContent).not.toContain('✓')
  })

  it('confirms a successful check-in with the shared success message (icon included), not an ad-hoc box', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: 5042002 } as any)
    mockUseReadContract.mockReturnValue({ data: [0n, 0n, 0n, true, []] } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: '0xhash', isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: true } as any)

    render(<CheckIn />)

    const message = screen.getByRole('status')
    expect(message).toHaveTextContent('Check-in confirmed! Your countdown has been reset.')
    expect(message).toHaveClass('ui-enter')
    expect(message.querySelector('svg')).not.toBeNull()
  })

  it('shows a skeleton (not a blank screen) while the vault is still loading', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: 5042002 } as any)
    mockUseReadContract.mockReturnValue({ data: undefined, isLoading: true } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    const { container } = render(<CheckIn />)

    expect(screen.getByTestId('check-in-skeleton')).toBeInTheDocument()
    expect(container).not.toBeEmptyDOMElement()
    expect(screen.queryByText('I am alive')).not.toBeInTheDocument()
  })

  it('goes back to blank (not the skeleton) once loading finishes and there is no active vault', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: 5042002 } as any)
    mockUseReadContract.mockReturnValue({ data: undefined, isLoading: false } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    const { container } = render(<CheckIn />)

    expect(screen.queryByTestId('check-in-skeleton')).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })
})

describe('CheckIn: v2 and legacy contracts', () => {
  const address = '0x1111111111111111111111111111111111111111'

  function setup() {
    const writeContract = vi.fn()
    mockUseAccount.mockReturnValue({ address, isConnected: true, chainId: 5042002 } as any)
    mockUseReadContract.mockReturnValue({ data: [0n, 0n, 0n, true, []] } as any)
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)
    return writeContract
  }

  it('checks in on v2 by default', () => {
    const writeContract = setup()
    render(<CheckIn />)
    fireEvent.click(screen.getByText('Check in — I am alive'))
    expect(writeContract.mock.calls[0][0]).toMatchObject({ address: CONTRACT_ADDRESS, functionName: 'checkIn' })
  })

  it('checks in on v1 for a legacy vault, reading that vault from v1 too', () => {
    const writeContract = setup()
    mockUseReadContract.mockClear()
    render(<CheckIn contract={LEGACY_CONTRACT_ADDRESS} />)
    fireEvent.click(screen.getByText('Check in — I am alive'))

    expect(writeContract.mock.calls[0][0]).toMatchObject({ address: LEGACY_CONTRACT_ADDRESS, functionName: 'checkIn' })
    expect((mockUseReadContract.mock.calls[0][0] as any).address).toBe(LEGACY_CONTRACT_ADDRESS)
  })
})
