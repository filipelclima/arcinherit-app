'use client'
import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { ConnectWallet } from './components/ConnectWallet'
import { HowItWorks } from './components/HowItWorks'
import { VaultStatus } from './components/VaultStatus'
import { CreateVault } from './components/CreateVault'
import { CheckIn } from './components/CheckIn'
import { Deposit } from './components/Deposit'
import { ClaimInheritance } from './components/ClaimInheritance'
import { CONTRACT_ADDRESS, ABI } from '@/lib/contract'
import { ARC_GRADIENT, COLOR_BG, COLOR_BG_SUBTLE, COLOR_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_TERTIARY } from '@/lib/theme'

type Tab = 'owner' | 'heir'

export default function Home() {
  const { address, isConnected } = useAccount()
  const [tab, setTab] = useState<Tab>('owner')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  const { data: vault } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getVault',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const hasVault = vault && vault[3]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: COLOR_BG, borderBottom: `1px solid ${COLOR_BORDER}`, padding: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 22, fontWeight: 700, color: COLOR_TEXT_PRIMARY, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- small static header logo, next/image's optimizer isn't needed here */}
            <img src="/heirloom-icon.png" alt="" aria-hidden="true" data-testid="header-logo-icon" width={24} height={24} style={{ display: 'block' }} />
            <span style={{ backgroundImage: ARC_GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Heir</span>loom
          </div>
          <div style={{ fontSize: 11, background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, color: COLOR_TEXT_SECONDARY, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>
            Arc Testnet
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            style={{ background: 'transparent', border: `1px solid ${COLOR_BORDER}`, color: COLOR_TEXT_SECONDARY, padding: '6px 14px', fontSize: 13, whiteSpace: 'nowrap', borderRadius: 8 }}
          >
            {showHowItWorks ? 'Hide guide' : 'How it works'}
          </button>
          <ConnectWallet />
        </div>
      </div>

      {!isConnected && (
        /* Hero */
        <div style={{ background: COLOR_BG, borderBottom: `1px solid ${COLOR_BORDER}` }}>
          <div style={{ maxWidth: 700, margin: '0 auto', padding: '4rem 1rem', textAlign: 'center' }}>
            <div style={{
              display: 'inline-block', background: ARC_GRADIENT, color: '#fff', fontSize: 13, fontWeight: 600,
              borderRadius: 9999, padding: '6px 16px', marginBottom: 20, whiteSpace: 'nowrap',
            }}>
              Built on Arc
            </div>
            <div style={{ fontSize: 46, fontWeight: 800, color: COLOR_TEXT_PRIMARY, marginBottom: 16, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
              Your crypto.<br />
              <span style={{ backgroundImage: ARC_GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Your heirs.</span>
            </div>
            <div style={{ fontSize: 16, color: COLOR_TEXT_SECONDARY, marginBottom: 12, maxWidth: 500, margin: '0 auto 12px', lineHeight: 1.7 }}>
              Set up an onchain inheritance vault in minutes. If you stop checking in, your designated heirs can claim their share automatically — no lawyers, no paperwork, no middlemen.
            </div>
            <div style={{ fontSize: 13, color: COLOR_TEXT_TERTIARY, marginBottom: 32 }}>
              Built on Arc · Non-custodial · Immutable · Less than $0.01 per transaction
            </div>
            <ConnectWallet size="lg" />
          </div>
        </div>
      )}

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>

        {!isConnected ? (
          /* Landing */
          <div>
            {showHowItWorks && <HowItWorks />}

            {/* FAQ */}
            <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: '1.25rem' }}>Common questions</div>
              {[
                {
                  q: 'What happens to my funds if I die without checking in?',
                  a: 'After your check-in period expires, there is a safety window (you set this — minimum 7 days). After both periods pass, your heirs can claim their designated percentage directly from the contract.'
                },
                {
                  q: 'What if I just forget to check in?',
                  a: 'That\'s what the safety window is for. Even after the main period expires, heirs still have to wait the extra time you set. You can check in at any point — even after the deadline — as long as heirs haven\'t claimed yet.'
                },
                {
                  q: 'Can my heirs take the money before I die?',
                  a: 'No. The smart contract enforces the rules. Heirs can only claim after both the check-in period AND the safety window have expired. There are no exceptions.'
                },
                {
                  q: 'What tokens can I put in the vault?',
                  a: 'Any ERC-20 token on the Arc network — including USDC, EURC, and any other token that gets deployed on Arc.'
                },
                {
                  q: 'Do I need to trust Heirloom?',
                  a: 'No. The contract is immutable — not even the developers can access your funds or change the rules. You can read the verified contract code on Blockscout.'
                },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: i < 4 ? '1rem' : 0, paddingBottom: i < 4 ? '1rem' : 0, borderBottom: i < 4 ? '1px solid #1e1e2e' : 'none' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>{item.q}</div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* How it works toggle */}
            {showHowItWorks && (
              <div style={{ marginBottom: '1.5rem' }}>
                <HowItWorks />
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', background: '#13131a', border: '1px solid #1e1e2e', borderRadius: 10, padding: 4 }}>
              {([
                { id: 'owner', label: '🔐 My Vault', desc: 'Manage your inheritance vault' },
                { id: 'heir', label: '🧬 Claim', desc: 'Claim an inheritance' },
              ] as { id: Tab; label: string; desc: string }[]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    flex: 1,
                    background: tab === t.id ? '#1D9E75' : 'transparent',
                    color: tab === t.id ? '#fff' : '#64748b',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px',
                    fontWeight: tab === t.id ? 600 : 400,
                    fontSize: 14,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'owner' && (
              <>
                <VaultStatus key={refreshKey} />
                {!hasVault && <CreateVault onCreated={() => setRefreshKey(k => k + 1)} />}
                {hasVault && (
                  <>
                    <CheckIn />
                    <Deposit />
                  </>
                )}
              </>
            )}

            {tab === 'heir' && <ClaimInheritance />}
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: 12, color: '#334155', lineHeight: 1.8 }}>
          <div>
            Contract:{' '}
            <a
              href={`https://testnet.arcscan.app/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#475569', fontFamily: 'monospace' }}
            >
              {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-6)} ↗
            </a>
          </div>
          <div>Built on Arc · Non-custodial · Immutable · Open source</div>
          <div>
            <a href="https://github.com/filipelclima/ArcInherit" target="_blank" rel="noopener noreferrer" style={{ color: '#475569' }}>
              GitHub ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
