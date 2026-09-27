import { createConfig, fallback, http } from 'wagmi'
import { ARC_TESTNET } from './contract'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [ARC_TESTNET],
  connectors: [
    injected(), // detects any injected wallet — Rabby, MetaMask, etc.
  ],
  transports: {
    // Falls back to thirdweb's public Arc Testnet RPC if Circle's primary endpoint
    // (rate limits, outages) is unavailable. Both are public, no API key needed.
    [ARC_TESTNET.id]: fallback([
      http(ARC_TESTNET.rpcUrls.default.http[0]),
      http('https://5042002.rpc.thirdweb.com'),
    ]),
  },
  ssr: true, // prevents hydration mismatch in Next.js
})

declare module '@wagmi/core' {
  interface Register {
    config: typeof config
  }
}
