'use client'
import { useCallback, useState } from 'react'
import type { CSSProperties } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { ConnectWallet } from './components/ConnectWallet'
import { RebrandBanner } from './components/RebrandBanner'
import { Hero } from './components/Hero'
import { WrongNetworkBanner } from './components/WrongNetworkBanner'
import { useEnsureArcNetwork } from './hooks/useEnsureArcNetwork'
import { useScrollReveal } from './hooks/useScrollReveal'
import { HowItWorks } from './components/HowItWorks'
import { VaultStatus, VaultStatusSkeleton } from './components/VaultStatus'
import { CreateVault } from './components/CreateVault'
import { CheckIn } from './components/CheckIn'
import { Deposit } from './components/Deposit'
import { ClaimInheritance } from './components/ClaimInheritance'
import { LegacyCancelledMessage, LegacyVault } from './components/LegacyVault'
import { CheckCircleIcon, LockIcon, MoonIcon, SunIcon, UsersIcon } from './components/icons'
import './components/ui.css'
import { useTheme } from './hooks/useTheme'
import { CONTRACT_ADDRESS, ABI, explorerAddressUrl, LEGACY_CONTRACT_ADDRESS } from '@/lib/contract'
import { ARC_GRADIENT, ARC_GRADIENT_TEXT, COLOR_BG, COLOR_BG_SUBTLE, COLOR_BORDER, COLOR_SUCCESS, COLOR_SUCCESS_BG, COLOR_SUCCESS_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_TERTIARY } from '@/lib/theme'

// Sun/moon toggle: shows the icon for what clicking WILL do (sun = "go light" while dark, moon =
// "go dark" while light), not the current state — the common convention for this control.
function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      className="ui-press"
      onClick={toggle}
      data-testid="theme-toggle"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: `1px solid ${COLOR_BORDER}`, color: COLOR_TEXT_SECONDARY,
        padding: 8, borderRadius: 8, flexShrink: 0,
      }}
    >
      {theme === 'dark' ? <SunIcon size={16} color={COLOR_TEXT_SECONDARY} /> : <MoonIcon size={16} color={COLOR_TEXT_SECONDARY} />}
    </button>
  )
}

// Always the current (v2) contract — the one new vaults are created on.
const CONTRACT_EXPLORER_URL = explorerAddressUrl(CONTRACT_ADDRESS)
// The "Code" tab of the address page, where the Arc Testnet explorer (Blockscout) shows the verified
// source — Blockscout uses a ?tab=contract query param, not a #code hash fragment.
const CONTRACT_CODE_URL = `${CONTRACT_EXPLORER_URL}?tab=contract`

// Small trust signal: a link to the contract's verified source on the explorer. Neutral/green like
// the "Protected" badge in VaultStatus, deliberately not the Arc gradient — that's reserved for CTAs
// and primary emphasis, not a reassurance badge.
function VerifiedContractBadge({ style }: { style?: CSSProperties }) {
  return (
    <a
      href={CONTRACT_CODE_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="verified-contract-badge"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
        background: COLOR_SUCCESS_BG, border: `1px solid ${COLOR_SUCCESS_BORDER}`,
        borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: COLOR_SUCCESS,
        textDecoration: 'none', ...style,
      }}
    >
      <CheckCircleIcon size={14} color={COLOR_SUCCESS} />
      Verified on Arc Explorer
    </a>
  )
}

type Tab = 'owner' | 'heir'

