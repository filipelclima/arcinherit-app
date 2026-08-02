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
})
