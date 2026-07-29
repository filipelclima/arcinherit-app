'use client'
import { useAccount, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESS, ABI } from '@/lib/contract'

function formatDuration(seconds: bigint): string {
  const days = Number(seconds) / 86400
  if (days >= 365) return `${Math.round(days / 365)} year${Math.round(days / 365) > 1 ? 's' : ''}`
  if (days >= 30) return `${Math.round(days / 30)} month${Math.round(days / 30) > 1 ? 's' : ''}`
  return `${Math.round(days)} days`
}

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

export function VaultStatus() {
  const { address } = useAccount()

  const { data: vault, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getVault',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: timeLeft } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'timeUntilClaim',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: canClaim } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'canClaim',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  if (!address || isLoading || !vault || !vault[3]) return null

  const [timelockDuration, gracePeriod, lastCheckIn, , heirs] = vault
  const lastCheckInDate = new Date(Number(lastCheckIn) * 1000)
  const nextDeadline = new Date((Number(lastCheckIn) + Number(timelockDuration)) * 1000)
  const timeInfo = timeLeft !== undefined ? formatTimeLeft(timeLeft) : null

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Urgent warning */}
      {canClaim && (
        <div style={{ background: '#ef444411', border: '1px solid #ef4444', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1rem', fontSize: 14, color: '#ef4444', fontWeight: 600 }}>
          ⚠️ Your heirs can claim your funds right now. Check in immediately to stop this.
        </div>
      )}

      {timeInfo?.urgent && !canClaim && (
        <div style={{ background: '#EF9F2711', border: '1px solid #EF9F27', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1rem', fontSize: 14, color: '#EF9F27', fontWeight: 600 }}>
          ⏰ {timeInfo.text}
        </div>
      )}

      {/* Vault overview */}
      <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Your Vault</div>
          <div style={{
            background: canClaim ? '#ef444422' : '#1D9E7522',
            border: `1px solid ${canClaim ? '#ef4444' : '#1D9E75'}`,
            borderRadius: 8, padding: '4px 12px', fontSize: 12,
            color: canClaim ? '#ef4444' : '#1D9E75', fontWeight: 600
          }}>
            {canClaim ? '⚠️ Claimable' : '✓ Protected'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.25rem' }}>
          <div style={{ background: '#0a0a0f', borderRadius: 8, padding: '12px' }}>
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Check-in every</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#378ADD' }}>{formatDuration(timelockDuration)}</div>
          </div>
          <div style={{ background: '#0a0a0f', borderRadius: 8, padding: '12px' }}>
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Safety window</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#EF9F27' }}>{formatDuration(gracePeriod)}</div>
          </div>
          <div style={{ background: '#0a0a0f', borderRadius: 8, padding: '12px' }}>
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Last check-in</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9' }}>{lastCheckInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
          <div style={{ background: '#0a0a0f', borderRadius: 8, padding: '12px' }}>
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Next check-in deadline</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: timeInfo?.urgent ? '#EF9F27' : '#f1f5f9' }}>
              {nextDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {timeInfo && !timeInfo.urgent && (
          <div style={{ background: '#1D9E7511', border: '1px solid #1D9E7533', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1D9E75' }}>
            ✓ {timeInfo.text}
          </div>
        )}
      </div>

      {/* Heirs */}
      <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.25rem' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>
          Your heirs ({heirs.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {heirs.map((heir, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0f', borderRadius: 8, padding: '10px 14px' }}>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>
                {heir.wallet.slice(0, 12)}...{heir.wallet.slice(-8)}
              </span>
              <span style={{ color: '#A78BFA', fontWeight: 700, fontSize: 14 }}>{heir.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
