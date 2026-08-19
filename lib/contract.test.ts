import { describe, expect, it } from 'vitest'
import { ARC_TESTNET, USDC_ADDRESS } from './contract'

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
