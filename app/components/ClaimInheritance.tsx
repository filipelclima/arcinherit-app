'use client'
import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { ARC_TESTNET, CONTRACT_ADDRESS, ABI } from '@/lib/contract'
import { isAddress } from 'viem'
import { ARC_GRADIENT, COLOR_BG, COLOR_BG_SUBTLE, COLOR_BORDER, COLOR_DANGER, COLOR_DANGER_BG, COLOR_DANGER_BORDER, COLOR_SUCCESS, COLOR_SUCCESS_BG, COLOR_SUCCESS_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_TERTIARY, COLOR_WARNING } from '@/lib/theme'

export function ClaimInheritance() {
  const { address } = useAccount()
  const [ownerAddress, setOwnerAddress] = useState('')
  const [tokenAddress, setTokenAddress] = useState('')
  const [error, setError] = useState('')

  const { data: canClaim } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'canClaim',
    args: ownerAddress && isAddress(ownerAddress) ? [ownerAddress as `0x${string}`] : undefined,
    query: { enabled: isAddress(ownerAddress) },
  })

  const { data: timeLeft } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'timeUntilClaim',
    args: ownerAddress && isAddress(ownerAddress) ? [ownerAddress as `0x${string}`] : undefined,
    query: { enabled: isAddress(ownerAddress) },
  })

  const { data: vault } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getVault',
    args: ownerAddress && isAddress(ownerAddress) ? [ownerAddress as `0x${string}`] : undefined,
    query: { enabled: isAddress(ownerAddress) },
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  function handleClaim() {
    setError('')
    if (!address) return setError('Connect your wallet first')
    if (!isAddress(ownerAddress)) return setError('Please enter a valid wallet address for the vault owner')
    if (!isAddress(tokenAddress)) return setError('Please enter a valid token contract address')
    if (!canClaim) return setError('This vault is not yet available for claiming')
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'claimInheritance',
      args: [ownerAddress as `0x${string}`, tokenAddress as `0x${string}`],
      account: address,
      chain: ARC_TESTNET,
    })
  }

  function formatTimeLeft(seconds: bigint): string {
    const s = Number(seconds)
    const days = Math.floor(s / 86400)
    const hours = Math.floor((s % 86400) / 3600)
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }

  const heirs = vault ? vault[4] : []
  const myHeirEntry = address ? heirs.find(h => h.wallet.toLowerCase() === address.toLowerCase()) : null
  const isHeir = !!myHeirEntry

  return (
    <div>
      <div style={{ background: COLOR_BG, border: `1px solid ${COLOR_BORDER}`, borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: COLOR_TEXT_PRIMARY, marginBottom: 8 }}>For heirs</div>
        <div style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, lineHeight: 1.7, marginBottom: '1.25rem' }}>
          If someone has added you as an heir to their vault, you can check the status and claim your inheritance here.
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: COLOR_TEXT_SECONDARY, display: 'block', marginBottom: 6 }}>
            Vault owner wallet address
          </label>
          <input
            value={ownerAddress}
            onChange={e => setOwnerAddress(e.target.value)}
            placeholder="0x... the person who created the vault"
          />
        </div>

        {ownerAddress && isAddress(ownerAddress) && vault && (
          <div style={{ background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '12px 14px', marginBottom: 12, fontSize: 13 }}>
            {isHeir ? (
              <div style={{ color: COLOR_SUCCESS, fontWeight: 600, marginBottom: 4 }}>
                You are listed as an heir ({myHeirEntry?.percentage}% share)
              </div>
            ) : (
              <div style={{ color: COLOR_DANGER, marginBottom: 4 }}>Your wallet is not listed as an heir of this vault</div>
            )}
            {timeLeft !== undefined && (
              canClaim
                ? <div style={{ color: COLOR_SUCCESS }}>This vault is ready to claim</div>
                : <div style={{ color: COLOR_WARNING }}>{formatTimeLeft(timeLeft)} remaining before this vault can be claimed</div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: 12, color: COLOR_TEXT_SECONDARY, display: 'block', marginBottom: 6 }}>
            Token address to claim
          </label>
          <input
            value={tokenAddress}
            onChange={e => setTokenAddress(e.target.value)}
            placeholder="0x... token contract address"
          />
        </div>

        {error && (
          <div style={{ background: COLOR_DANGER_BG, border: `1px solid ${COLOR_DANGER_BORDER}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: COLOR_DANGER, marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {isSuccess && (
          <div style={{ background: COLOR_SUCCESS_BG, border: `1px solid ${COLOR_SUCCESS_BORDER}`, borderRadius: 8, padding: '12px 14px', fontSize: 14, color: COLOR_SUCCESS, marginBottom: '1rem', fontWeight: 500 }}>
            Inheritance claimed successfully!
          </div>
        )}

        <button
          onClick={handleClaim}
          disabled={isPending || isConfirming || !canClaim || !isHeir}
          style={{
            background: canClaim && isHeir ? ARC_GRADIENT : COLOR_BG_SUBTLE,
            border: canClaim && isHeir ? 'none' : `1px solid ${COLOR_BORDER}`,
            color: canClaim && isHeir ? '#fff' : COLOR_TEXT_TERTIARY,
            width: '100%', padding: '14px', fontWeight: 700, fontSize: 15, borderRadius: 10
          }}
        >
          {isPending ? 'Confirm in your wallet...' : isConfirming ? 'Claiming...' : 'Claim my inheritance'}
        </button>
      </div>
    </div>
  )
}
