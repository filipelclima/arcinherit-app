'use client'
import { useEffect, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { ABI, ARC_TESTNET, explorerAddressUrl, LEGACY_CONTRACT_ADDRESS } from '@/lib/contract'
import { friendlyContractError } from '@/lib/contractErrors'
import { COLOR_BG, COLOR_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_WARNING, COLOR_WARNING_BG, COLOR_WARNING_BORDER } from '@/lib/theme'
import { useIsWrongNetwork } from '../hooks/useEnsureArcNetwork'
import { AlertTriangleIcon } from './icons'
import { actionButton, Card, CardHeader, SECTION_GAP, StatusMessage } from './ui'

export const V2_CHANGELOG_URL = 'https://github.com/filipelclima/ArcInherit#v2-changelog'

const linkStyle = { color: COLOR_TEXT_SECONDARY, fontSize: 12 } as const

const legacyBadge = (
  <div
    data-testid="legacy-vault-badge"
    style={{
      display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      background: COLOR_WARNING_BG, border: `1px solid ${COLOR_WARNING_BORDER}`,
      borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: COLOR_WARNING,
    }}
  >
    Legacy vault
  </div>
)

/**
 * Shown to an owner whose vault lives on the v1 contract. v1 still works (the owner can check in,
 * heirs can claim), so nothing is forced — this explains why v2 is better and walks the owner through
 * moving: (1) cancel on v1, which returns every token in the same tx, (2) create a new vault on v2.
 * `hasCurrentVault`: the owner already has a v2 vault too, so only the "cancel the old one" part applies.
 */
export function LegacyVault({ hasCurrentVault = false, onCancelled }: {
  hasCurrentVault?: boolean
  onCancelled: () => void
}) {
  const { address } = useAccount()
  const isWrongNetwork = useIsWrongNetwork()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (!isSuccess) return
    // Both getVault reads (v1 now inactive) and every balance shown on screen just changed.
    queryClient.invalidateQueries({ predicate: ({ queryKey }) => queryKey[0] === 'readContract' })
    onCancelled()
  }, [isSuccess, queryClient, onCancelled])

  function handleCancel() {
    if (!address) return
    writeContract({
      address: LEGACY_CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'cancelVault',
      account: address,
      chain: ARC_TESTNET,
    })
  }

  const busy = isPending || isConfirming

  return (
    <Card data-testid="legacy-vault-notice" style={{ border: `1px solid ${COLOR_WARNING_BORDER}` }}>
      <CardHeader
        icon={<AlertTriangleIcon size={18} color={COLOR_WARNING} />}
        title={hasCurrentVault ? 'You also have a legacy vault' : 'Your vault is on the old contract'}
        right={legacyBadge}
        description={
          <>
            This vault was created on Heirloom&apos;s first contract (v1). It still works: you can check in, and
            your heirs can still claim. But v1 has a known bug that the current contract (v2) fixes. With two or
            more heirs, whoever claims later gets less than their percentage, because each claim is a share of
            whatever is left rather than of the full amount.
          </>
        }
      />

      {!hasCurrentVault && (
        <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BORDER}`, borderRadius: 10, padding: '1rem', marginBottom: SECTION_GAP, fontSize: 13, color: COLOR_TEXT_SECONDARY, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, color: COLOR_TEXT_PRIMARY, marginBottom: 6 }}>Move to the current contract in two steps</div>
          <div><strong style={{ color: COLOR_TEXT_PRIMARY }}>1. Cancel this vault.</strong> Every token in it goes back to your wallet in the same transaction.</div>
          <div><strong style={{ color: COLOR_TEXT_PRIMARY }}>2. Create a new vault</strong> right here, then deposit your tokens again.</div>
          <div style={{ marginTop: 6 }}>Between the two steps your funds sit in your wallet, not in a vault, so your heirs can&apos;t claim them. Do step 2 soon after step 1.</div>
        </div>
      )}

      {hasCurrentVault && (
        <div style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, lineHeight: 1.7, marginBottom: SECTION_GAP }}>
          Your vault on the current contract is shown below. Cancelling this legacy vault returns all of its tokens to your wallet, so you can deposit them into your current vault.
        </div>
      )}

      {writeError && (
        <StatusMessage variant="error" style={{ marginBottom: '1rem' }}>{friendlyContractError(writeError)}</StatusMessage>
      )}

      {!confirming ? (
        <button
          {...actionButton(true)}
          onClick={() => setConfirming(true)}
          disabled={!address || isWrongNetwork}
        >
          {hasCurrentVault ? 'Cancel legacy vault' : 'Step 1: Cancel legacy vault'}
        </button>
      ) : (
        <div data-testid="legacy-cancel-confirm">
          <StatusMessage variant="warning" style={{ marginBottom: '1rem' }}>
            This closes your legacy vault for good and returns all of its tokens to your wallet. Your heirs will no longer be able to claim from it.
          </StatusMessage>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              className="ui-press"
              onClick={() => setConfirming(false)}
              disabled={busy}
              style={{ background: COLOR_BG, border: `1px solid ${COLOR_BORDER}`, color: COLOR_TEXT_PRIMARY, padding: '12px', fontWeight: 600, fontSize: 14, borderRadius: 8 }}
            >
              Keep it for now
            </button>
            <button
              {...actionButton(true)}
              onClick={handleCancel}
              disabled={busy || !address || isWrongNetwork}
            >
              {isPending ? 'Confirm in your wallet...' : isConfirming ? 'Cancelling...' : 'Yes, cancel and return my tokens'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
        <a href={V2_CHANGELOG_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>What changed in v2 ↗</a>
        <a href={explorerAddressUrl(LEGACY_CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer" style={linkStyle}>Legacy contract on the explorer ↗</a>
      </div>
    </Card>
  )
}

/** Shown between the two migration steps: the legacy vault is cancelled, now create the v2 one. */
export function LegacyCancelledMessage() {
  return (
    <StatusMessage variant="success" prominent style={{ marginBottom: '1rem' }} data-testid="legacy-cancelled-message">
      Step 1 done: your legacy vault is cancelled and all of its tokens are back in your wallet.
      <div style={{ fontWeight: 400, fontSize: 13, marginTop: 4 }}>
        Step 2: create your new vault below, then deposit your tokens again.
      </div>
    </StatusMessage>
  )
}
