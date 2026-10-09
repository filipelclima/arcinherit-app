import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'

// Plain-language versions of the contract's custom errors (decoded by name because they're in ABI,
// lib/contract.ts). Written for the person looking at the screen, not for a developer.
export const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  VaultAlreadyExists: 'You already have a vault on this contract.',
  VaultDoesNotExist: 'No vault exists for this address.',
  VaultNotActive: 'This vault has been cancelled, so it no longer accepts this action.',
  NotVaultOwner: 'Only the vault owner can do this.',
  NotAnHeir: 'Your wallet is not listed as an heir of this vault.',
  TimelockNotExpired: 'The owner\'s check-in period hasn\'t run out yet, so this vault can\'t be claimed.',
  GracePeriodNotExpired: 'The safety window after the missed check-in is still running, so this vault can\'t be claimed yet.',
  AlreadyClaimed: 'You have already claimed this token in the current claim round.',
  InvalidPercentages: 'Heir percentages must add up to exactly 100%.',
  NoHeirs: 'Add at least one heir.',
  InvalidTimelock: 'The check-in period must be at least 30 days.',
  InvalidGracePeriod: 'The safety window must be at least 7 days.',
  ZeroAmount: 'There is nothing to transfer: the amount is zero or more than the vault holds.',
  TransferFailed: 'The token refused the transfer. Please try again later.',
  ZeroAddressHeir: 'An heir wallet can\'t be the zero address (0x0000…0000). Nobody could ever claim that share, so please enter the heir\'s real wallet address.',
}

const FALLBACK_MESSAGE = 'The transaction failed. Please try again.'

/** Turns a wagmi/viem write error into one sentence a non-developer can act on. */
export function friendlyContractError(error: unknown): string {
  if (!error) return ''
  if (!(error instanceof BaseError)) return FALLBACK_MESSAGE

  if (error.walk(e => e instanceof UserRejectedRequestError)) {
    return 'You rejected the transaction in your wallet.'
  }

  const reverted = error.walk(e => e instanceof ContractFunctionRevertedError)
  if (reverted instanceof ContractFunctionRevertedError) {
    const name = reverted.data?.errorName
    if (name && CONTRACT_ERROR_MESSAGES[name]) return CONTRACT_ERROR_MESSAGES[name]
  }

  return error.shortMessage || FALLBACK_MESSAGE
}
