'use client'
import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { ARC_TESTNET, CONTRACT_ADDRESS, ABI } from '@/lib/contract'
import { isAddress } from 'viem'
import { COLOR_WARNING } from '@/lib/theme'
import { ClockIcon, UsersIcon } from './icons'
import { actionButton, Card, CardHeader, FIELD_GAP, fieldLabelStyle, SECTION_GAP, Skeleton, StatusMessage } from './ui'
import { useIsWrongNetwork } from '../hooks/useEnsureArcNetwork'

// Stands in for the status box (heir/claimable messages) between typing a valid owner address and
// the three reads that describe it coming back.
function ClaimStatusSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: FIELD_GAP }} data-testid="claim-status-skeleton">
      <Skeleton width="80%" height={38} radius={8} />
      <Skeleton width="60%" height={38} radius={8} />
    </div>
  )
}

export function ClaimInheritance() {
  const { address } = useAccount()
  const isWrongNetwork = useIsWrongNetwork()
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

  const { data: vault, isLoading: isLoadingVault } = useReadContract({
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

  const canSubmit = canClaim && isHeir

  return (
    <div>
      <Card>
        <CardHeader
          icon={<UsersIcon size={18} />}
          title="For heirs"
          description="If someone has added you as an heir to their vault, you can check the status and claim your inheritance here."
        />

        <div style={{ marginBottom: FIELD_GAP }}>
          <label style={fieldLabelStyle}>Vault owner wallet address</label>
          <input
            value={ownerAddress}
            onChange={e => setOwnerAddress(e.target.value)}
            placeholder="0x... the person who created the vault"
          />
        </div>

        {ownerAddress && isAddress(ownerAddress) && isLoadingVault && <ClaimStatusSkeleton />}

        {ownerAddress && isAddress(ownerAddress) && vault && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: FIELD_GAP }}>
            {isHeir ? (
              <StatusMessage variant="success">
                You are listed as an heir ({myHeirEntry?.percentage}% share)
              </StatusMessage>
            ) : (
              <StatusMessage variant="error">Your wallet is not listed as an heir of this vault</StatusMessage>
            )}
            {timeLeft !== undefined && (
              canClaim
                ? <StatusMessage variant="success">This vault is ready to claim</StatusMessage>
                : (
                  <StatusMessage variant="warning" icon={<ClockIcon size={16} color={COLOR_WARNING} />}>
                    {formatTimeLeft(timeLeft)} remaining before this vault can be claimed
                  </StatusMessage>
                )
            )}
          </div>
        )}

        <div style={{ marginBottom: SECTION_GAP }}>
          <label style={fieldLabelStyle}>Token address to claim</label>
          <input
            value={tokenAddress}
            onChange={e => setTokenAddress(e.target.value)}
            placeholder="0x... token contract address"
          />
        </div>

        {error && (
          <StatusMessage variant="error" style={{ marginBottom: '1rem' }}>{error}</StatusMessage>
        )}

        {isSuccess && (
          <StatusMessage variant="success" style={{ marginBottom: '1rem' }}>Inheritance claimed successfully!</StatusMessage>
        )}

        <button
          {...actionButton(canSubmit)}
          onClick={handleClaim}
          disabled={isPending || isConfirming || !canClaim || !isHeir || isWrongNetwork}
        >
          {isPending ? 'Confirm in your wallet...' : isConfirming ? 'Claiming...' : 'Claim my inheritance'}
        </button>
      </Card>
    </div>
  )
}
