import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ConnectWallet } from './ConnectWallet'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useConnect: vi.fn(),
  useDisconnect: vi.fn(),
}))

const mockUseAccount = vi.mocked(useAccount)
const mockUseConnect = vi.mocked(useConnect)
const mockUseDisconnect = vi.mocked(useDisconnect)

describe('ConnectWallet', () => {
  it('shows a "Connect Wallet" button when disconnected, and calls connect on click', () => {
    const connect = vi.fn()
    const connector = { id: 'injected' }
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseConnect.mockReturnValue({ connect, connectors: [connector] } as any)
    mockUseDisconnect.mockReturnValue({ disconnect: vi.fn() } as any)

    render(<ConnectWallet />)
    const button = screen.getByText('Connect Wallet')
    fireEvent.click(button)

    expect(connect).toHaveBeenCalledWith({ connector })
    expect(button).toHaveStyle({ whiteSpace: 'nowrap' })
  })

  it('shows the truncated address and a "Disconnect" button when connected', () => {
    const disconnect = vi.fn()
    mockUseAccount.mockReturnValue({
      address: '0xAbCdEf0123456789AbCdEf0123456789AbCdEf01',
      isConnected: true,
    } as any)
    mockUseConnect.mockReturnValue({ connect: vi.fn(), connectors: [] } as any)
    mockUseDisconnect.mockReturnValue({ disconnect } as any)

    render(<ConnectWallet />)
    expect(screen.getByText('0xAbCd...Ef01')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Disconnect'))
    expect(disconnect).toHaveBeenCalled()
  })

  it('gives the Disconnect button a visible keyboard focus ring', () => {
    mockUseAccount.mockReturnValue({ address: '0xAbCdEf0123456789AbCdEf0123456789AbCdEf01', isConnected: true } as any)
    mockUseConnect.mockReturnValue({ connect: vi.fn(), connectors: [] } as any)
    mockUseDisconnect.mockReturnValue({ disconnect: vi.fn() } as any)

    render(<ConnectWallet />)
    expect(screen.getByText('Disconnect')).toHaveClass('ui-press')
  })

  it('lets the user pick a specific wallet when more than one is detected (EIP-6963 multi-wallet)', () => {
    const connect = vi.fn()
    const metaMask = { uid: 'a', id: 'metaMask', name: 'MetaMask' }
    const rabby = { uid: 'b', id: 'rabby', name: 'Rabby Wallet' }
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseConnect.mockReturnValue({ connect, connectors: [metaMask, rabby] } as any)
    mockUseDisconnect.mockReturnValue({ disconnect: vi.fn() } as any)

    render(<ConnectWallet />)

    // Neither wallet name should be visible until the user opens the picker.
    expect(screen.queryByText('MetaMask')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Connect Wallet'))

    expect(screen.getByText('MetaMask')).toBeInTheDocument()
    expect(screen.getByText('Rabby Wallet')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Rabby Wallet'))
    expect(connect).toHaveBeenCalledWith({ connector: rabby })
  })

  it('gives each wallet option in the picker a visible keyboard focus ring', () => {
    const metaMask = { uid: 'a', id: 'metaMask', name: 'MetaMask' }
    const rabby = { uid: 'b', id: 'rabby', name: 'Rabby Wallet' }
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseConnect.mockReturnValue({ connect: vi.fn(), connectors: [metaMask, rabby] } as any)
    mockUseDisconnect.mockReturnValue({ disconnect: vi.fn() } as any)

    render(<ConnectWallet />)
    fireEvent.click(screen.getByText('Connect Wallet'))

    expect(screen.getByText('MetaMask')).toHaveClass('ui-press')
    expect(screen.getByText('Rabby Wallet')).toHaveClass('ui-press')
  })

  it('prefers named EIP-6963 wallets over the generic "injected" connector when both are available', () => {
    const connect = vi.fn()
    const generic = { uid: 'a', id: 'injected', name: 'Injected' }
    const metaMask = { uid: 'b', id: 'metaMask', name: 'MetaMask' }
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseConnect.mockReturnValue({ connect, connectors: [generic, metaMask] } as any)
    mockUseDisconnect.mockReturnValue({ disconnect: vi.fn() } as any)

    render(<ConnectWallet />)

    // Only one named wallet is available once the generic entry is filtered out,
    // so it connects directly instead of showing a picker.
    fireEvent.click(screen.getByText('Connect Wallet'))
    expect(connect).toHaveBeenCalledWith({ connector: metaMask })
  })
})
