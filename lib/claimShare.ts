// What a heir receives right now when they claim one token — the same math the contract runs in
// claimInheritance, so the number on screen is the number that lands in their wallet.
//
// v2: the round's first successful claim of a token records the vault's balance of it
// (claimSnapshot). Every heir gets pct of that snapshot, whatever the claim order, capped at what's
// left (the owner can still withdraw after claims open). Before anyone has claimed, the snapshot is 0
// and the next claim will snapshot the current balance.
//
// v1 (legacy): no snapshot — each heir gets pct of whatever is left when they claim, which is why later
// claimers get less (the bug v2 fixes).
export function computeClaimShare({ balance, percentage, snapshot, legacy }: {
  balance: bigint
  percentage: number
  /** claimSnapshot(owner, token) — v2 only; ignored for legacy vaults. */
  snapshot?: bigint
  legacy: boolean
}): bigint {
  const pct = BigInt(percentage)
  if (legacy) return (balance * pct) / BigInt(100)

  const base = snapshot && snapshot > BigInt(0) ? snapshot : balance
  const share = (base * pct) / BigInt(100)
  return share > balance ? balance : share
}
