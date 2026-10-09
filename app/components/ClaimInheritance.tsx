'use client'
import { useEffect, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { ARC_TESTNET, CONTRACT_ADDRESS, ABI, ERC20_ABI, isLegacyContract, LEGACY_CONTRACT_ADDRESS, type VaultContract } from '@/lib/contract'
import { computeClaimShare } from '@/lib/claimShare'
import { friendlyContractError } from '@/lib/contractErrors'
import { formatTokenAmount } from '@/lib/formatTokenAmount'
import { isAddress } from 'viem'
import { ARC_GRADIENT, COLOR_ACCENT, COLOR_ACCENT_TINT, COLOR_BG_SUBTLE, COLOR_BORDER, COLOR_SUCCESS, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_TERTIARY, COLOR_WARNING } from '@/lib/theme'
import { ClockIcon, CoinsIcon, UsersIcon } from './icons'
import { actionButton, Card, CardHeader, FIELD_GAP, fieldLabelStyle, SECTION_GAP, Skeleton, SkeletonChip, StatusMessage } from './ui'
import { useIsWrongNetwork } from '../hooks/useEnsureArcNetwork'

type Address = `0x${string}`

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

// Everything the Claim tab needs to know about one owner's vault on one contract. Called once for v2
// and once for v1: vaults created before v2 stay on v1, and their heirs must still be able to claim.
function useOwnerVault(contract: VaultContract, owner: Address | undefined) {
  const enabled = !!owner
  const args = owner ? [owner] as const : undefined

  const { data: vault, isLoading } = useReadContract({ address: contract, abi: ABI, functionName: 'getVault', args, query: { enabled } })
  const { data: canClaim } = useReadContract({ address: contract, abi: ABI, functionName: 'canClaim', args, query: { enabled } })
  const { data: timeLeft } = useReadContract({ address: contract, abi: ABI, functionName: 'timeUntilClaim', args, query: { enabled } })

  return {
    contract,
    isLoading: enabled && isLoading,
    active: !!(vault && vault[3]),
    heirs: vault ? vault[4] : [],
    canClaim,
    timeLeft,
  }
}

type OwnerVault = ReturnType<typeof useOwnerVault>

function formatTimeLeft(seconds: bigint): string {
  const s = Number(seconds)
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`
  return `${hours} hour${hours !== 1 ? 's' : ''}`
}

// One token the heir can claim, with the exact amount the contract would send right now.
function TokenShareRow({ contract, owner, heir, token, balance, percentage, selected, onSelect }: {
  contract: VaultContract
  owner: Address
  heir: Address
  token: Address
  balance: bigint
  percentage: number
  selected: boolean
  onSelect: (token: Address) => void
}) {
  const legacy = isLegacyContract(contract)
  const { data: symbol, isLoading: isLoadingSymbol } = useReadContract({ address: token, abi: ERC20_ABI, functionName: 'symbol' })
  const { data: decimals, isLoading: isLoadingDecimals } = useReadContract({ address: token, abi: ERC20_ABI, functionName: 'decimals' })
  // claimSnapshot only exists on v2 — never call it on the legacy contract (it would revert).
  const { data: snapshot, isLoading: isLoadingSnapshot } = useReadContract({
    address: contract, abi: ABI, functionName: 'claimSnapshot', args: [owner, token], query: { enabled: !legacy },
  })
  const { data: claimed } = useReadContract({ address: contract, abi: ABI, functionName: 'hasClaimed', args: [owner, heir, token] })

  const isLoadingInfo = isLoadingSymbol || isLoadingDecimals || (!legacy && isLoadingSnapshot)
  const label = symbol ?? `${token.slice(0, 6)}...${token.slice(-4)}`
  const share = computeClaimShare({ balance, percentage, snapshot, legacy })
  const fmt = (amount: bigint) => decimals !== undefined ? formatTokenAmount(amount, decimals) : '—'
  const hasSnapshot = !legacy && snapshot !== undefined && snapshot > BigInt(0)

  const basis = legacy
    ? `${percentage}% of what is left in the vault when you claim (${fmt(balance)} ${label} now)`
    : hasSnapshot
      ? `${percentage}% of ${fmt(snapshot!)} ${label}, the balance when the first heir claimed`
      : `${percentage}% of ${fmt(balance)} ${label}, the vault's balance now`

  return (
    <button
      type="button"
      className="ui-press"
      data-testid="claim-share-row"
      aria-pressed={selected}
      disabled={!!claimed}
      onClick={() => onSelect(token)}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
        background: COLOR_BG_SUBTLE, border: 'none',
        boxShadow: `inset 0 0 0 ${selected ? 2 : 1}px ${selected ? COLOR_ACCENT : COLOR_BORDER}`,
        borderRadius: 8, padding: '10px 14px', color: COLOR_TEXT_PRIMARY, cursor: claimed ? 'default' : 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLOR_ACCENT_TINT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CoinsIcon size={14} />
        </div>
        <div style={{ minWidth: 0 }}>
          {isLoadingInfo
            ? <Skeleton width={50} height={12} />
            : <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>}
          {!isLoadingInfo && !claimed && (
            <div style={{ fontSize: 11, color: COLOR_TEXT_TERTIARY, marginTop: 2 }}>{basis}</div>
          )}
        </div>
      </div>
      {isLoadingInfo
        ? <Skeleton width={80} height={16} />
        : claimed
          ? <span style={{ fontSize: 13, fontWeight: 600, color: COLOR_SUCCESS, flexShrink: 0 }}>Already claimed</span>
          : <span data-testid="claim-share-amount" style={{ fontWeight: 700, fontSize: 15, color: COLOR_ACCENT, flexShrink: 0 }}>{fmt(share)} {symbol ?? ''}</span>}
    </button>
  )
}

function ClaimShares({ contract, owner, heir, percentage, selectedToken, onSelect }: {
  contract: VaultContract
  owner: Address
  heir: Address
  percentage: number
  selectedToken: string
  onSelect: (token: Address) => void
}) {
  const { data: balances, isLoading } = useReadContract({ address: contract, abi: ABI, functionName: 'getBalances', args: [owner] })

  if (isLoading) {
    return (
      <div style={{ marginBottom: FIELD_GAP }} data-testid="claim-shares-skeleton">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: COLOR_BG_SUBTLE, border: `1px solid ${COLOR_BORDER}`, borderRadius: 8, padding: '10px 14px' }}>
          <SkeletonChip size={28} />
          <Skeleton width={120} height={12} />
        </div>
      </div>
    )
  }

  // Same dedupe as VaultStatus: the contract can list a token twice after its balance hit 0 and refilled.
  const seen = new Set<string>()
  const funded = (balances ?? []).filter(b => {
    const key = b.token.toLowerCase()
    if (b.amount === BigInt(0) || seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <div style={{ marginBottom: FIELD_GAP }} data-testid="claim-shares">
      <div style={{ ...fieldLabelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CoinsIcon size={14} color={COLOR_TEXT_SECONDARY} />
        Your share — pick a token to claim
      </div>
      {funded.length === 0 ? (
        <div style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY }}>There are no tokens left in this vault to claim.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {funded.map(b => (
            <TokenShareRow
              key={b.token}
              contract={contract}
              owner={owner}
              heir={heir}
              token={b.token}
              balance={b.amount}
              percentage={percentage}
              selected={selectedToken.toLowerCase() === b.token.toLowerCase()}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
      <div style={{ fontSize: 12, color: COLOR_TEXT_SECONDARY, lineHeight: 1.6, marginTop: 8 }}>
        {isLegacyContract(contract)
          ? 'Each token is claimed separately.'
          : 'Each token is claimed separately. The first claim of a token records the vault\'s balance, and every heir gets their percentage of that same amount, whatever order they claim in. If the owner checks in, claims close and a new claim round starts. You keep anything you have already claimed.'}
      </div>
    </div>
  )
}

// v2 only: tells heirs that the owner came back after an earlier claim ("false alarm").
function ClaimRoundNotice({ owner, claimsOpen }: { owner: Address; claimsOpen: boolean }) {
  const { data: round } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'claimRound', args: [owner] })
  if (round === undefined || round === BigInt(0)) return null
  return (
    <StatusMessage variant="info" data-testid="claim-round-notice">
      The owner checked in after an earlier claim, so this vault is now in claim round {(round + BigInt(1)).toString()}.
      Heirs keep what they claimed before.{' '}
      {claimsOpen
        ? 'Claims are open again: in this round, every heir gets their percentage of the vault\'s balance when the round\'s first claim was made.'
        : 'If claims open again, every heir gets their percentage of the vault\'s balance at that point.'}
    </StatusMessage>
  )
}

const CONTRACT_LABELS: Record<VaultContract, string> = {
  [CONTRACT_ADDRESS]: 'Current contract',
  [LEGACY_CONTRACT_ADDRESS]: 'Legacy contract (v1)',
}

export function ClaimInheritance() {
  const { address } = useAccount()
  const isWrongNetwork = useIsWrongNetwork()
  const queryClient = useQueryClient()
  const [ownerAddress, setOwnerAddress] = useState('')
  const [tokenAddress, setTokenAddress] = useState('')
  const [preferredContract, setPreferredContract] = useState<VaultContract | null>(null)
  const [error, setError] = useState('')

  const owner = isAddress(ownerAddress) ? ownerAddress as Address : undefined
  const current = useOwnerVault(CONTRACT_ADDRESS, owner)
  const legacy = useOwnerVault(LEGACY_CONTRACT_ADDRESS, owner)

  const { writeContract, data: hash, isPending, error: writeError, reset: resetWrite } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (!isSuccess) return
    // Balances, "already claimed" flags and the snapshot all just changed.
    queryClient.invalidateQueries({ predicate: ({ queryKey }) => queryKey[0] === 'readContract' })
  }, [isSuccess, queryClient])

  const isHeirOf = (v: OwnerVault) => !!address && v.heirs.some(h => h.wallet.toLowerCase() === address.toLowerCase())
  const activeVaults = [current, legacy].filter(v => v.active)
  const heirVaults = activeVaults.filter(isHeirOf)
  // Prefer a vault the connected wallet is actually an heir of; v2 first when it's both.
  const options = heirVaults.length > 0 ? heirVaults : activeVaults
  const selected: OwnerVault | undefined = options.find(v => v.contract === preferredContract) ?? options[0]

  const isLoadingVault = !!owner && (current.isLoading || legacy.isLoading)
  const myHeirEntry = selected && address ? selected.heirs.find(h => h.wallet.toLowerCase() === address.toLowerCase()) : undefined
  const isHeir = !!myHeirEntry
  const canClaim = !!selected?.canClaim
  const canSubmit = canClaim && isHeir

  function handleClaim() {
    setError('')
    if (!address) return setError('Connect your wallet first')
    if (!isAddress(ownerAddress)) return setError('Please enter a valid wallet address for the vault owner')
    if (!isAddress(tokenAddress)) return setError('Please enter a valid token contract address')
    if (!selected || !canClaim) return setError('This vault is not yet available for claiming')
    writeContract({
      address: selected.contract,
      abi: ABI,
      functionName: 'claimInheritance',
      args: [ownerAddress as Address, tokenAddress as Address],
      account: address,
      chain: ARC_TESTNET,
    })
  }

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
            onChange={e => {
              setOwnerAddress(e.target.value)
              // A previous attempt's error/success belongs to the old vault — don't leave it on screen.
              setError('')
              resetWrite()
            }}
            placeholder="0x... the person who created the vault"
          />
        </div>

        {isLoadingVault && <ClaimStatusSkeleton />}

        {owner && !isLoadingVault && !selected && (
          <StatusMessage variant="error" style={{ marginBottom: FIELD_GAP }}>
            No active vault found for this address. Check the address, or the vault may have been cancelled by its owner.
          </StatusMessage>
        )}

        {owner && !isLoadingVault && selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: FIELD_GAP }}>
            {/* Only when the wallet is an heir of a vault on BOTH contracts (the owner kept a v1 vault
                after creating a v2 one) — otherwise there is nothing to choose. */}
            {heirVaults.length > 1 && (
              <div role="group" aria-label="Which vault" style={{ display: 'flex', gap: 8 }}>
                {heirVaults.map(v => {
                  const isSelected = v.contract === selected.contract
                  return (
                    <button
                      key={v.contract}
                      type="button"
                      className="ui-press"
                      aria-pressed={isSelected}
                      onClick={() => { setPreferredContract(v.contract); setTokenAddress('') }}
                      style={{
                        flex: 1, border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 13,
                        background: isSelected ? ARC_GRADIENT : COLOR_BG_SUBTLE,
                        boxShadow: isSelected ? 'none' : `inset 0 0 0 1px ${COLOR_BORDER}`,
                        color: isSelected ? '#fff' : COLOR_TEXT_SECONDARY,
                      }}
                    >
                      {CONTRACT_LABELS[v.contract]}
                    </button>
                  )
                })}
              </div>
            )}

            {isLegacyContract(selected.contract) && (
              <StatusMessage variant="info" data-testid="claim-legacy-notice">
                This vault is on Heirloom&apos;s original contract (v1). There, each claim is a percentage of whatever is
                left in the vault at that moment, so with more than one heir, whoever claims later receives less.
              </StatusMessage>
            )}

            {isHeir ? (
              <StatusMessage variant="success">
                You are listed as an heir ({myHeirEntry?.percentage}% share)
              </StatusMessage>
            ) : (
              <StatusMessage variant="error">Your wallet is not listed as an heir of this vault</StatusMessage>
            )}
            {selected.timeLeft !== undefined && (
              canClaim
                ? <StatusMessage variant="success">This vault is ready to claim</StatusMessage>
                : (
                  <StatusMessage variant="warning" icon={<ClockIcon size={16} color={COLOR_WARNING} />}>
                    {formatTimeLeft(selected.timeLeft)} remaining before this vault can be claimed
                  </StatusMessage>
                )
            )}
            {!isLegacyContract(selected.contract) && <ClaimRoundNotice owner={owner} claimsOpen={canClaim} />}
          </div>
        )}

        {owner && !isLoadingVault && selected && isHeir && canClaim && address && (
          <ClaimShares
            contract={selected.contract}
            owner={owner}
            heir={address}
            percentage={myHeirEntry!.percentage}
            selectedToken={tokenAddress}
            onSelect={setTokenAddress}
          />
        )}

        <div style={{ marginBottom: SECTION_GAP }}>
          <label style={fieldLabelStyle}>Token address to claim</label>
          <input
            value={tokenAddress}
            onChange={e => setTokenAddress(e.target.value)}
            placeholder="0x... token contract address"
          />
        </div>

        {(error || writeError) && (
          <StatusMessage variant="error" style={{ marginBottom: '1rem' }}>{error || friendlyContractError(writeError)}</StatusMessage>
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
