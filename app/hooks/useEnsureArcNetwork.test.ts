import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { useEnsureArcNetwork, useIsWrongNetwork } from './useEnsureArcNetwork'
import { ARC_TESTNET } from '@/lib/contract'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useSwitchChain: vi.fn(),
}))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

describe('useIsWrongNetwork', () => {
  it('is false while disconnected, regardless of the reported chain', () => {
    mockUseAccount.mockReturnValue({ isConnected: false, chainId: 42161 } as any)

    const { result } = renderHook(() => useIsWrongNetwork())
    expect(result.current).toBe(false)
  })

  it('is false when connected and on Arc Testnet', () => {
    mockUseAccount.mockReturnValue({ isConnected: true, chainId: ARC_TESTNET.id } as any)

    const { result } = renderHook(() => useIsWrongNetwork())
    expect(result.current).toBe(false)
  })

  it('is true when connected on any chain other than Arc Testnet, including one not in this app\'s configured chains (e.g. Arbitrum)', () => {
    // This is the reported bug scenario: a wallet connects while active on Arbitrum, a chain
    // this app never configures in lib/wagmi.ts. useAccount().chainId must still reflect it
    // accurately (unlike useChainId(), which silently stays pinned to Arc Testnet for any
    // chain outside the configured list — see the comment in useEnsureArcNetwork.ts).
    mockUseAccount.mockReturnValue({ isConnected: true, chainId: 42161 } as any)

    const { result } = renderHook(() => useIsWrongNetwork())
    expect(result.current).toBe(true)
  })
})

describe('useEnsureArcNetwork', () => {
  it('requests a switch to Arc Testnet as soon as it detects a connection on the wrong chain', () => {
    const switchChain = vi.fn()
    mockUseAccount.mockReturnValue({ isConnected: true, chainId: 42161 } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain, status: 'idle' } as any)

    renderHook(() => useEnsureArcNetwork())

    expect(switchChain).toHaveBeenCalledWith({ chainId: ARC_TESTNET.id })
  })

  it('does not request a switch when already on Arc Testnet', () => {
    const switchChain = vi.fn()
    mockUseAccount.mockReturnValue({ isConnected: true, chainId: ARC_TESTNET.id } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain, status: 'idle' } as any)

    renderHook(() => useEnsureArcNetwork())

    expect(switchChain).not.toHaveBeenCalled()
  })

  it('does not request a switch while disconnected', () => {
    const switchChain = vi.fn()
    mockUseAccount.mockReturnValue({ isConnected: false, chainId: 42161 } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain, status: 'idle' } as any)

    renderHook(() => useEnsureArcNetwork())

    expect(switchChain).not.toHaveBeenCalled()
  })

  it('requests a switch again if the wallet moves from the correct chain to a wrong one later (manual network change)', () => {
    const switchChain = vi.fn()
    mockUseSwitchChain.mockReturnValue({ switchChain, status: 'idle' } as any)

    mockUseAccount.mockReturnValue({ isConnected: true, chainId: ARC_TESTNET.id } as any)
    const { rerender } = renderHook(() => useEnsureArcNetwork())
    expect(switchChain).not.toHaveBeenCalled()

    // Simulate the user switching networks manually in their wallet after connecting.
    mockUseAccount.mockReturnValue({ isConnected: true, chainId: 42161 } as any)
    rerender()

    expect(switchChain).toHaveBeenCalledWith({ chainId: ARC_TESTNET.id })
  })

  it('exposes isSwitching based on the mutation status, and a manual switchToArc callback', () => {
    const switchChain = vi.fn()
    mockUseAccount.mockReturnValue({ isConnected: true, chainId: 42161 } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain, status: 'pending' } as any)

    const { result } = renderHook(() => useEnsureArcNetwork())

    expect(result.current.isSwitching).toBe(true)
    expect(result.current.isWrongNetwork).toBe(true)

    switchChain.mockClear()
    result.current.switchToArc()
    expect(switchChain).toHaveBeenCalledWith({ chainId: ARC_TESTNET.id })
  })
})
