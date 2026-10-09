import { parseAbi } from 'viem'

// v2: every new vault is created here. Fixes v1's claim-order and zero-address-heir bugs and adds
// claim snapshots/rounds (see the contract repo's README, "v2 changelog").
export const CONTRACT_ADDRESS = '0x31C6962393e002845a647bB22e21c6B219eF7F16' as const

// v1: legacy. Both contracts are immutable, so v1 keeps running and still holds real testnet vaults —
// owners can check in or cancel there, and heirs of v1 vaults can still claim. Never create new vaults
// here, and never call the v2-only views (claimSnapshot/claimRound) on it: they don't exist and revert.
export const LEGACY_CONTRACT_ADDRESS = '0xdb7875DBfDe3A5C4763C11eF15f972C26E3D8818' as const

export type VaultContract = typeof CONTRACT_ADDRESS | typeof LEGACY_CONTRACT_ADDRESS

export const isLegacyContract = (contract: VaultContract) => contract === LEGACY_CONTRACT_ADDRESS

export const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  // Arc's native gas currency (18 decimals) — distinct from the ERC-20 USDC interface
  // at USDC_ADDRESS below (6 decimals). Getting this wrong doesn't affect any deposit/
  // balance/claim math in the app (all of that goes through the ERC-20 interface, see
  // CLAUDE.md "Auditoria: interface nativa vs ERC-20"), but it does get passed verbatim
  // to wallet_addEthereumChain when a wallet auto-adds Arc Testnet (useEnsureArcNetwork.ts),
  // so a wrong value here shows the wallet's own native gas balance off by 10^12.
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    // rpc.testnet.arc.network is Arc's legacy endpoint (brownout Oct 2026, removed Oct 15, 2026).
    default: { http: ['https://rpc.testnet.arc.io'] },
  },
  blockExplorers: {
    // testnet.arcscan.app is the old host; it now 301-redirects here.
    default: { name: 'Arc Testnet Explorer', url: 'https://explorer.testnet.arc.io' },
  },
} as const

export const explorerAddressUrl = (address: string) => `${ARC_TESTNET.blockExplorers.default.url}/address/${address}`

// v2 ABI. v1 shares every function signature below except claimSnapshot/claimRound (and the
// ZeroAddressHeir error / the two Claim* events), so the same ABI talks to both contracts.
// The errors are listed so viem can decode a revert by name (see lib/contractErrors.ts).
export const ABI = parseAbi([
  'function createVault(uint256 timelockDuration, uint256 gracePeriod, (address wallet, uint8 percentage)[] heirs) external',
  'function deposit(address token, uint256 amount) external',
  'function withdraw(address token, uint256 amount) external',
  'function checkIn() external',
  'function updateHeirs((address wallet, uint8 percentage)[] heirs) external',
  'function cancelVault() external',
  'function claimInheritance(address owner, address token) external',
  'function getVault(address owner) external view returns (uint256 timelockDuration, uint256 gracePeriod, uint256 lastCheckIn, bool active, (address wallet, uint8 percentage)[] heirs)',
  'function getBalances(address owner) external view returns ((address token, uint256 amount)[] balances)',
  'function canClaim(address owner) external view returns (bool)',
  'function timeUntilClaim(address owner) external view returns (uint256)',
  'function isTimelockExpired(address owner) external view returns (bool)',
  'function hasClaimed(address owner, address heir, address token) external view returns (bool)',
  'function claimSnapshot(address owner, address token) external view returns (uint256)',
  'function claimRound(address owner) external view returns (uint256)',
  'function MIN_TIMELOCK() external view returns (uint256)',
  'function MIN_GRACE() external view returns (uint256)',
  'event VaultCreated(address indexed owner, uint256 timelockDuration, uint256 gracePeriod)',
  'event Deposited(address indexed owner, address indexed token, uint256 amount)',
  'event Withdrawn(address indexed owner, address indexed token, uint256 amount)',
  'event CheckIn(address indexed owner, uint256 timestamp)',
  'event HeirsUpdated(address indexed owner)',
  'event VaultCancelled(address indexed owner)',
  'event InheritanceClaimed(address indexed owner, address indexed heir, address indexed token, uint256 amount)',
  'event ClaimSnapshotTaken(address indexed owner, address indexed token, uint256 amount)',
  'event ClaimRoundStarted(address indexed owner, uint256 round)',
  'error VaultAlreadyExists()',
  'error VaultDoesNotExist()',
  'error VaultNotActive()',
  'error NotVaultOwner()',
  'error NotAnHeir()',
  'error TimelockNotExpired()',
  'error GracePeriodNotExpired()',
  'error AlreadyClaimed()',
  'error InvalidPercentages()',
  'error NoHeirs()',
  'error InvalidTimelock()',
  'error InvalidGracePeriod()',
  'error ZeroAmount()',
  'error TransferFailed()',
  'error ZeroAddressHeir()',
])

export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const

export const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
])
