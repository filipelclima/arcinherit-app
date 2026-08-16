'use client'
import { COLOR_WARNING, COLOR_WARNING_BG, COLOR_WARNING_BORDER } from '@/lib/theme'

export function WrongNetworkBanner({ isWrongNetwork, isSwitching, onSwitch }: {
  isWrongNetwork: boolean
  isSwitching: boolean
  onSwitch: () => void
}) {
  if (!isWrongNetwork) return null

  return (
    <button
      data-testid="wrong-network-banner"
      onClick={onSwitch}
      disabled={isSwitching}
      style={{
        display: 'block',
        width: '100%',
        background: COLOR_WARNING_BG,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: `1px solid ${COLOR_WARNING_BORDER}`,
        borderRadius: 0,
        padding: '10px 1rem',
        fontSize: 13,
        fontWeight: 600,
        color: COLOR_WARNING,
        textAlign: 'center',
        cursor: isSwitching ? 'default' : 'pointer',
      }}
    >
      {isSwitching ? 'Switching to Arc Testnet…' : '⚠️ Wrong network — click to switch to Arc Testnet'}
    </button>
  )
}
