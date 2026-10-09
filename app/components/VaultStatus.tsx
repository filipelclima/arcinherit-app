'use client'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESS, ABI, ERC20_ABI, isLegacyContract, type VaultContract } from '@/lib/contract'
import { formatDuration } from '@/lib/duration'
import { formatTokenAmount } from '@/lib/formatTokenAmount'
import { generateInheritancePdf } from '@/lib/generateInheritancePdf'
import { ARC_GRADIENT, COLOR_ACCENT, COLOR_ACCENT_TINT, COLOR_BG, COLOR_BG_SUBTLE, COLOR_BORDER, COLOR_DANGER, COLOR_DANGER_BG, COLOR_DANGER_BORDER, COLOR_SUCCESS, COLOR_SUCCESS_BG, COLOR_SUCCESS_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_WARNING } from '@/lib/theme'
import { AlertTriangleIcon, CalendarIcon, CheckCircleIcon, ClockIcon, CoinsIcon, DownloadIcon, LockIcon, ShieldIcon, UsersIcon } from './icons'
import { Card, CardHeader, CardHeaderSkeleton, SECTION_GAP, Skeleton, SkeletonChip, StatusMessage } from './ui'

function formatTimeLeft(seconds: bigint): { text: string; urgent: boolean } {
  const s = Number(seconds)
  if (s <= 0) return { text: 'Expired — check in now!', urgent: true }
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  if (days > 30) return { text: `${days} days until heirs can claim`, urgent: false }
  if (days > 7) return { text: `${days} days left — check in soon`, urgent: false }
  if (days > 0) return { text: `Only ${days} day${days > 1 ? 's' : ''} left — check in now!`, urgent: true }
  return { text: `Only ${hours} hour${hours > 1 ? 's' : ''} left — check in immediately!`, urgent: true }
}

// One of the four small facts about the vault. Icon + label on one line, value underneath, always
// left-aligned and the same size, so the four boxes read as a set.
function DetailBox({ icon, label, value, valueColor = COLOR_TEXT_PRIMARY }: {
  icon: ReactNode
  label: string
  value: string
  valueColor?: string
}) {
  return (
    // Column layout with the value pinned to the bottom: when a label wraps on a narrow screen
    // ("Next check-in deadline"), the value beside it still lines up with its neighbour's value.
    <div className="ui-card-sm" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: COLOR_TEXT_SECONDARY, marginBottom: 6 }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: valueColor }}>{value}</div>
    </div>
  )
}

const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// The loading state of VaultStatus, in the exact shape of the two real cards below (header, 4 detail
// boxes, progress bar, a couple of heir rows) — used both here (while getVault loads) and in
// page.tsx (while it's still deciding whether to show this component or CreateVault at all).
export function VaultStatusSkeleton() {
  return (
    <div style={{ marginBottom: '1.5rem' }} data-testid="vault-status-skeleton">
      <Card style={{ marginBottom: '1rem' }}>
        <CardHeaderSkeleton titleWidth={90} withRight />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: SECTION_GAP }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: 12 }}>
              <Skeleton width={70} height={10} style={{ marginBottom: 8 }} />
              <Skeleton width={90} height={16} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: SECTION_GAP }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Skeleton width={110} height={10} />
            <Skeleton width={60} height={10} />
          </div>
          <Skeleton width="100%" height={8} radius={999} />
        </div>
        <Skeleton width="65%" height={16} />
        <BalancesSkeleton />
      </Card>
      <Card style={{ marginBottom: 0 }}>
        <CardHeaderSkeleton titleWidth={110} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SkeletonChip size={28} />
                <Skeleton width={140} height={12} />
              </div>
              <Skeleton width={36} height={14} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// "Vault balance" section: one row per token with a non-zero balance held for this owner. The contract
