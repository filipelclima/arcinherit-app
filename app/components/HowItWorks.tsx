'use client'

const steps = [
  {
    number: '01',
    icon: '🔐',
    title: 'Create your vault',
    description: 'Set up your inheritance vault by choosing how long you want to go between check-ins (we recommend 1 year). Add your heirs and decide what percentage each one receives.',
    color: '#1D9E75',
  },
  {
    number: '02',
    icon: '🪙',
    title: 'Deposit your tokens',
    description: 'Transfer USDC, EURC, or any other token from your wallet into your vault. Your funds stay locked — only you can withdraw them while you are alive and active.',
    color: '#378ADD',
  },
  {
    number: '03',
    icon: '✅',
    title: 'Check in regularly',
    description: 'Once every year (or however long you set), simply click "Check In" to confirm you are alive. This resets the countdown. It takes 5 seconds and costs less than $0.01.',
    color: '#EF9F27',
  },
  {
    number: '04',
    icon: '🧬',
    title: 'Heirs claim automatically',
    description: 'If you stop checking in, your heirs can claim their share after the countdown expires. They just need their wallet — no lawyers, no paperwork, no waiting.',
    color: '#A78BFA',
  },
]

export function HowItWorks() {
  return (
    <div style={{ marginBottom: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>How it works</div>
        <div style={{ fontSize: 14, color: '#64748b', maxWidth: 480, margin: '0 auto' }}>
          Heirloom is a smart contract on the Arc blockchain. No company controls it — the code runs itself, forever.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {steps.map(step => (
          <div key={step.number} style={{
            background: '#13131a',
            border: '1px solid #1e1e2e',
            borderRadius: 12,
            padding: '1.25rem',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 24 }}>{step.icon}</div>
              <div style={{ fontSize: 11, color: step.color, fontWeight: 700, letterSpacing: '0.1em' }}>STEP {step.number}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 }}>{step.title}</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{step.description}</div>
          </div>
        ))}
      </div>

      {/* Key guarantee */}
      <div style={{
        background: '#0c1a2e',
        border: '1px solid #378ADD33',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
        marginTop: 16,
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start'
      }}>
        <div style={{ fontSize: 24, flexShrink: 0 }}>🛡️</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
            Nobody has a master key — not even us
          </div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
            Heirloom is an immutable smart contract. Once deployed, no one — not the developers, not Arc, not Circle — can access, freeze, or change the rules of your vault. Your funds follow the rules you set, enforced by code alone.
          </div>
        </div>
      </div>
    </div>
  )
}
