'use client'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <div style={{
          background: '#1D9E7522',
          border: '1px solid #1D9E75',
          borderRadius: 8,
          padding: '6px 14px',
          fontSize: 13,
          color: '#1D9E75',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <button
          onClick={() => disconnect()}
          style={{ background: 'transparent', border: '1px solid #1e1e2e', color: '#64748b', padding: '6px 14px', fontSize: 13, whiteSpace: 'nowrap' }}
        >
          Disconnect
        </button>
      </div>
    )
  }

  // Use the injected connector — works with Rabby, MetaMask, or any browser wallet
  const connector = connectors[0]

  return (
    <button
      onClick={() => connector && connect({ connector })}
      style={{ background: '#1D9E75', color: '#fff', padding: '8px 20px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}
    >
      Connect Wallet
    </button>
  )
}
