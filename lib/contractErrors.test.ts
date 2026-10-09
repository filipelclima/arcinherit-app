import { describe, expect, it } from 'vitest'
import { ContractFunctionExecutionError, ContractFunctionRevertedError, encodeErrorResult, UserRejectedRequestError } from 'viem'
import { ABI } from './contract'
import { CONTRACT_ERROR_MESSAGES, friendlyContractError } from './contractErrors'

// Builds the error wagmi actually hands back when a write reverts during simulation/gas estimation:
// a ContractFunctionExecutionError wrapping a ContractFunctionRevertedError decoded with our ABI.
function revertError(errorName: string) {
  const reverted = new ContractFunctionRevertedError({
    abi: ABI,
    data: encodeErrorResult({ abi: ABI, errorName: errorName as any }),
    functionName: 'createVault',
  })
  return new ContractFunctionExecutionError(reverted, { abi: ABI, functionName: 'createVault', args: [] })
}

describe('friendlyContractError', () => {
  it('explains a ZeroAddressHeir revert (new in v2) in plain words', () => {
    const msg = friendlyContractError(revertError('ZeroAddressHeir'))
    expect(msg).toBe(CONTRACT_ERROR_MESSAGES.ZeroAddressHeir)
    expect(msg).toMatch(/zero address/)
  })

  it('has a message for every custom error in the ABI, so no revert falls through to a raw name', () => {
    const errorNames = ABI.filter(item => item.type === 'error').map(item => item.name)
    expect(errorNames).toContain('ZeroAddressHeir')
    for (const name of errorNames) {
      expect(CONTRACT_ERROR_MESSAGES[name], name).toBeTruthy()
      expect(friendlyContractError(revertError(name))).toBe(CONTRACT_ERROR_MESSAGES[name])
    }
  })

  it('tells the user they rejected the transaction instead of showing a wallet error dump', () => {
    const rejected = new UserRejectedRequestError(new Error('User denied transaction signature'))
    expect(friendlyContractError(rejected)).toBe('You rejected the transaction in your wallet.')
  })

  it('returns an empty string for no error and a generic sentence for unknown errors', () => {
    expect(friendlyContractError(null)).toBe('')
    expect(friendlyContractError(new Error('boom'))).toBe('The transaction failed. Please try again.')
  })
})
