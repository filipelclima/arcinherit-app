'use client'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { ARC_TESTNET, CONTRACT_ADDRESS, ABI } from '@/lib/contract'
import { useIsWrongNetwork } from '../hooks/useEnsureArcNetwork'
import { CheckCircleIcon } from './icons'
import { actionButton, Card, CardHeader, CardHeaderSkeleton, Skeleton, StatusMessage } from './ui'

// Same card, header skeleton, two lines standing in for the description, and the button.
function CheckInSkeleton() {
  return (
    <Card data-testid="check-in-skeleton">
      <CardHeaderSkeleton titleWidth={90} />
      <Skeleton width="100%" height={12} style={{ marginBottom: 6 }} />
      <Skeleton width="70%" height={12} style={{ marginBottom: '1.25rem' }} />
      <Skeleton width="100%" height={48} radius={10} />
    </Card>
  )
}

export function CheckIn() {
  const { address } = useAccount()
  const isWrongNetwork = useIsWrongNetwork()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const { data: vault, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getVault',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  if (isLoading) return <CheckInSkeleton />
  if (!vault || !vault[3]) return null

  return (
    <Card>
      <CardHeader
        icon={<CheckCircleIcon size={18} />}
        title="I am alive"
        description="Clicking this button resets your countdown. It is an onchain transaction that costs less than $0.01 and takes a few seconds. Do this once a year (or however often you set) to keep your vault protected."
      />
      {isSuccess && (
        <StatusMessage variant="success" style={{ marginBottom: '1rem' }}>
          Check-in confirmed! Your countdown has been reset.
        </StatusMessage>
      )}
      <button
        {...actionButton(true)}
        onClick={() => {
          if (!address) return
          writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'checkIn', account: address, chain: ARC_TESTNET })
        }}
        disabled={isPending || isConfirming || isWrongNetwork}
      >
        {isPending ? 'Confirm in your wallet...' : isConfirming ? 'Confirming...' : 'Check in — I am alive'}
      </button>
    </Card>
  )
}
