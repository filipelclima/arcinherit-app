# Heirloom

**Onchain inheritance for ERC-20 tokens on [Arc](https://arc.io).** A vault owner deposits tokens, names heirs with percentage shares, and checks in periodically as proof of life. If the owner stops checking in, the heirs can claim their share once the check-in period plus a safety window have both passed. No custodian, no backend: the rules live in a smart contract and this frontend talks to it directly from the browser.

- **Live app:** https://arcinherit.com
- **Contract (v2, current):** `0x31C6962393e002845a647bB22e21c6B219eF7F16` on Arc Testnet ([view on the explorer](https://explorer.testnet.arc.io/address/0x31C6962393e002845a647bB22e21c6B219eF7F16?tab=contract)), verified
- **Contract (v1, legacy):** `0xdb7875DBfDe3A5C4763C11eF15f972C26E3D8818` ([view on the explorer](https://explorer.testnet.arc.io/address/0xdb7875DBfDe3A5C4763C11eF15f972C26E3D8818)). Still holds existing vaults, see [Legacy (v1) vaults](#legacy-v1-vaults).
- **Contract source and changelog:** [filipelclima/ArcInherit](https://github.com/filipelclima/ArcInherit) ([v2 changelog](https://github.com/filipelclima/ArcInherit#v2-changelog))

> Heirloom was previously called "ArcInherit". The product was renamed, but the contract and this repository still use the old name.

## Status and limitations

- **Testnet only.** Deployed on Arc Testnet. Don't use it with funds you can't afford to lose.
- **Not audited.** Neither the contract nor this frontend has had a security audit.
- **The owner keeps full control, even after claims open.** The owner can withdraw funds, change heirs or cancel the vault at any time, including after some heirs have claimed. A vault is not an irrevocable commitment, and heirs have no guaranteed claim until they actually claim. See the contract repo's [Known limits](https://github.com/filipelclima/ArcInherit#known-limits) for the full list.

## How it works

1. **Create a vault:** choose a check-in period (minimum 30 days), a safety window (minimum 7 days), and heirs whose percentages add up to 100%.
2. **Deposit** any ERC-20 token on Arc (for example USDC).
3. **Check in** before each period ends. Every check-in resets the clock.
4. **If check-ins stop,** each heir can call `claimInheritance(owner, token)` once the check-in period and the safety window have both run out. Each token is claimed separately. The first claim of a token records the vault's balance of it (`claimSnapshot`), and every heir gets their percentage of that snapshot, whatever order they claim in. The Claim tab shows each heir the exact amount they'll receive per token.
5. **False alarm?** If the owner checks in after a heir has claimed, claims close again and a new **claim round** starts (`claimRound`). Heirs keep what they already claimed. If claims open again later, every heir gets their percentage of the vault's balance at that point.

### Legacy (v1) vaults

Both contracts are immutable, so v1 keeps running and its vaults stay on v1. v1 has two bugs that v2 fixes: with 2+ heirs, later claimers get a percentage of what's *left* rather than of the full amount, and a zero-address heir was accepted. v1 has no snapshots or claim rounds. The app handles v1 like this:

- **Owners:** if the connected wallet has an active v1 vault, **My Vault** shows it with a "Legacy vault" notice. Check-in keeps working there, but deposits are turned off. A guided two-step move goes (1) `cancelVault()` on v1, which returns every token in the same transaction, then (2) create a new vault on v2.
- **Heirs:** the **Claim** tab looks up the owner on both contracts and claims from whichever holds a vault they're an heir of. If they're an heir on both, they can switch between them.
- New vaults are always created on v2.

## Stack

- Next.js 14 (App Router), TypeScript
- wagmi 2.19.0 + viem, @tanstack/react-query
- jsPDF (client-side PDF generation)
- Vitest + Testing Library

## Running locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Other commands:

```bash
npm run build    # production build
npm test         # unit tests (vitest run)
npx tsc --noEmit # typecheck
npx next lint    # lint
```

No environment variables or API keys are needed. The app uses public Arc Testnet RPC endpoints.

## Integration guide: reusable pieces

The parts below aren't specific to Heirloom. Use them if you're building on the same contract or on Arc in general. They're all MIT-licensed.

### Contract config and ABI: `lib/contract.ts`

Exports `CONTRACT_ADDRESS` (v2), `LEGACY_CONTRACT_ADDRESS` (v1), the full v2 `ABI` (via viem's `parseAbi`: functions, events including `ClaimSnapshotTaken`/`ClaimRoundStarted`, and every custom error so viem can decode reverts by name), an `ARC_TESTNET` chain definition ready for wagmi/viem, `explorerAddressUrl(address)`, `USDC_ADDRESS` and a minimal `ERC20_ABI`.

The same `ABI` works against v1 for every shared function, since the signatures are identical. Just never call `claimSnapshot`/`claimRound` on v1, because they don't exist there and revert.

A note on Arc's USDC: USDC is Arc's native gas token **and** an ERC-20 at `0x3600…0000`. Both are views of the same balance, with different decimals: 18 for native, 6 for the ERC-20. Use the ERC-20 interface for all app logic, and read `decimals()` from the token instead of hardcoding it. `ARC_TESTNET.nativeCurrency.decimals` is `18` because that field describes the native interface. Wallets show it when they add the network.

### Reading per-owner balances: `getBalances`, not `balanceOf`

The contract is **one shared vault for every user**, with internal accounting per owner. Calling `token.balanceOf(CONTRACT_ADDRESS)` returns the deposits of *all* users added together. To get one owner's funds, call:

```ts
const { data: balances } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'getBalances',
  args: [owner],
}) // => { token: Address, amount: bigint }[]
```

The same token can show up more than once in the list (it gets re-added after its balance drops to zero and is topped up again), so dedupe by address. Then read `symbol()` and `decimals()` for each token and format with `lib/formatTokenAmount.ts`. See `VaultBalances` in `app/components/VaultStatus.tsx` for a complete example.

### View functions for building UIs

| Function | Returns | Use it for |
| --- | --- | --- |
| `getVault(owner)` | check-in period, safety window, last check-in, `active`, heirs (`wallet`, `percentage`) | Rendering a vault and its countdown |
| `getBalances(owner)` | `(token, amount)[]` | Per-owner vault balances |
| `canClaim(owner)` | `bool` | Enabling a claim button for heirs |
| `timeUntilClaim(owner)` | seconds | "Claimable in…" countdowns |
| `isTimelockExpired(owner)` | `bool` | Showing "check-in missed, safety window running" |
| `hasClaimed(owner, heir, token)` | `bool` | Hiding tokens an heir has already claimed (v2: in the current claim round) |
| `claimSnapshot(owner, token)` | amount, or `0` before the round's first claim | Showing each heir their exact share (v2 only) |
| `claimRound(owner)` | round number, starting at `0` | Telling heirs the owner came back after a claim (v2 only) |
| `MIN_TIMELOCK()` / `MIN_GRACE()` | seconds | Form validation |

Durations are in seconds (`bigint`). `lib/duration.ts` (`formatDuration`) turns them into readable text.

### Exact claim amounts: `lib/claimShare.ts`

`computeClaimShare({ balance, percentage, snapshot, legacy })` runs the same math as `claimInheritance`. On v2 that's `min(snapshot × pct / 100, balance)`, using the current balance while the snapshot is still `0`. On v1 it's `balance × pct / 100`. The Claim tab (`app/components/ClaimInheritance.tsx`) uses it to show the amount that will actually land in the heir's wallet.

### Readable revert messages: `lib/contractErrors.ts`

`friendlyContractError(error)` takes the error from wagmi's `useWriteContract` and returns one plain sentence: a decoded custom error such as `ZeroAddressHeir` or `AlreadyClaimed`, a "you rejected the transaction" message, or viem's short message as a fallback.

### Client-side heir instructions PDF: `lib/generateInheritancePdf.ts`

Heirs usually don't know a vault exists or how to claim it. This module builds a PDF of instructions **entirely in the browser**: nothing goes to a server, and it never includes keys or seed phrases. The owner can print it or store it with their will.

```ts
import { generateInheritancePdf } from '@/lib/generateInheritancePdf'

await generateInheritancePdf({
  ownerAddress,
  heirs: [{ wallet: '0x…', percentage: 60 }, { wallet: '0x…', percentage: 40 }],
  timelockDuration, // bigint seconds, straight from getVault
  gracePeriod,      // bigint seconds
  contractAddress,  // optional, defaults to CONTRACT_ADDRESS (v2); pass the v1 address for a legacy vault
}) // downloads heirloom-inheritance-instructions.pdf
```

jsPDF is loaded with a dynamic `import()`, so its ~130 KB only downloads when someone generates the PDF.

### RPC fallback: `lib/wagmi.ts`

Reads go through a wagmi `fallback` transport. If the primary Arc RPC is rate-limited or down, wagmi switches to the next one automatically:

```ts
transports: {
  [ARC_TESTNET.id]: fallback([
    http(ARC_TESTNET.rpcUrls.default.http[0]), // https://rpc.testnet.arc.io
    http('https://5042002.rpc.thirdweb.com'),
  ]),
}
```

This only covers **reads**. Writes are signed and sent through the RPC configured in the user's wallet.

### Wallet discovery (EIP-6963) and auto-switching to Arc

- **`app/components/ConnectWallet.tsx`:** wagmi discovers every EIP-6963 wallet (MetaMask, Rabby, Coinbase…). The component prefers those named connectors over the generic `window.ethereum` one and shows a picker when more than one is installed.
- **`app/hooks/useEnsureArcNetwork.ts`:**
  - `useIsWrongNetwork()`: a read with no side effects. Use it to disable write buttons.
  - `useEnsureArcNetwork()`: call it **once** at the app root. It asks the wallet to switch to Arc Testnet. If the wallet doesn't know the chain yet (error 4902), wagmi adds it automatically from the `ARC_TESTNET` definition.
  - Pitfall: with a single-chain config, `useChainId()` stays stuck on the configured chain, and `useAccount().chain` is `undefined` on any other network. Detect the wrong network with `useAccount().chainId` instead.

## Contributing

Issues and PRs are welcome. Before submitting, please run `npm test` and `npm run build`. [CLAUDE.md](./CLAUDE.md) records project conventions and known pitfalls (in Portuguese).

## License

[MIT](./LICENSE) © 2026 Filipe Lima
