'use client'
import { COLOR_ACCENT, COLOR_ACCENT_TINT, COLOR_BG, COLOR_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY } from '@/lib/theme'
import { CheckCircleIcon, CoinsIcon, ShieldCheckIcon, ShieldIcon, UsersIcon } from './icons'

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
    description: 'Once every year (or however long you set), simply click "Check In" to confirm you are alive. This resets the countdown. It takes 5 seconds and only costs a small amount of gas.',
  },
  {
    number: '04',
    Icon: UsersIcon,
    title: 'Heirs can claim',
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
