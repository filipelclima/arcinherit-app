'use client'
import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ARC_GRADIENT, COLOR_BG, COLOR_BG_SUBTLE, COLOR_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY } from '@/lib/theme'

export function ConnectWallet({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [showPicker, setShowPicker] = useState(false)

  const ctaPadding = size === 'lg' ? '14px 32px' : '8px 20px'
  const ctaFontSize = size === 'lg' ? 16 : 14

  if (isConnected && address) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <div style={{
          background: COLOR_BG_SUBTLE,
          border: `1px solid ${COLOR_BORDER}`,
          borderRadius: 8,
          padding: '6px 14px',
          fontSize: 13,
          color: COLOR_TEXT_PRIMARY,
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <button
          onClick={() => disconnect()}
          style={{ background: 'transparent', border: `1px solid ${COLOR_BORDER}`, color: COLOR_TEXT_SECONDARY, padding: '6px 14px', fontSize: 13, whiteSpace: 'nowrap', borderRadius: 8 }}
        >
          Disconnect
        </button>
      </div>
    )
  }

  // wagmi auto-discovers every EIP-6963-announced wallet (MetaMask, Rabby, Coinbase, etc.)
  // in addition to the generic "injected" (window.ethereum) connector. Prefer the named,
  // wallet-specific ones when present so the user picks the exact wallet they want instead
  // of silently connecting through whichever extension happens to own window.ethereum.
  const namedConnectors = connectors.filter(c => c.id !== 'injected')
  const availableConnectors = namedConnectors.length > 0 ? namedConnectors : connectors

  if (availableConnectors.length <= 1) {
    const connector = availableConnectors[0]
    return (
      <button
        onClick={() => connector && connect({ connector })}
        style={{ background: ARC_GRADIENT, border: 'none', color: '#fff', padding: ctaPadding, fontSize: ctaFontSize, fontWeight: 600, whiteSpace: 'nowrap', borderRadius: 8 }}
      >
        Connect Wallet
      </button>
    )
  }

  // Multiple wallets detected — let the user pick which one to connect with.
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowPicker(v => !v)}
        style={{ background: ARC_GRADIENT, border: 'none', color: '#fff', padding: ctaPadding, fontSize: ctaFontSize, fontWeight: 600, whiteSpace: 'nowrap', borderRadius: 8 }}
      >
        Connect Wallet
      </button>
      {showPicker && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 100, minWidth: 200,
          background: COLOR_BG, border: `1px solid ${COLOR_BORDER}`, borderRadius: 10, padding: 6,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        }}>
          {availableConnectors.map(connector => (
            <button
              key={connector.uid}
              onClick={() => {
                connect({ connector })
                setShowPicker(false)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                background: 'transparent', border: 'none', color: COLOR_TEXT_PRIMARY,
                padding: '8px 10px', fontSize: 13, textAlign: 'left', whiteSpace: 'nowrap', borderRadius: 6,
              }}
            >
              {connector.icon && (
                // eslint-disable-next-line @next/next/no-img-element -- wallet-provided data: URI icon, next/image's optimizer doesn't apply here
                <img src={connector.icon} alt="" width={16} height={16} style={{ borderRadius: 4 }} />
              )}
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
