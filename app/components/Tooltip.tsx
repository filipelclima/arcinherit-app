'use client'
import { useId, useState } from 'react'
import { COLOR_BG, COLOR_BG_SUBTLE, COLOR_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY } from '@/lib/theme'
import './ui.css'

// Follows the WAI-ARIA "tooltip" pattern for a non-interactive trigger: tabIndex={0} + aria-describedby
// make it reachable and readable via keyboard/screen reader, without pretending it's a button (it
// doesn't do anything on click, so no role="button" — see
// https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/).
export function Tooltip({ text, children, label }: { text: string; children: React.ReactNode; label?: string }) {
  const [show, setShow] = useState(false)
  const id = useId()

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        tabIndex={0}
        aria-label={label}
        aria-describedby={id}
        className="ui-focus-ring"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onKeyDown={e => { if (e.key === 'Escape') setShow(false) }}
        style={{ cursor: 'help', borderRadius: '50%' }}
      >
        {children}
      </span>
      {show && (
        <span
          id={id}
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            background: COLOR_BG,
            border: `1px solid ${COLOR_BORDER}`,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: COLOR_TEXT_SECONDARY,
            whiteSpace: 'normal',
            width: 220,
            zIndex: 50,
            lineHeight: 1.5,
            textAlign: 'left',
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}

export function InfoIcon({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip text={tooltip} label="More information">
      <span aria-hidden="true" style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: COLOR_BG_SUBTLE,
        border: `1px solid ${COLOR_BORDER}`,
        color: COLOR_TEXT_PRIMARY,
        fontSize: 10,
        fontWeight: 700,
        marginLeft: 6,
        cursor: 'help',
        flexShrink: 0,
      }}>i</span>
    </Tooltip>
  )
}
