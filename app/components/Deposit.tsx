'use client'
import { useEffect, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESS, ABI, USDC_ADDRESS, ERC20_ABI } from '@/lib/contract'
import { parseUnits, formatUnits } from 'viem'

export function Deposit() {
  const { address, chain } = useAccount()
  const [amount, setAmount] = useState('')
  const [tokenAddress, setTokenAddress] = useState<string>(USDC_ADDRESS)
  const [error, setError] = useState('')

  const { data: vault } = useReadContract({
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

  if (!vault || !vault[3]) return null

  const dec = decimals ?? 6
  const parsedAmount = amount ? parseUnits(amount, dec) : BigInt(0)
  const hasAllowance = allowance !== undefined && allowance >= parsedAmount

  function handleApprove() {
    setError('')
    if (!address || !chain) return setError('Connect your wallet first')
    if (!amount || parsedAmount <= BigInt(0)) return setError('Enter an amount')
    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESS, parsedAmount],
      account: address,
      chain,
    })
  }

  function handleDeposit() {
    setError('')
    if (!address || !chain) return setError('Connect your wallet first')
    if (!amount || parsedAmount <= BigInt(0)) return setError('Enter an amount')
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'deposit',
      args: [tokenAddress as `0x${string}`, parsedAmount],
      account: address,
      chain,
    })
  }

  return (
    <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: '1.25rem' }}>Deposit Tokens</div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>Token address</label>
        <input
          value={tokenAddress}
          onChange={e => setTokenAddress(e.target.value)}
          placeholder="0x... token contract address"
        />
        {symbol && <div style={{ fontSize: 11, color: '#1D9E75', marginTop: 4 }}>Token: {symbol}</div>}
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontSize: 12, color: '#64748b' }}>Amount</label>
          {balance !== undefined && (
            <span
              style={{ fontSize: 12, color: '#378ADD', cursor: 'pointer' }}
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
        <div style={{ background: '#ef444411', border: '1px solid #ef444444', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {isSuccess && (
        <div style={{ background: '#1D9E7511', border: '1px solid #1D9E7544', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1D9E75', marginBottom: '1rem' }}>
          {hasAllowance ? 'Deposit successful' : 'Approval successful — now deposit'}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          onClick={handleApprove}
          disabled={isPending || isConfirming || hasAllowance}
          style={{ background: hasAllowance ? '#1e1e2e' : '#EF9F27', color: hasAllowance ? '#475569' : '#fff', padding: '12px', fontWeight: 600, borderRadius: 8 }}
        >
          {hasAllowance ? 'Approved' : isPending ? 'Confirm...' : '1. Approve'}
        </button>
        <button
          onClick={handleDeposit}
          disabled={isPending || isConfirming || !hasAllowance}
          style={{ background: !hasAllowance ? '#1e1e2e' : '#1D9E75', color: !hasAllowance ? '#475569' : '#fff', padding: '12px', fontWeight: 600, borderRadius: 8 }}
        >
          {isPending ? 'Confirm...' : isConfirming ? 'Depositing...' : '2. Deposit'}
        </button>
      </div>
    </div>
  )
}
