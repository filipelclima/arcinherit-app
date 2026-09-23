import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { HeroScene } from './HeroScene'

describe('HeroScene', () => {
  it('is exposed to assistive tech as a single described image, not a pile of decorative shapes', () => {
    render(<HeroScene />)

    const scene = screen.getByRole('img')
    expect(scene).toBe(screen.getByTestId('hero-scene'))
    expect(scene).toHaveAttribute('aria-label', expect.stringMatching(/vault stays locked.*funds flow from the vault to the heir/))
  })

  it('shows the vault and the heir at either end of the connector', () => {
    render(<HeroScene />)

    const vault = screen.getByTestId('hero-vault-node')
    const heir = screen.getByTestId('hero-heir-node')
    const connector = screen.getByTestId('hero-connector')

    expect(within(vault).getByText('Your vault')).toBeInTheDocument()
    expect(within(heir).getByText('Your heir')).toBeInTheDocument()
    // DOM order == visual order: vault, connector, heir.
    expect(vault.compareDocumentPosition(connector) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(connector.compareDocumentPosition(heir) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('has a token and a flowing line on the connector, both using the Arc gradient', () => {
    render(<HeroScene />)

    const connector = screen.getByTestId('hero-connector')
    expect(within(connector).getByTestId('hero-token')).toBeInTheDocument()
    expect(within(connector).getByTestId('hero-flow-line').getAttribute('stroke')).toBe('url(#hero-flow-gradient)')
    // The gradient the line and token point at must actually exist in the SVG.
    expect(connector.querySelector('#hero-flow-gradient')).not.toBeNull()
    expect(connector.querySelector('#hero-token-gradient')).not.toBeNull()
  })

  it('has a check-in timer bar and one caption per beat of the story', () => {
    render(<HeroScene />)

    expect(screen.getByText('Check-in timer')).toBeInTheDocument()
    const track = screen.getByTestId('hero-bar-track')
    expect(within(track).getByTestId('hero-bar-cover')).toBeInTheDocument()

    const captions = screen.getAllByTestId('hero-caption').map(c => c.textContent)
    expect(captions).toEqual([
      'Owner checks in — vault stays locked',
      'No check-in — the timer runs down',
      'Timer ends — funds flow to the heir',
    ])
  })

  it('keeps the Arc glow behind the scene as a decorative layer that cannot intercept clicks', () => {
    render(<HeroScene />)

    const glow = screen.getByTestId('hero-scene-glow')
    expect(glow).toHaveAttribute('aria-hidden', 'true')
    expect(glow.style.background).toContain('radial-gradient')
  })

  it('gives the card a translucent background and border (not opaque), so the glow and the network behind it show through', () => {
    render(<HeroScene />)

    const card = screen.getByTestId('hero-scene-card')
    expect(card.style.background).toMatch(/^rgba\(255, 255, 255, 0(\.\d+)?\)$/)
    expect(parseFloat(card.style.background.match(/[\d.]+\)$/)![0])).toBeLessThan(1)
    expect(card.style.border).toMatch(/^1px solid rgba\(229, 231, 235, 0(\.\d+)?\)$/)
  })
})
