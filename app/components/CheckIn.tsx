'use client'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { ARC_TESTNET, CONTRACT_ADDRESS, ABI } from '@/lib/contract'

export function CheckIn() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const { data: vault } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getVault',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  if (!vault || !vault[3]) return null

  return (
    <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>I am alive ✓</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.7 }}>
        Clicking this button resets your countdown. It is an onchain transaction that costs less than $0.01 and takes a few seconds. Do this once a year (or however often you set) to keep your vault protected.
      </div>
      {isSuccess && (
        <div style={{ background: '#1D9E7511', border: '1px solid #1D9E7544', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: '#1D9E75', marginBottom: '1rem', fontWeight: 500 }}>
          Check-in confirmed! Your countdown has been reset.
        </div>
      )}
      <button
        onClick={() => {
          if (!address) return
          writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'checkIn', account: address, chain: ARC_TESTNET })
        }}
        disabled={isPending || isConfirming}
        style={{ background: '#378ADD', color: '#fff', width: '100%', padding: '14px', fontWeight: 700, fontSize: 15, borderRadius: 10 }}
      >
        {isPending ? 'Confirm in your wallet...' : isConfirming ? 'Confirming...' : 'Check in — I am alive'}
      </button>
    </div>
  )
}
