'use client'
import { useState } from 'react'

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: 'help' }}
      >
        {children}
      </span>
      {show && (
        <span style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 6,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          color: '#cbd5e1',
          whiteSpace: 'normal',
          width: 220,
          zIndex: 50,
          lineHeight: 1.5,
          textAlign: 'left',
          pointerEvents: 'none',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}

export function InfoIcon({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip text={tooltip}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#1e293b',
        color: '#64748b',
        fontSize: 10,
        fontWeight: 700,
        marginLeft: 6,
        cursor: 'help',
        flexShrink: 0,
      }}>i</span>
    </Tooltip>
  )
}
