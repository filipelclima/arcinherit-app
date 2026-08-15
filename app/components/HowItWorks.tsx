'use client'
import { COLOR_ACCENT, COLOR_ACCENT_TINT, COLOR_BG, COLOR_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY } from '@/lib/theme'

type IconProps = { size?: number; color?: string }

function iconProps(size: number, color: string) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
}

function ShieldIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}

function CoinsIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 0 3h-1a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 0 1.5-1.5" />
    </svg>
  )
}

function CheckCircleIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  )
}

function UsersIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function ShieldCheckIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

const steps = [
  {
    number: '01',
    Icon: ShieldIcon,
    title: 'Create your vault',
    description: 'Set up your inheritance vault by choosing how long you want to go between check-ins (we recommend 1 year). Add your heirs and decide what percentage each one receives.',
  },
  {
    number: '02',
    Icon: CoinsIcon,
    title: 'Deposit your tokens',
    description: 'Transfer USDC, EURC, or any other token from your wallet into your vault. Your funds stay locked — only you can withdraw them while you are alive and active.',
  },
  {
    number: '03',
    Icon: CheckCircleIcon,
    title: 'Check in regularly',
    description: 'Once every year (or however long you set), simply click "Check In" to confirm you are alive. This resets the countdown. It takes 5 seconds and costs less than $0.01.',
  },
  {
    number: '04',
    Icon: UsersIcon,
    title: 'Heirs claim automatically',
    description: 'If you stop checking in, your heirs can claim their share after the countdown expires. They just need their wallet — no lawyers, no paperwork, no waiting.',
  },
]

export function HowItWorks() {
  return (
    <div style={{ marginBottom: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: COLOR_TEXT_PRIMARY, marginBottom: 8 }}>How it works</div>
        <div style={{ fontSize: 14, color: COLOR_TEXT_SECONDARY, maxWidth: 480, margin: '0 auto' }}>
          Heirloom is a smart contract on the Arc blockchain. No company controls it — the code runs itself, forever.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {steps.map(step => (
          <div key={step.number} style={{
            background: COLOR_BG,
            border: `1px solid ${COLOR_BORDER}`,
            borderRadius: 12,
            padding: '1.25rem',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: COLOR_ACCENT_TINT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <step.Icon size={20} />
              </div>
              <div style={{ fontSize: 11, color: COLOR_ACCENT, fontWeight: 700, letterSpacing: '0.1em' }}>STEP {step.number}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLOR_TEXT_PRIMARY, marginBottom: 8 }}>{step.title}</div>
            <div style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, lineHeight: 1.7 }}>{step.description}</div>
          </div>
        ))}
      </div>

      {/* Key guarantee */}
      <div style={{
        background: COLOR_ACCENT_TINT,
        border: '1px solid rgba(0, 23, 103, 0.15)',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
        marginTop: 16,
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start'
      }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          <ShieldCheckIcon size={24} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLOR_TEXT_PRIMARY, marginBottom: 4 }}>
            Nobody has a master key — not even us
          </div>
          <div style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, lineHeight: 1.6 }}>
            Heirloom is an immutable smart contract. Once deployed, no one — not the developers, not Arc, not Circle — can access, freeze, or change the rules of your vault. Your funds follow the rules you set, enforced by code alone.
          </div>
        </div>
      </div>
    </div>
  )
}
