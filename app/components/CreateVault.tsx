'use client'
import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { isAddress, zeroAddress } from 'viem'
import { ARC_TESTNET, CONTRACT_ADDRESS, ABI } from '@/lib/contract'
import { CONTRACT_ERROR_MESSAGES, friendlyContractError } from '@/lib/contractErrors'
import { InfoIcon } from './Tooltip'
import { ARC_GRADIENT, COLOR_ACCENT, COLOR_BG_SUBTLE, COLOR_BORDER, COLOR_DANGER, COLOR_DANGER_BG, COLOR_DANGER_BORDER, COLOR_SUCCESS, COLOR_SUCCESS_BG, COLOR_SUCCESS_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_TERTIARY } from '@/lib/theme'
import { useIsWrongNetwork } from '../hooks/useEnsureArcNetwork'
import { CheckCircleIcon, LockIcon, ShieldIcon } from './icons'
import { actionButton, Card, CardHeader, CardHeaderSkeleton, FieldError, SECTION_GAP, Skeleton, StatusMessage } from './ui'

interface Heir { wallet: string; percentage: number }

const TIMELOCK_PRESETS = [90, 180, 365, 730]
const GRACE_PRESETS = [7, 14, 30, 60]

// Same trick as the action buttons: the unselected outline is an inset shadow, not a border, so the
// gradient never sits under a transparent border (where it would tile and leave a 1px off-color edge).
const chipStyle = (selected: boolean) => ({
  background: selected ? ARC_GRADIENT : COLOR_BG_SUBTLE,
  border: 'none',
  boxShadow: selected ? 'none' : `inset 0 0 0 1px ${COLOR_BORDER}`,
  color: selected ? '#fff' : COLOR_TEXT_SECONDARY,
  padding: '8px 16px',
  fontSize: 13,
  borderRadius: 8,
})

const sectionLabelStyle = { fontSize: 13, color: COLOR_TEXT_SECONDARY, display: 'flex', alignItems: 'center', marginBottom: 8, fontWeight: 500 } as const

// The loading state while we're checking if this address already has a vault — same card, a chip
// row skeleton for each of the two preset groups, an input-row skeleton for the heir, and a button.
function CreateVaultSkeleton() {
  return (
    <Card data-testid="create-vault-skeleton">
      <CardHeaderSkeleton titleWidth={220} />
      {[0, 1].map(i => (
        <div key={i} style={{ marginBottom: SECTION_GAP }}>
          <Skeleton width={i === 0 ? 170 : 200} height={12} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2, 3].map(j => <Skeleton key={j} width={64} height={32} radius={8} />)}
          </div>
        </div>
      ))}
      <div style={{ marginBottom: SECTION_GAP }}>
        <Skeleton width={110} height={12} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={38} radius={8} />
      </div>
      <Skeleton width="100%" height={80} radius={10} style={{ marginBottom: SECTION_GAP }} />
      <Skeleton width="100%" height={48} radius={10} />
    </Card>
  )
}

