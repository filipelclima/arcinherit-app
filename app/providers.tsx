'use client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/wagmi'
import { useState, useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  }))

  // Suppress wagmi MetaMask connection errors in console — cosmetic only,
  // wallet connection works correctly via Rabby or any injected wallet.
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      if (event.message?.includes('MetaMask') || event.message?.includes('Failed to connect')) {
        event.preventDefault()
      }
    }
    const unhandledHandler = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('MetaMask') || event.reason?.message?.includes('Failed to connect')) {
        event.preventDefault()
      }
    }
    window.addEventListener('error', handler)
    window.addEventListener('unhandledrejection', unhandledHandler)
    return () => {
      window.removeEventListener('error', handler)
      window.removeEventListener('unhandledrejection', unhandledHandler)
    }
  }, [])

  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
