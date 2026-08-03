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
})
