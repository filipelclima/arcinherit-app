'use client'
import { useState } from 'react'
import { COLOR_ACCENT, COLOR_ACCENT_TINT, COLOR_TEXT_PRIMARY } from '@/lib/theme'

export function RebrandBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      data-testid="rebrand-banner"
      style={{
        background: COLOR_ACCENT_TINT,
        borderBottom: `1px solid rgba(0, 23, 103, 0.15)`,
        padding: '8px 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        fontSize: 12,
        color: COLOR_TEXT_PRIMARY,
        textAlign: 'center',
      }}
    >
      <span>
        This project was previously named ArcInherit and is being rebranded to Heirloom to follow Arc&apos;s brand guidelines.
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: COLOR_ACCENT,
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  )
}