export default function Home() {
  const { address, isConnected } = useAccount()
  const [tab, setTab] = useState<Tab>('owner')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  // Called once here (not inside individual components) so a chain mismatch
  // only ever triggers a single wallet_switchEthereumChain prompt — see
  // app/hooks/useEnsureArcNetwork.ts.
  const { isWrongNetwork, switchToArc, isSwitching } = useEnsureArcNetwork()
  // Only rendered below the fold on the disconnected landing page — the hook itself is safe to call
  // unconditionally regardless of which branch actually mounts the FAQ card.
  const faqReveal = useScrollReveal<HTMLDivElement>()

  const { data: vault, isLoading: isLoadingVault } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getVault',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // v1 is legacy but still holds real vaults (see lib/contract.ts). An owner with an active v1 vault
  // sees it with a "Legacy vault" notice and a guided move to v2, instead of an empty create form.
  const { data: legacyVault, isLoading: isLoadingLegacyVault } = useReadContract({
    address: LEGACY_CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getVault',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // Set once the owner finishes step 1 of the move (cancelled on v1), so step 2's create form shows
  // with a "step 1 done" message instead of reading like a brand-new user's screen.
  const [cancelledLegacy, setCancelledLegacy] = useState(false)
  const handleLegacyCancelled = useCallback(() => setCancelledLegacy(true), [])

  const hasVault = vault && vault[3]
  const hasLegacyVault = !!(legacyVault && legacyVault[3])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <RebrandBanner />
      <WrongNetworkBanner isWrongNetwork={isWrongNetwork} isSwitching={isSwitching} onSwitch={switchToArc} />

      {/* Header */}
      <div style={{ background: COLOR_BG, borderBottom: `1px solid ${COLOR_BORDER}`, padding: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 22, fontWeight: 700, color: COLOR_TEXT_PRIMARY, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- small static header logo, next/image's optimizer isn't needed here */}
            <img src="/heirloom-icon.png" alt="" aria-hidden="true" data-testid="header-logo-icon" width={24} height={24} style={{ display: 'block' }} />
            <span><span style={{ backgroundImage: ARC_GRADIENT_TEXT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Heir</span>loom</span>
          </div>
          <div style={{ fontSize: 11, background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, color: COLOR_TEXT_SECONDARY, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>
            Arc Testnet
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle />
          <button
            className="ui-press"
            onClick={() => {
              const opening = !showHowItWorks
              setShowHowItWorks(opening)
              // Only scroll on open — closing the guide shouldn't also yank the viewport around.
              // The target only exists on the disconnected landing page (Hero's "How it works"
              // section); while connected there's nothing to scroll to, so this is a harmless no-op.
              if (opening) {
                const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
              }
            }}
            style={{ background: 'transparent', border: `1px solid ${COLOR_BORDER}`, color: COLOR_TEXT_SECONDARY, padding: '6px 14px', fontSize: 13, whiteSpace: 'nowrap', borderRadius: 8 }}
          >
            {showHowItWorks ? 'Hide guide' : 'How it works'}
          </button>
          <ConnectWallet />
        </div>
      </div>

      {!isConnected && <Hero />}

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>

        {!isConnected ? (
          /* Landing */
          <div>
            {showHowItWorks && <HowItWorks />}

            {/* FAQ */}
            <div
              ref={faqReveal.ref}
              className={`scroll-reveal${faqReveal.revealed ? ' is-revealed' : ''}`}
              style={{ background: COLOR_BG, border: `1px solid ${COLOR_BORDER}`, borderRadius: 12, padding: '1.5rem', marginBottom: '2rem' }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: COLOR_TEXT_PRIMARY, marginBottom: '1.25rem' }}>Common questions</div>
              {[
                {
                  q: 'What happens to my funds if I die without checking in?',
                  a: 'After your check-in period expires, there is a safety window (you set this — minimum 7 days). After both periods pass, your heirs can claim their designated percentage directly from the contract.'
                },
                {
                  q: 'What if I just forget to check in?',
                  a: 'That\'s what the safety window is for. Even after the main period expires, heirs still have to wait the extra time you set. You can check in at any point, even after the deadline. If an heir has already claimed by then, they keep what they claimed: your check-in closes claims again and starts a new claim round for whatever is left in your vault.'
                },
                {
                  q: 'Can my heirs take the money before I die?',
                  a: 'No. The smart contract enforces the rules. Heirs can only claim after both the check-in period AND the safety window have expired. There are no exceptions.'
                },
                {
                  q: 'If I have several heirs, does it matter who claims first?',
                  a: 'Not for vaults on the current contract. There, the first claim of each token records how much of it the vault holds at that moment, and every heir gets their percentage of that same amount, whatever order they claim in. Vaults created on the original contract don\'t have this fix: each heir gets their percentage of whatever is left when they claim, so heirs who claim later receive less.'
                },
                {
                  q: 'What tokens can I put in the vault?',
                  a: 'Any ERC-20 token on the Arc network — including USDC, EURC, and any other token that gets deployed on Arc.'
                },
                {
                  q: 'I created my vault on the original contract. What should I do?',
                  a: 'It keeps working: you can still check in, and your heirs can still claim from the Claim tab. We recommend moving to the current contract, which fixes a bug where heirs who claim later got less than their share. Connect your wallet and follow the two steps under My Vault: cancel the old vault (all tokens come back to your wallet), then create a new one.'
                },
                {
                  q: 'Do I need to trust Heirloom?',
                  a: 'No. The contract is immutable — not even the developers can access your funds or change the rules. You can read the verified contract code on the Arc Testnet explorer.',
                  verified: true,
                },
              ].map((item, i, all) => (
                <div key={i} style={{ marginBottom: i < all.length - 1 ? '1rem' : 0, paddingBottom: i < all.length - 1 ? '1rem' : 0, borderBottom: i < all.length - 1 ? `1px solid ${COLOR_BORDER}` : 'none' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLOR_TEXT_PRIMARY, marginBottom: 6 }}>{item.q}</div>
                  <div style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, lineHeight: 1.7 }}>{item.a}</div>
                  {item.verified && <VerifiedContractBadge style={{ marginTop: 10 }} />}
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
            <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 10, padding: 4 }}>
              {([
                { id: 'owner', label: 'My Vault', Icon: LockIcon },
                { id: 'heir', label: 'Claim', Icon: UsersIcon },
              ] as { id: Tab; label: string; Icon: typeof LockIcon }[]).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className="ui-press"
                  onClick={() => setTab(id)}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: tab === id ? ARC_GRADIENT : 'transparent',
                    color: tab === id ? '#fff' : COLOR_TEXT_SECONDARY,
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px',
                    fontWeight: tab === id ? 600 : 400,
                    fontSize: 14,
                  }}
                >
                  <Icon size={16} color={tab === id ? '#fff' : COLOR_TEXT_SECONDARY} />
                  {label}
                </button>
              ))}
            </div>

            {tab === 'owner' && (
              // Don't decide between "you have a vault" (VaultStatus) and "you don't" (CreateVault)
              // until we actually know — otherwise CreateVault's form flashes for existing-vault
              // owners for the instant getVault takes to resolve. One neutral skeleton stands in for
              // either outcome until then.
              isLoadingVault || isLoadingLegacyVault ? (
                <VaultStatusSkeleton />
              ) : (
                <>
                  {hasLegacyVault && <LegacyVault hasCurrentVault={!!hasVault} onCancelled={handleLegacyCancelled} />}
                  {hasLegacyVault && !hasVault ? (
                    // Legacy-only owner: their v1 vault keeps working until they move. Check-in stays
                    // (missing it is what lets heirs claim); Deposit is deliberately left out so no new
                    // money goes into the contract with the claim-order bug.
                    <>
                      <VaultStatus contract={LEGACY_CONTRACT_ADDRESS} />
                      <CheckIn contract={LEGACY_CONTRACT_ADDRESS} />
                    </>
                  ) : (
                    <>
                      {cancelledLegacy && !hasVault && <LegacyCancelledMessage />}
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
                </>
              )
            )}

            {tab === 'heir' && <ClaimInheritance />}
          </>
        )}

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${COLOR_BORDER}`, marginTop: '3rem', paddingTop: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- small static footer logo, next/image's optimizer isn't needed here */}
            <img src="/heirloom-icon.png" alt="" width={20} height={20} style={{ display: 'block' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLOR_TEXT_PRIMARY }}>Heirloom</div>
              <div style={{ fontSize: 11, color: COLOR_TEXT_TERTIARY }}>Built on Arc · Non-custodial · No admin keys</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <a href="https://github.com/filipelclima/arcinherit-app" target="_blank" rel="noopener noreferrer" style={{ color: COLOR_TEXT_SECONDARY }}>
                Frontend ↗
              </a>
              <span style={{ color: COLOR_TEXT_TERTIARY }}>·</span>
              <a href="https://github.com/filipelclima/ArcInherit" target="_blank" rel="noopener noreferrer" style={{ color: COLOR_TEXT_SECONDARY }}>
                Contract ↗
              </a>
            </div>
            <a
              href={CONTRACT_EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: COLOR_TEXT_TERTIARY, fontFamily: 'monospace' }}
            >
              {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-6)} ↗
            </a>
            <VerifiedContractBadge />
          </div>
        </div>
      </div>
    </div>
  )
}