export function CreateVault({ onCreated }: { onCreated: () => void }) {
  const { address } = useAccount()
  const isWrongNetwork = useIsWrongNetwork()
  const [timelockDays, setTimelockDays] = useState(365)
  const [graceDays, setGraceDays] = useState(30)
  const [heirs, setHeirs] = useState<Heir[]>([{ wallet: '', percentage: 100 }])
  const [error, setError] = useState('')

  const { data: existingVault, isLoading: isLoadingVault } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getVault',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // isSuccess (just created it) takes priority: the loading flag below reflects the read of the vault
  // that may not have refetched yet, and would otherwise briefly cover the success screen with a skeleton.
  if (isSuccess) {
    const continueButton = actionButton(true)
    return (
      <Card style={{ border: `1px solid ${COLOR_SUCCESS_BORDER}`, padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: COLOR_SUCCESS_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircleIcon size={28} color={COLOR_SUCCESS} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLOR_TEXT_PRIMARY, marginBottom: 8 }}>Vault created!</div>
        <div style={{ fontSize: 14, color: COLOR_TEXT_SECONDARY, marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Now deposit tokens to protect your inheritance.
        </div>
        <button
          {...continueButton}
          style={{ ...continueButton.style, width: 'auto', padding: '12px 24px' }}
          onClick={onCreated}
        >
          Continue to deposit →
        </button>
      </Card>
    )
  }
  if (isLoadingVault) return <CreateVaultSkeleton />
  if (existingVault && existingVault[3]) return null

  const totalPct = heirs.reduce((s, h) => s + (h.percentage || 0), 0)

  function addHeir() { setHeirs([...heirs, { wallet: '', percentage: 0 }]) }
  function removeHeir(i: number) { setHeirs(heirs.filter((_, idx) => idx !== i)) }
  function updateHeir(i: number, field: keyof Heir, value: string | number) {
    const updated = [...heirs]
    updated[i] = { ...updated[i], [field]: value }
    setHeirs(updated)
  }

  function handleCreate() {
    setError('')
    if (!address) return setError('Connect your wallet first')
    if (timelockDays < 30) return setError('Minimum check-in period is 30 days')
    if (graceDays < 7) return setError('Minimum safety window is 7 days')
    if (heirs.some(h => !h.wallet || !h.wallet.startsWith('0x'))) return setError('All heir wallet addresses must start with 0x and be valid')
    // v2 reverts with ZeroAddressHeir here; catch it before the user pays gas for a failing tx.
    if (heirs.some(h => isAddress(h.wallet) && h.wallet.toLowerCase() === zeroAddress)) return setError(CONTRACT_ERROR_MESSAGES.ZeroAddressHeir)
    if (heirs.some(h => !isAddress(h.wallet))) return setError('One of the heir wallet addresses is not a valid address. Please check it.')
    if (totalPct !== 100) return setError(`Percentages must add up to 100% (currently ${totalPct}%)`)

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'createVault',
      args: [
        BigInt(timelockDays * 86400),
        BigInt(graceDays * 86400),
        heirs.map(h => ({ wallet: h.wallet as `0x${string}`, percentage: h.percentage }))
      ],
      account: address,
      chain: ARC_TESTNET,
    })
  }

  return (
    <Card>
      <CardHeader
        icon={<ShieldIcon size={18} />}
        title="Set up your inheritance vault"
        description="This is a one-time setup. You can change your heirs, deposit, or withdraw at any time after."
      />

      {/* Timelock */}
      <div style={{ marginBottom: SECTION_GAP }}>
        <label style={sectionLabelStyle}>
          How often will you check in?
          <InfoIcon tooltip="This is the maximum time you can go without logging in. If you miss this deadline, your heirs will eventually be able to claim your funds. We recommend 1 year (365 days)." />
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIMELOCK_PRESETS.map(d => (
            <button
              key={d}
              className="ui-press"
              onClick={() => setTimelockDays(d)}
              style={chipStyle(timelockDays === d)}
            >
              {d === 90 ? '3 months' : d === 180 ? '6 months' : d === 365 ? '1 year ✓' : '2 years'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 12, color: COLOR_TEXT_SECONDARY }}>Custom (days):</span>
          <input
            type="number" min={30} value={timelockDays}
            onChange={e => setTimelockDays(Number(e.target.value))}
            style={{ width: 80 }}
          />
        </div>
      </div>

      {/* Grace period */}
      <div style={{ marginBottom: SECTION_GAP }}>
        <label style={sectionLabelStyle}>
          Safety window after missed check-in
          <InfoIcon tooltip="After you miss a check-in, heirs must wait this extra time before they can claim. This protects you in case you just forgot — you can still check in during this window to cancel the inheritance. Minimum 7 days." />
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {GRACE_PRESETS.map(d => (
            <button
              key={d}
              className="ui-press"
              onClick={() => setGraceDays(d)}
              style={chipStyle(graceDays === d)}
            >
              {d === 7 ? '7 days' : d === 14 ? '2 weeks' : d === 30 ? '1 month ✓' : '2 months'}
            </button>
          ))}
        </div>
      </div>

      {/* Heirs */}
      <div style={{ marginBottom: SECTION_GAP }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...sectionLabelStyle, marginBottom: 0 }}>
            Who are your heirs?
            <InfoIcon tooltip="Add the wallet addresses of the people who should inherit your funds. Each heir gets the percentage you assign. All percentages must add up to 100%." />
          </label>
          <span style={{ fontSize: 12, color: totalPct === 100 ? COLOR_SUCCESS : COLOR_DANGER, fontWeight: 700 }}>
            {totalPct}% / 100%
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {heirs.map((heir, i) => (
            <div key={i}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  placeholder={`Heir ${i + 1} — wallet address (0x...)`}
                  value={heir.wallet}
                  onChange={e => updateHeir(i, 'wallet', e.target.value)}
                  style={{ flex: 1 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number" min={1} max={100}
                    placeholder="%"
                    value={heir.percentage || ''}
                    onChange={e => updateHeir(i, 'percentage', Number(e.target.value))}
                    style={{ width: 64 }}
                  />
                  <span style={{ fontSize: 13, color: COLOR_TEXT_TERTIARY }}>%</span>
                </div>
                {heirs.length > 1 && (
                  <button
                    className="ui-press"
                    onClick={() => removeHeir(i)}
                    style={{ background: COLOR_DANGER_BG, color: COLOR_DANGER, border: `1px solid ${COLOR_DANGER_BORDER}`, padding: '8px 12px', minWidth: 36, borderRadius: 8 }}
                  >×</button>
                )}
              </div>
              {heir.wallet && !heir.wallet.startsWith('0x') && (
                <FieldError>Wallet address must start with 0x</FieldError>
              )}
            </div>
          ))}
        </div>
        <button
          className="ui-press"
          onClick={addHeir}
          style={{ background: 'transparent', border: `1px dashed ${COLOR_BORDER}`, color: COLOR_TEXT_SECONDARY, marginTop: 8, width: '100%', padding: '10px', borderRadius: 8 }}
        >
          + Add another heir
        </button>
      </div>

      {/* Summary */}
      <div style={{ background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 10, padding: '1rem', marginBottom: SECTION_GAP, fontSize: 13, color: COLOR_TEXT_SECONDARY, lineHeight: 1.8 }}>
        <div style={{ fontWeight: 600, color: COLOR_TEXT_PRIMARY, marginBottom: 6 }}>Summary</div>
        <div>• You must check in at least once every <strong style={{ color: COLOR_TEXT_PRIMARY }}>{timelockDays} days</strong></div>
        <div>• After a missed check-in, heirs must wait <strong style={{ color: COLOR_TEXT_PRIMARY }}>{graceDays} more days</strong> before claiming</div>
        <div>• Total inheritance split across <strong style={{ color: COLOR_TEXT_PRIMARY }}>{heirs.length} heir{heirs.length > 1 ? 's' : ''}</strong></div>
      </div>

      {(error || writeError) && (
        <StatusMessage variant="error" style={{ marginBottom: '1rem' }}>{error || friendlyContractError(writeError)}</StatusMessage>
      )}

      <StatusMessage variant="info" icon={<LockIcon size={16} color={COLOR_ACCENT} />} style={{ marginBottom: '1rem', fontSize: 12, fontWeight: 400, lineHeight: 1.6 }}>
        <strong style={{ color: COLOR_TEXT_PRIMARY }}>This is irreversible once created.</strong> The contract rules cannot be changed by anyone — but you can still update heirs, deposit tokens, withdraw, or cancel the vault at any time.
      </StatusMessage>

      <button
        {...actionButton(true)}
        onClick={handleCreate}
        disabled={isPending || isConfirming || !address || isWrongNetwork}
      >
        {isPending ? 'Confirm in your wallet...' : isConfirming ? 'Creating vault...' : 'Create my inheritance vault →'}
      </button>
    </Card>
  )
}
