import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useReadContract } from 'wagmi'
import Home from './page'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
  useConnect: vi.fn(() => ({ connect: vi.fn(), connectors: [] })),
  useDisconnect: vi.fn(() => ({ disconnect: vi.fn() })),
}))

const mockUseAccount = vi.mocked(useAccount)
const mockUseReadContract = vi.mocked(useReadContract)

describe('Home header', () => {
  it('wraps the header groups instead of squeezing button text onto multiple lines on narrow screens', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)

    render(<Home />)

    const howItWorksButton = screen.getByRole('button', { name: 'How it works' })
    expect(howItWorksButton).toHaveStyle({ whiteSpace: 'nowrap' })

    const rightGroup = howItWorksButton.parentElement
    const header = rightGroup?.parentElement
    expect(header).toHaveStyle({ flexWrap: 'wrap' })
  })

  it('shows the ArcInherit logo image next to the wordmark in the header', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)

    render(<Home />)

    const logo = screen.getByTestId('header-logo-icon')
    expect(logo.tagName).toBe('IMG')
    expect(logo).toHaveAttribute('src', '/arcinherit-icon.png')
  })

  it('toggles the "How it works" guide on the landing page (disconnected) when the header button is clicked', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)

    render(<Home />)

    // Hidden by default — this is the exact bug: the guide used to always render here,
    // regardless of showHowItWorks, on the disconnected/landing page.
    expect(screen.queryByText('Create your vault')).not.toBeInTheDocument()

    const toggleButton = screen.getByRole('button', { name: 'How it works' })
    fireEvent.click(toggleButton)
    expect(screen.getByText('Create your vault')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide guide' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hide guide' }))
    expect(screen.queryByText('Create your vault')).not.toBeInTheDocument()
  })
})
