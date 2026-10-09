import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { UserRejectedRequestError } from 'viem'
import { LegacyVault, V2_CHANGELOG_URL } from './LegacyVault'
import { LEGACY_CONTRACT_ADDRESS } from '@/lib/contract'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
}))

const invalidateQueries = vi.fn()
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
}))

const mockUseAccount = vi.mocked(useAccount)
const mockUseWriteContract = vi.mocked(useWriteContract)
const mockUseWaitForTransactionReceipt = vi.mocked(useWaitForTransactionReceipt)

const OWNER = '0x1111111111111111111111111111111111111111'

function setup({ chainId = 5042002, isSuccess = false, error = null as unknown } = {}) {
  const writeContract = vi.fn()
  mockUseAccount.mockReturnValue({ address: OWNER, isConnected: true, chainId } as any)
  mockUseWriteContract.mockReturnValue({ writeContract, data: undefined, isPending: false, error } as any)
  mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess } as any)
  return writeContract
}

describe('LegacyVault', () => {
  beforeEach(() => { invalidateQueries.mockClear() })

  it('explains the v1 bug and links to the v2 changelog and the legacy contract on the new explorer', () => {
    setup()
    render(<LegacyVault onCancelled={vi.fn()} />)

    expect(screen.getByTestId('legacy-vault-badge')).toHaveTextContent('Legacy vault')
    expect(screen.getByTestId('legacy-vault-notice')).toHaveTextContent(/whoever claims later gets less than their percentage/)
    expect(screen.getByRole('link', { name: /What changed in v2/ })).toHaveAttribute('href', V2_CHANGELOG_URL)
    expect(screen.getByRole('link', { name: /Legacy contract on the explorer/ }))
      .toHaveAttribute('href', `https://explorer.testnet.arc.io/address/${LEGACY_CONTRACT_ADDRESS}`)
  })

  it('asks for confirmation before cancelling, and lets the owner back out', () => {
    const writeContract = setup()
    render(<LegacyVault onCancelled={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Step 1: Cancel legacy vault' }))
    expect(writeContract).not.toHaveBeenCalled()
    expect(screen.getByTestId('legacy-cancel-confirm')).toHaveTextContent('returns all of its tokens to your wallet')

    fireEvent.click(screen.getByRole('button', { name: 'Keep it for now' }))
    expect(screen.queryByTestId('legacy-cancel-confirm')).not.toBeInTheDocument()
    expect(writeContract).not.toHaveBeenCalled()
  })

  it('cancels on the v1 contract (never v2) once confirmed', () => {
    const writeContract = setup()
    render(<LegacyVault onCancelled={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Step 1: Cancel legacy vault' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel and return my tokens' }))

    expect(writeContract).toHaveBeenCalledTimes(1)
    expect(writeContract.mock.calls[0][0]).toMatchObject({
      address: LEGACY_CONTRACT_ADDRESS,
      functionName: 'cancelVault',
      account: OWNER,
    })
    expect(writeContract.mock.calls[0][0].chain).toBeDefined()
  })

  it('refreshes the vault reads and moves on to step 2 once the cancel tx confirms', () => {
    setup({ isSuccess: true })
    const onCancelled = vi.fn()
    render(<LegacyVault onCancelled={onCancelled} />)

    expect(onCancelled).toHaveBeenCalledTimes(1)
    expect(invalidateQueries).toHaveBeenCalled()
  })

  it('disables cancelling while on the wrong network', () => {
    setup({ chainId: 42161 })
    render(<LegacyVault onCancelled={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Step 1: Cancel legacy vault' })).toBeDisabled()
  })

  it('shows a rejected cancel in plain words', () => {
    setup({ error: new UserRejectedRequestError(new Error('denied')) })
    render(<LegacyVault onCancelled={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('You rejected the transaction in your wallet.')
  })

  it('for an owner who already has a v2 vault, only offers to close the legacy one (no two-step guide)', () => {
    setup()
    render(<LegacyVault hasCurrentVault onCancelled={vi.fn()} />)

    expect(screen.getByText('You also have a legacy vault')).toBeInTheDocument()
    expect(screen.queryByText('Move to the current contract in two steps')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel legacy vault' })).toBeInTheDocument()
  })
})
