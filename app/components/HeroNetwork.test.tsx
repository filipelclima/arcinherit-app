import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeroNetwork } from './HeroNetwork'

function snapshotOf(container: HTMLElement) {
  return container.querySelector('svg')!.outerHTML
}

describe('HeroNetwork', () => {
  it('draws a web of nodes joined by lines, as a purely decorative layer', () => {
    render(<HeroNetwork />)

    const layer = screen.getByTestId('hero-network')
    expect(layer).toHaveAttribute('aria-hidden', 'true')
    expect(layer).toHaveStyle({ position: 'absolute', pointerEvents: 'none' })

    // 6 x 9 grid of nodes, plus plenty of lines between neighbours.
    expect(layer.querySelectorAll('g[fill="rgba(10, 10, 10, 0.12)"] circle')).toHaveLength(54)
    expect(layer.querySelectorAll('line').length).toBeGreaterThan(60)
  })

  it('only ever joins nodes that exist, using percentage coordinates inside the box', () => {
    render(<HeroNetwork />)

    const values = Array.from(screen.getByTestId('hero-network').querySelectorAll('line, circle'))
      .flatMap(el => ['x1', 'y1', 'x2', 'y2', 'cx', 'cy'].map(attr => el.getAttribute(attr)))
      .filter((v): v is string => v !== null)

    expect(values.length).toBeGreaterThan(0)
    for (const v of values) {
      expect(v).toMatch(/^\d+(\.\d)?%$/)
      expect(parseFloat(v)).toBeGreaterThanOrEqual(0)
      expect(parseFloat(v)).toBeLessThanOrEqual(100)
    }
  })

  it('gives a handful of nodes a faint pulse halo, each with its own duration and delay so they never blink in unison', () => {
    render(<HeroNetwork />)

    const pulses = Array.from(screen.getByTestId('hero-network').querySelectorAll<SVGCircleElement>('.hero-net-pulse'))
    expect(pulses).toHaveLength(7)

    const timings = pulses.map(p => `${p.style.getPropertyValue('--pulse-duration')}/${p.style.getPropertyValue('--pulse-delay')}`)
    expect(new Set(timings).size).toBeGreaterThan(1)
    timings.forEach(t => expect(t).toMatch(/^\d+(\.\d)?s\/-?\d+(\.\d)?s$/))
  })

  it('is fully deterministic, so server and client render the same layout (no hydration mismatch)', () => {
    const first = render(<HeroNetwork />)
    const second = render(<HeroNetwork />)

    expect(snapshotOf(first.container)).toBe(snapshotOf(second.container))
  })
})
