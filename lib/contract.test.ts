import { describe, expect, it } from 'vitest'
import { ABI, ARC_TESTNET, CONTRACT_ADDRESS, explorerAddressUrl, isLegacyContract, LEGACY_CONTRACT_ADDRESS, USDC_ADDRESS } from './contract'

describe('ARC_TESTNET.nativeCurrency', () => {
  it('uses 18 decimals for the native gas interface, never the 6-decimal ERC-20 interface', () => {
    // Arc's USDC is one balance exposed through two interfaces: native (18 decimals,
    // gas/msg.value) and ERC-20 (6 decimals, app logic — see USDC_ADDRESS below).
    // ARC_TESTNET.nativeCurrency describes the NATIVE interface, so it must be 18.
    // Regression: this was accidentally set to 6 (the ERC-20 value) before, which gets
    // passed straight through to wallet_addEthereumChain and shows the wallet's own
    // native gas balance off by 10^12.
    expect(ARC_TESTNET.nativeCurrency.decimals).toBe(18)
  })
})

describe('USDC_ADDRESS', () => {
  it('points at the 6-decimal ERC-20 interface used for all app-level token logic', () => {
    expect(USDC_ADDRESS).toBe('0x3600000000000000000000000000000000000000')
  })
})

describe('ARC_TESTNET.rpcUrls', () => {
  it('uses the current arc.io RPC, never the legacy arc.network endpoint (removed Oct 15, 2026)', () => {
    const urls = ARC_TESTNET.rpcUrls.default.http
    expect(urls[0]).toBe('https://rpc.testnet.arc.io')
    expect(urls.some((u) => u.includes('arc.network'))).toBe(false)
  })
})

describe('contract addresses', () => {
  it('creates new vaults on v2 and keeps v1 only as the legacy contract', () => {
    expect(CONTRACT_ADDRESS).toBe('0x31C6962393e002845a647bB22e21c6B219eF7F16')
    expect(LEGACY_CONTRACT_ADDRESS).toBe('0xdb7875DBfDe3A5C4763C11eF15f972C26E3D8818')
    expect(isLegacyContract(CONTRACT_ADDRESS)).toBe(false)
    expect(isLegacyContract(LEGACY_CONTRACT_ADDRESS)).toBe(true)
  })
})

describe('ABI (v2)', () => {
  const names = (type: string) => ABI.filter(item => item.type === type).map(item => (item as { name: string }).name)

  it('includes the v2 views, events and error', () => {
    expect(names('function')).toEqual(expect.arrayContaining(['claimSnapshot', 'claimRound']))
    expect(names('event')).toEqual(expect.arrayContaining(['ClaimSnapshotTaken', 'ClaimRoundStarted']))
    expect(names('error')).toContain('ZeroAddressHeir')
  })
})

describe('block explorer', () => {
  it('uses explorer.testnet.arc.io, never the old testnet.arcscan.app host', () => {
    expect(ARC_TESTNET.blockExplorers.default.url).toBe('https://explorer.testnet.arc.io')
    expect(explorerAddressUrl(CONTRACT_ADDRESS)).toBe(`https://explorer.testnet.arc.io/address/${CONTRACT_ADDRESS}`)
  })
})
