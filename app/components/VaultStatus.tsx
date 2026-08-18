'use client'
import { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESS, ABI } from '@/lib/contract'
import { formatDuration } from '@/lib/duration'
import { generateInheritancePdf } from '@/lib/generateInheritancePdf'
import { ARC_GRADIENT, COLOR_ACCENT, COLOR_BG, COLOR_BG_SUBTLE, COLOR_BORDER, COLOR_DANGER, COLOR_DANGER_BG, COLOR_DANGER_BORDER, COLOR_SUCCESS, COLOR_SUCCESS_BG, COLOR_SUCCESS_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_TERTIARY, COLOR_WARNING, COLOR_WARNING_BG, COLOR_WARNING_BORDER } from '@/lib/theme'

function DownloadIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={COLOR_TEXT_PRIMARY} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  )
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')

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
      })
    } catch {
      setPdfError('Could not generate the PDF. Please try again.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Urgent warning */}
      {canClaim && (
        <div style={{ background: COLOR_DANGER_BG, border: `1px solid ${COLOR_DANGER_BORDER}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1rem', fontSize: 14, color: COLOR_DANGER, fontWeight: 600 }}>
          ⚠️ Your heirs can claim your funds right now. Check in immediately to stop this.
        </div>
      )}

      {timeInfo?.urgent && !canClaim && (
        <div style={{ background: COLOR_WARNING_BG, border: `1px solid ${COLOR_WARNING_BORDER}`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1rem', fontSize: 14, color: COLOR_WARNING, fontWeight: 600 }}>
          ⏰ {timeInfo.text}
        </div>
      )}

      {/* Vault overview */}
      <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BORDER}`, borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLOR_TEXT_PRIMARY }}>Your Vault</div>
          <div style={{
            background: canClaim ? COLOR_DANGER_BG : COLOR_SUCCESS_BG,
            border: `1px solid ${canClaim ? COLOR_DANGER_BORDER : COLOR_SUCCESS_BORDER}`,
            borderRadius: 8, padding: '4px 12px', fontSize: 12,
            color: canClaim ? COLOR_DANGER : COLOR_SUCCESS, fontWeight: 600
          }}>
            {canClaim ? '⚠️ Claimable' : '✓ Protected'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.25rem' }}>
          <div style={{ background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '12px' }}>
            <div style={{ fontSize: 11, color: COLOR_TEXT_TERTIARY, marginBottom: 4 }}>Check-in every</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: COLOR_TEXT_PRIMARY }}>{formatDuration(timelockDuration)}</div>
          </div>
          <div style={{ background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '12px' }}>
            <div style={{ fontSize: 11, color: COLOR_TEXT_TERTIARY, marginBottom: 4 }}>Safety window</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: COLOR_TEXT_PRIMARY }}>{formatDuration(gracePeriod)}</div>
          </div>
          <div style={{ background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '12px' }}>
            <div style={{ fontSize: 11, color: COLOR_TEXT_TERTIARY, marginBottom: 4 }}>Last check-in</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: COLOR_TEXT_PRIMARY }}>{lastCheckInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
          <div style={{ background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '12px' }}>
            <div style={{ fontSize: 11, color: COLOR_TEXT_TERTIARY, marginBottom: 4 }}>Next check-in deadline</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: timeInfo?.urgent ? COLOR_WARNING : COLOR_TEXT_PRIMARY }}>
              {nextDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: COLOR_TEXT_TERTIARY }}>Check-in period used</span>
            <span style={{ fontSize: 11, color: COLOR_TEXT_SECONDARY }}>{daysElapsed} / {daysTotal} days</span>
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
          <div style={{ background: COLOR_SUCCESS_BG, border: `1px solid ${COLOR_SUCCESS_BORDER}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: COLOR_SUCCESS }}>
            ✓ {timeInfo.text}
          </div>
        )}
      </div>

      {/* Heirs */}
      <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BORDER}`, borderRadius: 12, padding: '1.25rem' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLOR_TEXT_SECONDARY, marginBottom: 10 }}>
          Your heirs ({heirs.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {heirs.map((heir, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '10px 14px' }}>
              <span style={{ color: COLOR_TEXT_SECONDARY, fontFamily: 'monospace', fontSize: 12 }}>
                {heir.wallet.slice(0, 12)}...{heir.wallet.slice(-8)}
              </span>
              <span style={{ color: COLOR_ACCENT, fontWeight: 700, fontSize: 14 }}>{heir.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inheritance instructions PDF */}
      <button
        data-testid="download-instructions-button"
        onClick={handleDownloadInstructions}
        disabled={isGeneratingPdf}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', marginTop: '1rem',
          background: COLOR_BG, border: `1px solid ${COLOR_BORDER}`,
          color: COLOR_TEXT_PRIMARY, padding: '12px', fontWeight: 600, fontSize: 14, borderRadius: 8,
        }}
      >
        <DownloadIcon />
        {isGeneratingPdf ? 'Generating PDF…' : 'Download instructions for your heirs'}
      </button>
      {pdfError && (
        <div style={{ marginTop: 8, fontSize: 12, color: COLOR_DANGER, textAlign: 'center' }}>{pdfError}</div>
      )}
    </div>
  )
}
