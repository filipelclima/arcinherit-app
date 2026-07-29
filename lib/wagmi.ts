import { createConfig, http } from 'wagmi'
import { ARC_TESTNET } from './contract'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [ARC_TESTNET],
  connectors: [
    injected(), // detects any injected wallet — Rabby, MetaMask, etc.
  ],
  transports: {
    [ARC_TESTNET.id]: http(),
  },
  ssr: true, // prevents hydration mismatch in Next.js
})

declare module '@wagmi/core' {
  interface Register {
    config: typeof config
  }
}
