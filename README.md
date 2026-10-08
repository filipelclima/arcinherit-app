# Heirloom

**Onchain inheritance for ERC-20 tokens on [Arc](https://arc.io).** A vault owner deposits tokens, names heirs with percentage shares, and checks in periodically as proof of life. If the owner stops checking in, the heirs can claim their share once the check-in period plus a safety window have both passed. No custodian, no backend: the rules live in a smart contract and this frontend talks to it directly from the browser.

- **Live app:** https://arcinherit.com
- **Contract:** `0xdb7875DBfDe3A5C4763C11eF15f972C26E3D8818` on Arc Testnet ([view on Arcscan](https://testnet.arcscan.app/address/0xdb7875DBfDe3A5C4763C11eF15f972C26E3D8818)), verified
- **Contract source:** [filipelclima/ArcInherit](https://github.com/filipelclima/ArcInherit)

> Heirloom was previously called "ArcInherit". The product was renamed, but the contract and this repository still use the old name.

## Status and limitations

- **Testnet only.** Deployed on Arc Testnet. Don't use it with funds you can't afford to lose.
- **Not audited.** Neither the contract nor this frontend has had a security audit.
- **The owner stays in full control while active.** Until a claim happens, the owner can withdraw funds, change heirs or cancel the vault at any time. A vault is not an irrevocable commitment, and heirs have no guaranteed claim until the owner actually stops checking in.

## How it works

1. **Create a vault:** choose a check-in period (minimum 30 days), a safety window (minimum 7 days), and heirs whose percentages add up to 100%.
2. **Deposit** any ERC-20 token on Arc (for example USDC).
3. **Check in** before each period ends. Every check-in resets the clock.
4. **If check-ins stop,** each heir can call `claimInheritance(owner, token)` once the check-in period and the safety window have both run out. Each heir receives their percentage of each token, claimed per token.

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

Exports `CONTRACT_ADDRESS`, the full `ABI` (via viem's `parseAbi`), an `ARC_TESTNET` chain definition ready for wagmi/viem, `USDC_ADDRESS` and a minimal `ERC20_ABI`.

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
| `hasClaimed(owner, heir, token)` | `bool` | Hiding tokens an heir has already claimed |
| `MIN_TIMELOCK()` / `MIN_GRACE()` | seconds | Form validation |

Durations are in seconds (`bigint`). `lib/duration.ts` (`formatDuration`) turns them into readable text.

### Client-side heir instructions PDF: `lib/generateInheritancePdf.ts`

Heirs usually don't know a vault exists or how to claim it. This module builds a PDF of instructions **entirely in the browser**: nothing goes to a server, and it never includes keys or seed phrases. The owner can print it or store it with their will.

```ts
import { generateInheritancePdf } from '@/lib/generateInheritancePdf'

await generateInheritancePdf({
  ownerAddress,
  heirs: [{ wallet: '0x…', percentage: 60 }, { wallet: '0x…', percentage: 40 }],
  timelockDuration, // bigint seconds, straight from getVault
  gracePeriod,      // bigint seconds
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
