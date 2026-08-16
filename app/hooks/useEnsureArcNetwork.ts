'use client'
import { useEffect } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { ARC_TESTNET } from '@/lib/contract'

// Cheap, side-effect-free read of "is the connected wallet on the wrong chain".
// Safe to call from any number of components (CheckIn, Deposit, etc.) to gate
// write actions — unlike useEnsureArcNetwork below, it does not itself trigger
// a network switch, so calling it in multiple places never causes duplicate
// wallet_switchEthereumChain prompts.
//
// Deliberately reads chainId off useAccount(), never useChainId() and never
// useAccount().chain — both of those are silently useless for this app's
// single-chain config (chains: [ARC_TESTNET] in lib/wagmi.ts):
//   - useAccount().chain is undefined whenever the wallet's active chain isn't
//     in the configured `chains` list (the pre-existing documented pitfall).
//   - useChainId() looks like the fix, but wagmi's internal syncConnectedChain
//     (createConfig default) only ever copies the connection's chainId up into
//     the top-level store when that chainId is ALSO in `chains` — so with only
//     Arc Testnet configured, useChainId() silently stays pinned to Arc
//     Testnet's id FOREVER, even while the wallet sits on Arbitrum. It never
//     reports the mismatch this hook exists to catch.
//   - useAccount().chainId (the raw number, not the `chain` object) is the one
//     value wagmi updates unconditionally on every connect/chainChanged event,
//     with no configured-chains gate — see @wagmi/core's getAccount()/change()
//     internals. That's what makes it the only reliable source here.
export function useIsWrongNetwork() {
  const { isConnected, chainId } = useAccount()
  return isConnected && chainId !== ARC_TESTNET.id
}

// Owns the actual auto-switch side effect. Call this ONCE at the top of the
// app (app/page.tsx) so only one wallet_switchEthereumChain prompt ever fires
// per mismatch — components that just need to know the wrong-network state to
// disable a button should use useIsWrongNetwork() instead.
//
// Fires on initial connection AND on a manual network change afterwards,
// since useAccount().chainId is reactive to the wallet's 'chainChanged' event.
//
// No manual wallet_addEthereumChain fallback is implemented here — wagmi's
// injected-connector switchChain() already retries with wallet_addEthereumChain
// automatically on a 4902 "unrecognized chain" error, using the rpcUrls /
// blockExplorers / nativeCurrency already present on ARC_TESTNET (lib/contract.ts).
export function useEnsureArcNetwork() {
  const isWrongNetwork = useIsWrongNetwork()
  const { switchChain, status } = useSwitchChain()

  useEffect(() => {
    if (isWrongNetwork) {
      switchChain({ chainId: ARC_TESTNET.id })
    }
  }, [isWrongNetwork, switchChain])

  return {
    isWrongNetwork,
    switchToArc: () => switchChain({ chainId: ARC_TESTNET.id }),
    isSwitching: status === 'pending',
  }
}
