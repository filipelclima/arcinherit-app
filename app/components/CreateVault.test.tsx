import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { CreateVault } from './CreateVault'

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

describe('CreateVault', () => {
  it('shows a success screen with next steps once the vault creation transaction confirms, and only calls onCreated when the user continues', () => {
    const onCreated = vi.fn()
    const address = '0x1111111111111111111111111111111111111111'

    mockUseAccount.mockReturnValue({ address, chain: { id: 5042002 } } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: '0xhash', isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: true } as any)

    render(<CreateVault onCreated={onCreated} />)

    expect(screen.getByText('Vault created!')).toBeInTheDocument()
    expect(screen.getByText('Now deposit tokens to protect your inheritance.')).toBeInTheDocument()
    expect(onCreated).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Continue to deposit →'))
    expect(onCreated).toHaveBeenCalled()
  })

  it('lets a connected wallet create a vault even when useAccount().chain is undefined (e.g. wallet active on a different network)', () => {
    const writeContract = vi.fn()
    const address = '0x1111111111111111111111111111111111111111'

    // This is the exact bug scenario: address is present (wallet IS connected — the header
    // shows it fine) but wagmi's useAccount().chain resolves to undefined whenever the wallet's
    // current chain isn't one wagmi recognizes from our config's chain list.
    mockUseAccount.mockReturnValue({ address, chain: undefined } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    render(<CreateVault onCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Heir 1 — wallet address (0x...)'), {
      target: { value: '0x2222222222222222222222222222222222222222' },
    })
    fireEvent.click(screen.getByText('Create my inheritance vault →'))

    expect(screen.queryByText('Connect your wallet first')).not.toBeInTheDocument()
    expect(writeContract).toHaveBeenCalledTimes(1)
    expect(writeContract.mock.calls[0][0]).toMatchObject({ account: address })
    expect(writeContract.mock.calls[0][0].chain).toBeDefined()
  })

  it('renders the create-vault form (not the success screen) before any transaction has succeeded', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', chain: { id: 5042002 } } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    render(<CreateVault onCreated={vi.fn()} />)

    expect(screen.getByText('Set up your inheritance vault')).toBeInTheDocument()
    expect(screen.queryByText('Vault created!')).not.toBeInTheDocument()
  })

  it('disables vault creation while the connected wallet is on the wrong network', () => {
    const writeContract = vi.fn()
    const address = '0x1111111111111111111111111111111111111111'

    mockUseAccount.mockReturnValue({ address, isConnected: true, chainId: 42161 } as any) // Arbitrum, not Arc Testnet
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    render(<CreateVault onCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Heir 1 — wallet address (0x...)'), {
      target: { value: '0x2222222222222222222222222222222222222222' },
    })
    const button = screen.getByText('Create my inheritance vault →')
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(writeContract).not.toHaveBeenCalled()
  })

  function mockReadyToCreate(overrides: { isSuccess?: boolean } = {}) {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: 5042002 } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: overrides.isSuccess ?? false } as any)
  }

  it('uses the shared card header and shows the irreversibility notice as an info message with a lock icon (no emoji)', () => {
    mockReadyToCreate()
    render(<CreateVault onCreated={vi.fn()} />)

    const title = screen.getByText('Set up your inheritance vault')
    expect(title.parentElement?.querySelector('svg')).not.toBeNull()
    expect(title.closest('.ui-card')).toHaveClass('ui-enter')

    const notice = screen.getByText('This is irreversible once created.').closest('[role="status"]') as HTMLElement
    expect(notice).not.toBeNull()
    expect(notice.querySelector('svg')).not.toBeNull()
    expect(document.body.textContent).not.toMatch(/[🔒⚠️]/u)
  })

  it('shows submit-time validation problems with the shared error message (alert role + icon)', () => {
    mockReadyToCreate()
    render(<CreateVault onCreated={vi.fn()} />)

    // The single heir row starts empty, so creating right away must be rejected.
    fireEvent.click(screen.getByText('Create my inheritance vault →'))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('All heir wallet addresses must start with 0x and be valid')
    expect(alert.querySelector('svg')).not.toBeNull()
  })

  it('flags a malformed heir address inline, right under that field', () => {
    mockReadyToCreate()
    render(<CreateVault onCreated={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Heir 1 — wallet address (0x...)'), { target: { value: 'not-an-address' } })

    const inline = screen.getByText('Wallet address must start with 0x').closest('[role="alert"]') as HTMLElement
    expect(inline).not.toBeNull()
    expect(inline.querySelector('svg')).not.toBeNull()
  })

  it('gives every preset chip and the primary button press feedback, and keeps one shared look for the primary button', () => {
    mockReadyToCreate()
    render(<CreateVault onCreated={vi.fn()} />)

    for (const label of ['3 months', '1 year ✓', '2 years', '7 days', '1 month ✓', '2 months']) {
      expect(screen.getByText(label)).toHaveClass('ui-press')
    }
    const submit = screen.getByText('Create my inheritance vault →')
    expect(submit).toHaveClass('ui-press')
    expect(submit.style.padding).toBe('14px')
    expect(submit.style.borderRadius).toBe('10px')
  })

  it('celebrates a created vault with an icon chip instead of an emoji, and keeps the continue action', () => {
    mockReadyToCreate({ isSuccess: true })
    render(<CreateVault onCreated={vi.fn()} />)

    const title = screen.getByText('Vault created!')
    const card = title.closest('.ui-card') as HTMLElement
    expect(card.querySelector('svg')).not.toBeNull()
    expect(document.body.textContent).not.toContain('✅')
    expect(screen.getByText('Continue to deposit →')).toHaveClass('ui-press')
  })

  it('shows a skeleton (not the empty form or a flash of it) while checking if this address already has a vault', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: 5042002 } as any)
    mockUseReadContract.mockReturnValue({ data: undefined, isLoading: true } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false } as any)

    render(<CreateVault onCreated={vi.fn()} />)

    expect(screen.getByTestId('create-vault-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('Set up your inheritance vault')).not.toBeInTheDocument()
  })

  it('shows the real form once the check resolves and finds no existing vault', () => {
    mockReadyToCreate()
    render(<CreateVault onCreated={vi.fn()} />)

    expect(screen.queryByTestId('create-vault-skeleton')).not.toBeInTheDocument()
    expect(screen.getByText('Set up your inheritance vault')).toBeInTheDocument()
  })

  it('prioritizes the success screen over the skeleton right after creating a vault', () => {
    // A stale/refetching existingVault read must never cover the confirmation with a skeleton.
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: 5042002 } as any)
    mockUseReadContract.mockReturnValue({ data: undefined, isLoading: true } as any)
    mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: '0xhash', isPending: false } as any)
    mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: true } as any)

    render(<CreateVault onCreated={vi.fn()} />)

    expect(screen.getByText('Vault created!')).toBeInTheDocument()
    expect(screen.queryByTestId('create-vault-skeleton')).not.toBeInTheDocument()
  })
})
