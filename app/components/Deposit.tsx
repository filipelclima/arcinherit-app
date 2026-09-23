'use client'
import { useEffect, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { ARC_TESTNET, CONTRACT_ADDRESS, ABI, USDC_ADDRESS, ERC20_ABI } from '@/lib/contract'
import { parseUnits, formatUnits } from 'viem'
import { COLOR_ACCENT, COLOR_SUCCESS } from '@/lib/theme'
import { useIsWrongNetwork } from '../hooks/useEnsureArcNetwork'
import { CheckCircleIcon, CoinsIcon } from './icons'
import { actionButton, Card, CardHeader, CardHeaderSkeleton, FIELD_GAP, fieldLabelStyle, SECTION_GAP, Skeleton, StatusMessage } from './ui'

// Same card, header skeleton, a token-address field, an amount field, and the two step buttons.
function DepositSkeleton() {
  return (
    <Card data-testid="deposit-skeleton">
      <CardHeaderSkeleton titleWidth={130} />
      <div style={{ marginBottom: FIELD_GAP }}>
        <Skeleton width={90} height={10} style={{ marginBottom: 6 }} />
        <Skeleton width="100%" height={38} radius={8} />
      </div>
      <div style={{ marginBottom: SECTION_GAP }}>
        <Skeleton width={60} height={10} style={{ marginBottom: 6 }} />
        <Skeleton width="100%" height={38} radius={8} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Skeleton width="100%" height={44} radius={8} />
        <Skeleton width="100%" height={44} radius={8} />
      </div>
    </Card>
  )
}

export function Deposit() {
  const { address } = useAccount()
  const isWrongNetwork = useIsWrongNetwork()
  const [amount, setAmount] = useState('')
  const [tokenAddress, setTokenAddress] = useState<string>(USDC_ADDRESS)
  const [error, setError] = useState('')

  const { data: vault, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getVault',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: decimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
  })

  const { data: symbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'symbol',
  })

  const { data: balance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address },
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isSuccess) refetchAllowance()
  }, [isSuccess, refetchAllowance])

  if (isLoading) return <DepositSkeleton />
  if (!vault || !vault[3]) return null

  const dec = decimals ?? 6
  const parsedAmount = amount ? parseUnits(amount, dec) : BigInt(0)
  const hasAllowance = allowance !== undefined && allowance >= parsedAmount

  function handleApprove() {
    setError('')
    if (!address) return setError('Connect your wallet first')
    if (!amount || parsedAmount <= BigInt(0)) return setError('Enter an amount')
    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESS, parsedAmount],
      account: address,
      chain: ARC_TESTNET,
    })
  }

  function handleDeposit() {
    setError('')
    if (!address) return setError('Connect your wallet first')
    if (!amount || parsedAmount <= BigInt(0)) return setError('Enter an amount')
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'deposit',
      args: [tokenAddress as `0x${string}`, parsedAmount],
      account: address,
      chain: ARC_TESTNET,
    })
  }

  return (
    <Card>
      <CardHeader icon={<CoinsIcon size={18} />} title="Deposit Tokens" />

      <div style={{ marginBottom: FIELD_GAP }}>
        <label style={fieldLabelStyle}>Token address</label>
        <input
          value={tokenAddress}
          onChange={e => setTokenAddress(e.target.value)}
          placeholder="0x... token contract address"
        />
        {symbol && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: COLOR_SUCCESS, marginTop: 4 }}>
            <CheckCircleIcon size={12} color={COLOR_SUCCESS} />
            <span>Token: {symbol}</span>
          </div>
        )}
      </div>

      <div style={{ marginBottom: SECTION_GAP }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ ...fieldLabelStyle, marginBottom: 0 }}>Amount</label>
          {balance !== undefined && (
            <span
              style={{ fontSize: 12, color: COLOR_ACCENT, cursor: 'pointer' }}
              onClick={() => setAmount(formatUnits(balance, dec))}
            >
              Balance: {formatUnits(balance, dec)} {symbol}
            </span>
          )}
        </div>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </div>

      {error && (
        <StatusMessage variant="error" style={{ marginBottom: '1rem' }}>{error}</StatusMessage>
      )}

      {isSuccess && (
        <StatusMessage variant="success" style={{ marginBottom: '1rem' }}>
          {hasAllowance ? 'Deposit successful' : 'Approval successful — now deposit'}
        </StatusMessage>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          {...actionButton(!hasAllowance)}
          onClick={handleApprove}
          disabled={isPending || isConfirming || hasAllowance || isWrongNetwork}
        >
          {hasAllowance ? 'Approved' : isPending ? 'Confirm...' : '1. Approve'}
        </button>
        <button
          {...actionButton(hasAllowance)}
          onClick={handleDeposit}
          disabled={isPending || isConfirming || !hasAllowance || isWrongNetwork}
        >
          {isPending ? 'Confirm...' : isConfirming ? 'Depositing...' : '2. Deposit'}
        </button>
      </div>
    </Card>
  )
}
