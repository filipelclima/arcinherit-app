import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useReadContract, useSwitchChain } from 'wagmi'
import Home from './page'
import { ARC_TESTNET } from '@/lib/contract'
import { ThemeProvider } from './hooks/useTheme'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
  useConnect: vi.fn(() => ({ connect: vi.fn(), connectors: [] })),
  useDisconnect: vi.fn(() => ({ disconnect: vi.fn() })),
  useSwitchChain: vi.fn(() => ({ switchChain: vi.fn(), status: 'idle' })),
  // Needed once the "connected" branch of Home renders CreateVault/CheckIn/Deposit,
  // which is now exercised by the wrong-network tests below (isConnected: true).
  useWriteContract: vi.fn(() => ({ writeContract: vi.fn(), data: undefined, isPending: false })),
  useWaitForTransactionReceipt: vi.fn(() => ({ isLoading: false, isSuccess: false })),
}))

const mockUseAccount = vi.mocked(useAccount)
const mockUseReadContract = vi.mocked(useReadContract)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

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

  it('gives the "How it works" toggle a visible keyboard focus ring', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)

    render(<Home />)

    expect(screen.getByRole('button', { name: 'How it works' })).toHaveClass('ui-press')
  })

  it('shows the Heirloom logo image next to the wordmark in the header', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)

    render(<Home />)

    const logo = screen.getByTestId('header-logo-icon')
    expect(logo.tagName).toBe('IMG')
    expect(logo).toHaveAttribute('src', '/heirloom-icon.png')
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

  it('smooth-scrolls to the Hero\'s "How it works" section when the guide is opened, but not when it\'s closed again', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})

    render(<Home />)

    fireEvent.click(screen.getByRole('button', { name: 'How it works' }))
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    // It scrolled the Hero's own section, not some other element.
    expect(scrollIntoView.mock.instances[0]).toHaveAttribute('id', 'how-it-works')

    fireEvent.click(screen.getByRole('button', { name: 'Hide guide' }))
    expect(scrollIntoView).toHaveBeenCalledTimes(1) // still just the one call from opening

    scrollIntoView.mockRestore()
  })

  it('scrolls instantly instead of smoothly when the user prefers reduced motion', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))

    render(<Home />)
    fireEvent.click(screen.getByRole('button', { name: 'How it works' }))

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })

    scrollIntoView.mockRestore()
    vi.unstubAllGlobals()
  })

  it('does not throw when opened while connected, where the Hero (and its "How it works" section) never renders', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: ARC_TESTNET.id } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain: vi.fn(), status: 'idle' } as any)
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})

    render(<Home />)

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'How it works' }))).not.toThrow()
    expect(scrollIntoView).not.toHaveBeenCalled()

    scrollIntoView.mockRestore()
  })
})

describe('Wrong network handling (connect-time chain enforcement)', () => {
  it('automatically requests a switch to Arc Testnet as soon as a wallet connects on the wrong chain', () => {
    const switchChain = vi.fn()
    // 42161 = Arbitrum — the reported bug: connecting while active on any chain other than
    // Arc Testnet, including one this app never configures in lib/wagmi.ts.
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: 42161 } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain, status: 'idle' } as any)

    render(<Home />)

    expect(switchChain).toHaveBeenCalledWith({ chainId: ARC_TESTNET.id })
  })

  it('shows a persistent "wrong network" banner that manually retries the switch on click', () => {
    const switchChain = vi.fn()
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: 42161 } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain, status: 'idle' } as any)

    render(<Home />)

    const banner = screen.getByTestId('wrong-network-banner')
    expect(banner).toHaveTextContent('Wrong network')
    switchChain.mockClear() // clear the automatic call from mount so we isolate the click

    fireEvent.click(banner)
    expect(switchChain).toHaveBeenCalledWith({ chainId: ARC_TESTNET.id })
  })

  it('does not show the banner or request a switch when already on Arc Testnet', () => {
    const switchChain = vi.fn()
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: ARC_TESTNET.id } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain, status: 'idle' } as any)

    render(<Home />)

    expect(screen.queryByTestId('wrong-network-banner')).not.toBeInTheDocument()
    expect(switchChain).not.toHaveBeenCalled()
  })

  it('does not request a switch while disconnected, even if the reported chain differs from Arc Testnet', () => {
    const switchChain = vi.fn()
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false, chainId: 42161 } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain, status: 'idle' } as any)

    render(<Home />)

    expect(screen.queryByTestId('wrong-network-banner')).not.toBeInTheDocument()
    expect(switchChain).not.toHaveBeenCalled()
  })
})

