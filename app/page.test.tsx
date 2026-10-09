import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useReadContract, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi'
import Home from './page'
import { ARC_TESTNET, CONTRACT_ADDRESS, LEGACY_CONTRACT_ADDRESS } from '@/lib/contract'
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

// LegacyVault and Deposit refresh reads through the query client after a tx.
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

const mockUseAccount = vi.mocked(useAccount)
const mockUseReadContract = vi.mocked(useReadContract)
const mockUseSwitchChain = vi.mocked(useSwitchChain)
const mockUseWaitForTransactionReceipt = vi.mocked(useWaitForTransactionReceipt)

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
  it('shows a "Verified on Arc Explorer" badge in the footer, linking to the v2 contract\'s verified code on the new explorer, in a new tab', () => {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)

    render(<Home />)

    const badges = screen.getAllByTestId('verified-contract-badge')
    expect(badges.length).toBeGreaterThan(0)
    for (const badge of badges) {
      expect(badge).toHaveTextContent('Verified on Arc Explorer')
      expect(badge).toHaveAttribute(
        'href',
        'https://explorer.testnet.arc.io/address/0x31C6962393e002845a647bB22e21c6B219eF7F16?tab=contract',
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

describe('Owner tab: v2 vaults and legacy (v1) vaults', () => {
  const OWNER = '0x1111111111111111111111111111111111111111'
  const activeVault = [BigInt(365 * 86400), BigInt(30 * 86400), BigInt(Math.floor(Date.now() / 1000)), true, [{ wallet: '0x2222222222222222222222222222222222222222', percentage: 100 }]]
  const noVault = [0n, 0n, 0n, false, []]

  // Each contract answers getVault for its own vault; everything else is empty.
  function renderOwner({ v2, v1 }: { v2: boolean; v1: boolean }) {
    mockUseAccount.mockReturnValue({ address: OWNER, isConnected: true, chainId: ARC_TESTNET.id } as any)
    mockUseSwitchChain.mockReturnValue({ switchChain: vi.fn(), status: 'idle' } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      if (params.functionName === 'getVault') {
        if (params.address === CONTRACT_ADDRESS) return { data: v2 ? activeVault : noVault, isLoading: false }
        if (params.address === LEGACY_CONTRACT_ADDRESS) return { data: v1 ? activeVault : noVault, isLoading: false }
      }
      if (params.functionName === 'getBalances') return { data: [], isLoading: false }
      return { data: undefined }
    }) as any)
    return render(<Home />)
  }

  afterEach(() => {
    mockUseWaitForTransactionReceipt.mockImplementation((() => ({ isLoading: false, isSuccess: false })) as any)
  })

  it('reads the owner\'s vault on both contracts', () => {
    mockUseReadContract.mockClear()
    renderOwner({ v2: false, v1: false })

    const vaultReads = mockUseReadContract.mock.calls.map(c => c[0] as any).filter(p => p.functionName === 'getVault')
    expect(vaultReads.map(p => p.address)).toEqual(expect.arrayContaining([CONTRACT_ADDRESS, LEGACY_CONTRACT_ADDRESS]))
  })

  it('shows the create form (on v2) when the owner has no vault on either contract', () => {
    renderOwner({ v2: false, v1: false })

    expect(screen.getByText('Set up your inheritance vault')).toBeInTheDocument()
    expect(screen.queryByTestId('legacy-vault-notice')).not.toBeInTheDocument()
  })

  it('shows a v2 vault as usual, with check-in and deposit, and no legacy notice', () => {
    renderOwner({ v2: true, v1: false })

    expect(screen.getByText('Your Vault')).toBeInTheDocument()
    expect(screen.getByText('Deposit Tokens')).toBeInTheDocument()
    expect(screen.queryByTestId('legacy-vault-notice')).not.toBeInTheDocument()
  })

  it('shows a v1-only owner their legacy vault with a notice and the guided move, keeps check-in, and hides deposit and the create form', () => {
    renderOwner({ v2: false, v1: true })

    const notice = screen.getByTestId('legacy-vault-notice')
    expect(notice).toHaveTextContent('Legacy vault')
    expect(notice).toHaveTextContent('Move to the current contract in two steps')
    expect(screen.getByRole('button', { name: 'Step 1: Cancel legacy vault' })).toBeInTheDocument()

    expect(screen.getByText('Your Vault')).toBeInTheDocument()
    expect(screen.getByText('Check in — I am alive')).toBeInTheDocument()
    expect(screen.queryByText('Deposit Tokens')).not.toBeInTheDocument()
    expect(screen.queryByText('Set up your inheritance vault')).not.toBeInTheDocument()
  })

  it('shows an owner with vaults on both contracts their v2 vault plus a notice to close the legacy one', () => {
    renderOwner({ v2: true, v1: true })

    expect(screen.getByTestId('legacy-vault-notice')).toHaveTextContent('You also have a legacy vault')
    expect(screen.getByRole('button', { name: 'Cancel legacy vault' })).toBeInTheDocument()
    expect(screen.getByText('Deposit Tokens')).toBeInTheDocument()
  })

  it('after step 1 (legacy vault cancelled), shows step 2: a "step 1 done" message above the v2 create form', () => {
    // The cancel tx confirms while the legacy vault is still showing...
    mockUseWaitForTransactionReceipt.mockImplementation((() => ({ isLoading: false, isSuccess: true })) as any)
    const { rerender } = renderOwner({ v2: false, v1: true })

    // ...then the refreshed read says v1 is no longer active.
    mockUseWaitForTransactionReceipt.mockImplementation((() => ({ isLoading: false, isSuccess: false })) as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      if (params.functionName === 'getVault') return { data: noVault, isLoading: false }
      return { data: undefined }
    }) as any)
    rerender(<Home />)

    expect(screen.getByTestId('legacy-cancelled-message')).toHaveTextContent('Step 1 done')
    expect(screen.getByText('Set up your inheritance vault')).toBeInTheDocument()
    expect(screen.queryByTestId('legacy-vault-notice')).not.toBeInTheDocument()
  })

  it('waits for both reads before deciding what to show', () => {
    mockUseAccount.mockReturnValue({ address: OWNER, isConnected: true, chainId: ARC_TESTNET.id } as any)
    mockUseReadContract.mockImplementation(((params: any) => {
      if (params.functionName === 'getVault' && params.address === LEGACY_CONTRACT_ADDRESS) return { data: undefined, isLoading: true }
      if (params.functionName === 'getVault') return { data: noVault, isLoading: false }
      return { data: undefined }
    }) as any)
    render(<Home />)

    expect(screen.getByTestId('vault-status-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('Set up your inheritance vault')).not.toBeInTheDocument()
  })
})

describe('FAQ (v2)', () => {
  function renderLanding() {
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any)
    mockUseReadContract.mockReturnValue({ data: undefined } as any)
    return render(<Home />)
  }

  it('explains that claim order does not matter', () => {
    renderLanding()
    expect(screen.getByText('If I have several heirs, does it matter who claims first?')).toBeInTheDocument()
    expect(document.body.textContent).toMatch(/whatever order they claim in/)
  })

  it('scopes the claim-order answer to the current contract, since v1 vaults lack the fix', () => {
    renderLanding()
    const answer = screen.getByText('If I have several heirs, does it matter who claims first?').nextElementSibling!
    expect(answer.textContent).toMatch(/^Not for vaults on the current contract\./)
    expect(answer.textContent).toMatch(/original contract don't have this fix/)
    expect(answer.textContent).toMatch(/heirs who claim later receive less/)
  })

  it('explains claim rounds when the owner checks in after a claim', () => {
    renderLanding()
    expect(document.body.textContent).toMatch(/they keep what they claimed: your check-in closes claims again and starts a new claim round/)
    // The old answer said check-in only works "as long as heirs haven't claimed yet" — no longer true.
    expect(document.body.textContent).not.toMatch(/as long as heirs haven't claimed yet/)
  })

  it('tells owners of vaults on the original contract what to do', () => {
    renderLanding()
    expect(screen.getByText('I created my vault on the original contract. What should I do?')).toBeInTheDocument()
  })

  it('links the footer contract address to v2 on explorer.testnet.arc.io, never testnet.arcscan.app', () => {
    renderLanding()
    const footerLink = screen.getByRole('link', { name: /0x31C69623\.\.\.eF7F16/ })
    expect(footerLink).toHaveAttribute('href', 'https://explorer.testnet.arc.io/address/0x31C6962393e002845a647bB22e21c6B219eF7F16')
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href') ?? '').not.toContain('arcscan')
    }
  })
})
