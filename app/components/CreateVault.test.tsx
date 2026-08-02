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
