'use client'
import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { ARC_TESTNET, CONTRACT_ADDRESS, ABI } from '@/lib/contract'
import { InfoIcon } from './Tooltip'
import { ARC_GRADIENT, COLOR_ACCENT_TINT, COLOR_BG, COLOR_BG_SUBTLE, COLOR_BORDER, COLOR_DANGER, COLOR_DANGER_BG, COLOR_DANGER_BORDER, COLOR_SUCCESS, COLOR_SUCCESS_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_TERTIARY } from '@/lib/theme'

interface Heir { wallet: string; percentage: number }

export function CreateVault({ onCreated }: { onCreated: () => void }) {
  const { address } = useAccount()
  const [timelockDays, setTimelockDays] = useState(365)
  const [graceDays, setGraceDays] = useState(30)
  const [heirs, setHeirs] = useState<Heir[]>([{ wallet: '', percentage: 100 }])
  const [error, setError] = useState('')

  const { data: existingVault } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getVault',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  if (isSuccess) {
    return (
      <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_SUCCESS_BORDER}`, borderRadius: 12, padding: '2rem 1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLOR_TEXT_PRIMARY, marginBottom: 8 }}>Vault created!</div>
        <div style={{ fontSize: 14, color: COLOR_TEXT_SECONDARY, marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Now deposit tokens to protect your inheritance.
        </div>
        <button
          onClick={onCreated}
          style={{ background: ARC_GRADIENT, border: 'none', color: '#fff', padding: '12px 24px', fontWeight: 700, fontSize: 15, borderRadius: 10 }}
        >
          Continue to deposit →
        </button>
      </div>
    )
  }
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
    <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BORDER}`, borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: COLOR_TEXT_PRIMARY, marginBottom: 4 }}>Set up your inheritance vault</div>
      <div style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, marginBottom: '1.5rem', lineHeight: 1.6 }}>
        This is a one-time setup. You can change your heirs, deposit, or withdraw at any time after.
      </div>

      {/* Timelock */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, display: 'flex', alignItems: 'center', marginBottom: 8, fontWeight: 500 }}>
          How often will you check in?
          <InfoIcon tooltip="This is the maximum time you can go without logging in. If you miss this deadline, your heirs will eventually be able to claim your funds. We recommend 1 year (365 days)." />
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[90, 180, 365, 730].map(d => (
            <button
              key={d}
              onClick={() => setTimelockDays(d)}
              style={{
                background: timelockDays === d ? ARC_GRADIENT : COLOR_BG_SUBTLE,
                border: `1px solid ${timelockDays === d ? 'transparent' : COLOR_BORDER}`,
                color: timelockDays === d ? '#fff' : COLOR_TEXT_SECONDARY,
                padding: '8px 16px',
                fontSize: 13,
                borderRadius: 8,
              }}
            >
              {d === 90 ? '3 months' : d === 180 ? '6 months' : d === 365 ? '1 year ✓' : '2 years'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 12, color: COLOR_TEXT_TERTIARY }}>Custom (days):</span>
          <input
            type="number" min={30} value={timelockDays}
            onChange={e => setTimelockDays(Number(e.target.value))}
            style={{ width: 80 }}
          />
        </div>
      </div>

      {/* Grace period */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, display: 'flex', alignItems: 'center', marginBottom: 8, fontWeight: 500 }}>
          Safety window after missed check-in
          <InfoIcon tooltip="After you miss a check-in, heirs must wait this extra time before they can claim. This protects you in case you just forgot — you can still check in during this window to cancel the inheritance. Minimum 7 days." />
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[7, 14, 30, 60].map(d => (
            <button
              key={d}
              onClick={() => setGraceDays(d)}
              style={{
                background: graceDays === d ? ARC_GRADIENT : COLOR_BG_SUBTLE,
                border: `1px solid ${graceDays === d ? 'transparent' : COLOR_BORDER}`,
                color: graceDays === d ? '#fff' : COLOR_TEXT_SECONDARY,
                padding: '8px 16px',
                fontSize: 13,
                borderRadius: 8,
              }}
            >
              {d === 7 ? '7 days' : d === 14 ? '2 weeks' : d === 30 ? '1 month ✓' : '2 months'}
            </button>
          ))}
        </div>
      </div>

      {/* Heirs */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, fontWeight: 500, display: 'flex', alignItems: 'center' }}>
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
                    onClick={() => removeHeir(i)}
                    style={{ background: COLOR_DANGER_BG, color: COLOR_DANGER, border: `1px solid ${COLOR_DANGER_BORDER}`, padding: '8px 12px', minWidth: 36, borderRadius: 8 }}
                  >×</button>
                )}
              </div>
              {heir.wallet && !heir.wallet.startsWith('0x') && (
                <div style={{ fontSize: 11, color: COLOR_DANGER, marginTop: 4 }}>⚠️ Wallet address must start with 0x</div>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addHeir}
          style={{ background: 'transparent', border: `1px dashed ${COLOR_BORDER}`, color: COLOR_TEXT_TERTIARY, marginTop: 8, width: '100%', padding: '10px', borderRadius: 8 }}
        >
          + Add another heir
        </button>
      </div>

      {/* Summary */}
      <div style={{ background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 10, padding: '1rem', marginBottom: '1.25rem', fontSize: 13, color: COLOR_TEXT_SECONDARY, lineHeight: 1.8 }}>
        <div style={{ fontWeight: 600, color: COLOR_TEXT_PRIMARY, marginBottom: 6 }}>Summary</div>
        <div>• You must check in at least once every <strong style={{ color: COLOR_TEXT_PRIMARY }}>{timelockDays} days</strong></div>
        <div>• After a missed check-in, heirs must wait <strong style={{ color: COLOR_TEXT_PRIMARY }}>{graceDays} more days</strong> before claiming</div>
        <div>• Total inheritance split across <strong style={{ color: COLOR_TEXT_PRIMARY }}>{heirs.length} heir{heirs.length > 1 ? 's' : ''}</strong></div>
      </div>

      {error && (
        <div style={{ background: COLOR_DANGER_BG, border: `1px solid ${COLOR_DANGER_BORDER}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: COLOR_DANGER, marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ background: COLOR_ACCENT_TINT, border: '1px solid rgba(0, 23, 103, 0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: COLOR_TEXT_SECONDARY, marginBottom: '1rem', lineHeight: 1.6 }}>
        🔒 <strong style={{ color: COLOR_TEXT_PRIMARY }}>This is irreversible once created.</strong> The contract rules cannot be changed by anyone — but you can still update heirs, deposit tokens, withdraw, or cancel the vault at any time.
      </div>

      <button
        onClick={handleCreate}
        disabled={isPending || isConfirming || !address}
        style={{ background: ARC_GRADIENT, border: 'none', color: '#fff', width: '100%', padding: '14px', fontWeight: 700, fontSize: 15, borderRadius: 10 }}
      >
        {isPending ? 'Confirm in your wallet...' : isConfirming ? 'Creating vault...' : 'Create my inheritance vault →'}
      </button>
    </div>
  )
}
