import { parseAbi } from 'viem'

export const CONTRACT_ADDRESS = '0xdb7875DBfDe3A5C4763C11eF15f972C26E3D8818' as const

export const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://testnet.arcscan.app' },
  },
} as const

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
  'function MIN_TIMELOCK() external view returns (uint256)',
  'function MIN_GRACE() external view returns (uint256)',
])

export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const

export const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
])
