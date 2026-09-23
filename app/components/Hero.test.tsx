import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Hero } from './Hero'

// Hero embeds ConnectWallet, which needs these three wagmi hooks (disconnected state).
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: undefined, isConnected: false })),
  useConnect: vi.fn(() => ({ connect: vi.fn(), connectors: [{ id: 'injected' }] })),
  useDisconnect: vi.fn(() => ({ disconnect: vi.fn() })),
}))

describe('Hero', () => {
  it('keeps the headline, subtitle and connect CTA', () => {
    render(<Hero />)

    expect(screen.getByText('Built on Arc')).toBeInTheDocument()
    expect(screen.getByText('Your heirs.')).toBeInTheDocument()
    expect(screen.getByText(/Set up an onchain inheritance vault in minutes/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect Wallet' })).toBeInTheDocument()
  })

  it('shows the non-custodial / immutable / fee facts as stat cards instead of a single text line', () => {
    render(<Hero />)

    const cards = screen.getAllByTestId('hero-stat-card')
    expect(cards).toHaveLength(3)
    expect(within(cards[0]).getByText('Non-custodial')).toBeInTheDocument()
    expect(within(cards[1]).getByText('Immutable')).toBeInTheDocument()
    expect(within(cards[2]).getByText('<$0.01')).toBeInTheDocument()
    expect(within(cards[2]).getByText('per transaction')).toBeInTheDocument()

    // The old tagline this replaces must be gone.
    expect(screen.queryByText(/Built on Arc · Non-custodial · Immutable/)).not.toBeInTheDocument()
  })

  it('shows three feature cards summarising how it works, each with an icon chip', () => {
    render(<Hero />)

    const cards = screen.getAllByTestId('hero-feature-card')
    expect(cards).toHaveLength(3)
    expect(within(cards[0]).getByText('Check in periodically')).toBeInTheDocument()
    expect(within(cards[1]).getByText('Add your heirs')).toBeInTheDocument()
    expect(within(cards[2]).getByText('Automatic claim')).toBeInTheDocument()
    cards.forEach(card => expect(card.querySelector('svg')).not.toBeNull())
  })

  it('labels the feature cards with a small uppercase "How it works" kicker that sits between the two card groups', () => {
    render(<Hero />)

    const kicker = screen.getByTestId('hero-features-kicker')
    expect(kicker).toHaveTextContent('How it works')
    // Read the inline style directly: jest-dom's toHaveStyle goes through jsdom's getComputedStyle,
    // which doesn't resolve text-transform / letter-spacing.
    expect(kicker.style.textTransform).toBe('uppercase')
    expect(kicker.style.letterSpacing).toBe('0.12em')

    // DOM order: stat cards, then the kicker, then the feature cards it introduces.
    const lastStat = screen.getAllByTestId('hero-stat-card')[2]
    const firstFeature = screen.getAllByTestId('hero-feature-card')[0]
    expect(lastStat.compareDocumentPosition(kicker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(kicker.compareDocumentPosition(firstFeature) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('replaces the static logo with the animated vault -> heir scene', () => {
    render(<Hero />)

    expect(screen.getByTestId('hero-scene')).toBeInTheDocument()
    expect(screen.queryByTestId('hero-anchor-icon')).not.toBeInTheDocument()
  })

  it('reads text-first: badge, headline, pitch and the CTA all come before the animated scene, which comes before the stat cards', () => {
    render(<Hero />)

    const badge = screen.getByText('Built on Arc')
    const pitch = screen.getByText(/Set up an onchain inheritance vault in minutes/)
    const cta = screen.getByRole('button', { name: 'Connect Wallet' })
    const scene = screen.getByTestId('hero-scene')
    const firstStatCard = screen.getAllByTestId('hero-stat-card')[0]

    const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(before(badge, pitch)).toBe(true)
    expect(before(pitch, cta)).toBe(true)
    expect(before(cta, scene)).toBe(true)
    expect(before(scene, firstStatCard)).toBe(true)
  })

  it('renders the network texture as a decorative, non-interactive layer behind the whole Hero', () => {
    render(<Hero />)

    const network = screen.getByTestId('hero-network')
    expect(network).toHaveAttribute('aria-hidden', 'true')
    expect(network).toHaveStyle({ pointerEvents: 'none', position: 'absolute' })
    // It replaced the old dotted texture: the two must not be stacked.
    expect(screen.queryByTestId('hero-dot-pattern')).not.toBeInTheDocument()
  })
})