// is one shared vault for everyone with per-owner internal accounting, so the ERC-20 balanceOf(contract)
// would be every user's funds together — the only correct source is getBalances(owner).
function BalancesSkeleton() {
  return (
    <div style={{ marginTop: SECTION_GAP }} data-testid="vault-balances-skeleton">
      <Skeleton width={90} height={10} style={{ marginBottom: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SkeletonChip size={28} />
          <Skeleton width={50} height={12} />
        </div>
        <Skeleton width={80} height={16} />
      </div>
    </div>
  )
}

function BalanceRow({ token, amount }: { token: `0x${string}`; amount: bigint }) {
  // Symbol and decimals come from the token itself (USDC is 6 on its ERC-20 interface) — never assumed.
  const { data: symbol, isLoading: isLoadingSymbol } = useReadContract({ address: token, abi: ERC20_ABI, functionName: 'symbol' })
  const { data: decimals, isLoading: isLoadingDecimals } = useReadContract({ address: token, abi: ERC20_ABI, functionName: 'decimals' })

  const isLoadingInfo = isLoadingSymbol || isLoadingDecimals
  const label = symbol ?? `${token.slice(0, 6)}...${token.slice(-4)}`

  return (
    <div
      className="ui-card-sm"
      data-testid="vault-balance-row"
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '10px 14px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLOR_ACCENT_TINT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CoinsIcon size={14} />
        </div>
        {isLoadingInfo
          ? <Skeleton width={50} height={12} />
          : <span style={{ fontWeight: 600, fontSize: 14, color: COLOR_TEXT_PRIMARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
      </div>
      {isLoadingInfo
        ? <Skeleton width={80} height={16} />
        : <span style={{ fontWeight: 700, fontSize: 15, color: COLOR_TEXT_PRIMARY, flexShrink: 0 }}>
            {decimals !== undefined ? formatTokenAmount(amount, decimals) : '—'}
          </span>}
    </div>
  )
}

function VaultBalances({ owner, contract }: { owner: `0x${string}`; contract: VaultContract }) {
  const { data: balances, isLoading } = useReadContract({
    address: contract,
    abi: ABI,
    functionName: 'getBalances',
    args: [owner],
  })

  if (isLoading) return <BalancesSkeleton />

  // The contract re-pushes a token into its list whenever its balance was 0 at deposit time, so the
  // same token can appear twice (with the same amount, read from one mapping) — show it once.
  const seen = new Set<string>()
  const funded = (balances ?? []).filter(b => {
    const key = b.token.toLowerCase()
    if (b.amount === BigInt(0) || seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <div style={{ marginTop: SECTION_GAP }} data-testid="vault-balances">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: COLOR_TEXT_SECONDARY, marginBottom: 8 }}>
        <CoinsIcon size={14} color={COLOR_TEXT_SECONDARY} />
        <span>Vault balance</span>
      </div>
      {funded.length === 0 ? (
        <div style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY }}>No funds deposited yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {funded.map(b => <BalanceRow key={b.token} token={b.token} amount={b.amount} />)}
        </div>
      )}
    </div>
  )
}

// `contract` is v2 by default; page.tsx passes LEGACY_CONTRACT_ADDRESS to show an owner's v1 vault.
export function VaultStatus({ contract = CONTRACT_ADDRESS }: { contract?: VaultContract }) {
  const { address } = useAccount()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')

  const { data: vault, isLoading } = useReadContract({
    address: contract,
    abi: ABI,
    functionName: 'getVault',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: timeLeft } = useReadContract({
    address: contract,
    abi: ABI,
    functionName: 'timeUntilClaim',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: canClaim } = useReadContract({
    address: contract,
    abi: ABI,
    functionName: 'canClaim',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  if (!address) return null
  if (isLoading) return <VaultStatusSkeleton />
  if (!vault || !vault[3]) return null

  const [timelockDuration, gracePeriod, lastCheckIn, , heirs] = vault
  const lastCheckInDate = new Date(Number(lastCheckIn) * 1000)
  const nextDeadline = new Date((Number(lastCheckIn) + Number(timelockDuration)) * 1000)
  const timeInfo = timeLeft !== undefined ? formatTimeLeft(timeLeft) : null

  const elapsedSeconds = Math.max(0, Date.now() / 1000 - Number(lastCheckIn))
  const totalSeconds = Number(timelockDuration)
  const pctElapsed = totalSeconds > 0 ? Math.min(100, (elapsedSeconds / totalSeconds) * 100) : 100
  const daysElapsed = Math.min(Math.floor(elapsedSeconds / 86400), Math.round(totalSeconds / 86400))
  const daysTotal = Math.round(totalSeconds / 86400)
  const progressColor = pctElapsed >= 100 ? COLOR_DANGER : pctElapsed >= 70 ? COLOR_WARNING : ARC_GRADIENT

  async function handleDownloadInstructions() {
    setPdfError('')
    setIsGeneratingPdf(true)
    try {
      await generateInheritancePdf({
        ownerAddress: address as string,
        heirs: heirs.map(h => ({ wallet: h.wallet, percentage: h.percentage })),
        timelockDuration,
        gracePeriod,
        contractAddress: contract,
      })
    } catch {
      setPdfError('Could not generate the PDF. Please try again.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const statusBadgeColor = canClaim ? COLOR_DANGER : COLOR_SUCCESS
  const statusBadge = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      background: canClaim ? COLOR_DANGER_BG : COLOR_SUCCESS_BG,
      border: `1px solid ${canClaim ? COLOR_DANGER_BORDER : COLOR_SUCCESS_BORDER}`,
      borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: statusBadgeColor,
    }}>
      {canClaim ? <AlertTriangleIcon size={14} color={statusBadgeColor} /> : <CheckCircleIcon size={14} color={statusBadgeColor} />}
      {canClaim ? 'Claimable' : 'Protected'}
    </div>
  )

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Urgent warning */}
      {canClaim && (
        <StatusMessage variant="error" prominent style={{ marginBottom: '1rem' }}>
          Your heirs can claim your funds right now. Check in immediately to stop this.
          {/* Claim rounds only exist on v2 — on v1 a heir who claimed can never claim that token again. */}
          {!isLegacyContract(contract) && (
            <div data-testid="claim-round-note" style={{ fontWeight: 400, fontSize: 13, marginTop: 6 }}>
              If an heir has already claimed, checking in closes claims again and starts a new claim round.
              They keep what they already claimed, and the rest stays in your vault.
            </div>
          )}
        </StatusMessage>
      )}

      {timeInfo?.urgent && !canClaim && (
        <StatusMessage variant="warning" prominent icon={<ClockIcon size={18} color={COLOR_WARNING} />} style={{ marginBottom: '1rem' }}>
          {timeInfo.text}
        </StatusMessage>
      )}

      {/* Vault overview */}
      <Card style={{ marginBottom: '1rem' }}>
        <CardHeader icon={<LockIcon size={18} />} title="Your Vault" right={statusBadge} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: SECTION_GAP }}>
          <DetailBox icon={<ClockIcon size={14} color={COLOR_TEXT_SECONDARY} />} label="Check-in every" value={formatDuration(timelockDuration)} />
          <DetailBox icon={<ShieldIcon size={14} color={COLOR_TEXT_SECONDARY} />} label="Safety window" value={formatDuration(gracePeriod)} />
          <DetailBox icon={<CheckCircleIcon size={14} color={COLOR_TEXT_SECONDARY} />} label="Last check-in" value={shortDate(lastCheckInDate)} />
          <DetailBox
            icon={<CalendarIcon size={14} color={COLOR_TEXT_SECONDARY} />}
            label="Next check-in deadline"
            value={shortDate(nextDeadline)}
            valueColor={timeInfo?.urgent ? COLOR_WARNING : COLOR_TEXT_PRIMARY}
          />
        </div>

        <div style={{ marginBottom: timeInfo && !timeInfo.urgent ? SECTION_GAP : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
            <span style={{ color: COLOR_TEXT_SECONDARY }}>Check-in period used</span>
            <span style={{ color: COLOR_TEXT_PRIMARY, fontWeight: 600 }}>{daysElapsed} / {daysTotal} days</span>
          </div>
          <div style={{ background: COLOR_BORDER, borderRadius: 999, height: 8, overflow: 'hidden' }}>
            <div
              data-testid="checkin-progress-bar"
              style={{
                width: `${pctElapsed}%`,
                height: '100%',
                background: progressColor,
                borderRadius: 999,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {timeInfo && !timeInfo.urgent && (
          <StatusMessage variant="success">{timeInfo.text}</StatusMessage>
        )}

        <VaultBalances owner={address} contract={contract} />
      </Card>

      {/* Heirs */}
      <Card style={{ marginBottom: 0 }}>
        <CardHeader icon={<UsersIcon size={18} />} title={`Your heirs (${heirs.length})`} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {heirs.map((heir, i) => (
            <div
              key={i}
              className="ui-card-sm"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '10px 14px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLOR_ACCENT_TINT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UsersIcon size={14} />
                </div>
                <span style={{ color: COLOR_TEXT_SECONDARY, fontFamily: 'monospace', fontSize: 12 }}>
                  {heir.wallet.slice(0, 12)}...{heir.wallet.slice(-8)}
                </span>
              </div>
              <span style={{ color: COLOR_ACCENT, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{heir.percentage}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Inheritance instructions PDF */}
      <button
        data-testid="download-instructions-button"
        className="ui-press"
        onClick={handleDownloadInstructions}
        disabled={isGeneratingPdf}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', marginTop: '1rem',
          background: COLOR_BG, border: `1px solid ${COLOR_BORDER}`,
          color: COLOR_TEXT_PRIMARY, padding: '12px', fontWeight: 600, fontSize: 14, borderRadius: 8,
        }}
      >
        <DownloadIcon size={16} color={COLOR_TEXT_PRIMARY} />
        {isGeneratingPdf ? 'Generating PDF…' : 'Download instructions for your heirs'}
      </button>
      {pdfError && (
        <StatusMessage variant="error" style={{ marginTop: 10 }}>{pdfError}</StatusMessage>
      )}
    </div>
  )
}