describe('Connected screens: tabs and content transitions', () => {
  function renderConnected() {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: ARC_TESTNET.id } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain: vi.fn(), status: 'idle' } as any)
    return render(<Home />)
  }

  it('labels the tabs with SVG icons and plain text, not emoji, and gives them press feedback', () => {
    renderConnected()

    for (const name of ['My Vault', 'Claim']) {
      const tab = screen.getByRole('button', { name })
      expect(tab.querySelector('svg')).not.toBeNull()
      expect(tab).toHaveClass('ui-press')
    }
    expect(document.body.textContent).not.toMatch(/[🔐🧬]/u)
  })

  it('switches between the owner screen and the claim screen, mounting the new card fresh (which is what triggers its fade-in)', () => {
    renderConnected()

    // Owner tab (no vault yet): the create-vault card is showing.
    expect(screen.getByText('Set up your inheritance vault')).toBeInTheDocument()
    expect(screen.queryByText('For heirs')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Claim' }))
    const claimCard = screen.getByText('For heirs').closest('.ui-card')
    expect(claimCard).toHaveClass('ui-enter')
    expect(screen.queryByText('Set up your inheritance vault')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'My Vault' }))
    expect(screen.getByText('Set up your inheritance vault').closest('.ui-card')).toHaveClass('ui-enter')
    expect(screen.queryByText('For heirs')).not.toBeInTheDocument()
  })

  it('marks the active tab with the Arc gradient and leaves the other one plain', () => {
    renderConnected()

    expect(screen.getByRole('button', { name: 'My Vault' }).style.background).toContain('linear-gradient')
    expect(screen.getByRole('button', { name: 'Claim' }).style.background).not.toContain('linear-gradient')

    fireEvent.click(screen.getByRole('button', { name: 'Claim' }))
    expect(screen.getByRole('button', { name: 'Claim' }).style.background).toContain('linear-gradient')
    expect(screen.getByRole('button', { name: 'My Vault' }).style.background).not.toContain('linear-gradient')
  })

  it('shows a neutral skeleton — never the "create a vault" form — while it is still finding out whether this wallet already has a vault', () => {
    // Regression: hasVault was derived from `data` alone, so while the read was loading (data
    // undefined) it fell through to the "no vault" branch and flashed the CreateVault form at every
    // existing-vault owner, for as long as the read took to resolve.
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: ARC_TESTNET.id } as any)
    mockUseReadContract.mockReturnValue({ data: undefined, isLoading: true } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain: vi.fn(), status: 'idle' } as any)

    render(<Home />)

    expect(screen.getByTestId('vault-status-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('Set up your inheritance vault')).not.toBeInTheDocument()
    expect(screen.queryByText('Your Vault')).not.toBeInTheDocument()
  })
})

describe('Verified contract badge', () => {
  it('shows a "Verified on Arcscan" badge in the footer, linking to the contract\'s verified code, in a new tab', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)

    render(<Home />)

    const badges = screen.getAllByTestId('verified-contract-badge')
    expect(badges.length).toBeGreaterThan(0)
    for (const badge of badges) {
      expect(badge).toHaveAttribute(
        'href',
        'https://testnet.arcscan.app/address/0xdb7875DBfDe3A5C4763C11eF15f972C26E3D8818?tab=contract',
      )
      expect(badge).toHaveAttribute('target', '_blank')
      expect(badge).toHaveAttribute('rel', expect.stringContaining('noopener'))
    }
  })

  it('shows the badge on the "Do I need to trust Heirloom?" FAQ answer as well as the footer, while disconnected', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)

    render(<Home />)

    // One in the FAQ answer, one in the footer.
    expect(screen.getAllByTestId('verified-contract-badge')).toHaveLength(2)
  })

  it('still shows the footer badge once connected (the FAQ itself is landing-page-only)', () => {
    mockUseAccount.mockReturnValue({ address: '0x1111111111111111111111111111111111111111', isConnected: true, chainId: ARC_TESTNET.id } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain: vi.fn(), status: 'idle' } as any)

    render(<Home />)

    expect(screen.getAllByTestId('verified-contract-badge')).toHaveLength(1)
  })
})

describe('Footer links', () => {
  it('links to both the frontend repo and the contract repo, each in a new tab', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)

    render(<Home />)

    const frontend = screen.getByRole('link', { name: 'Frontend ↗' })
    expect(frontend).toHaveAttribute('href', 'https://github.com/filipelclima/arcinherit-app')
    expect(frontend).toHaveAttribute('target', '_blank')

    const contract = screen.getByRole('link', { name: 'Contract ↗' })
    expect(contract).toHaveAttribute('href', 'https://github.com/filipelclima/ArcInherit')
    expect(contract).toHaveAttribute('target', '_blank')
  })
})

describe('FAQ scroll reveal', () => {
  it('marks the "Common questions" card for scroll-reveal', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)

    render(<Home />)

    const faqCard = screen.getByText('Common questions').closest('div')!.parentElement!
    expect(faqCard).toHaveClass('scroll-reveal')
  })
})

describe('Theme toggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  function renderDisconnected() {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    return render(<ThemeProvider><Home /></ThemeProvider>)
  }

  it('shows a sun/moon toggle in the header, next to "How it works" and "Connect Wallet"', () => {
    renderDisconnected()

    const toggle = screen.getByTestId('theme-toggle')
    expect(toggle).toBeInTheDocument()
    expect(toggle.querySelector('svg')).not.toBeNull()

    const header = screen.getByRole('button', { name: 'How it works' }).parentElement
    expect(header?.contains(toggle)).toBe(true)
  })

  it('switches the app to dark mode when clicked, and back to light on a second click', () => {
    renderDisconnected()

    const toggle = screen.getByTestId('theme-toggle')
    expect(toggle).toHaveAttribute('aria-label', 'Switch to dark mode')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    fireEvent.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(toggle).toHaveAttribute('aria-label', 'Switch to light mode')
    expect(localStorage.getItem('heirloom-theme')).toBe('dark')

    fireEvent.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(toggle).toHaveAttribute('aria-label', 'Switch to dark mode')
  })
})
