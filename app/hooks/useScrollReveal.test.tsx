import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { useScrollReveal } from './useScrollReveal'

// A minimal IntersectionObserver stand-in: records every instance so a test can reach in and fire
// its callback manually, the way a real observer would when the element crosses the viewport.
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  callback: IntersectionObserverCallback
  disconnected = false
  observed: Element[] = []

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }

  observe(el: Element) {
    this.observed.push(el)
  }

  unobserve() {}
  disconnect() { this.disconnected = true }

  fire(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}

// A real rendered element, ref attached the normal React way -- exercises the hook exactly as
// Hero.tsx / page.tsx use it, rather than poking at ref.current by hand.
function Probe() {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>()
  return <div ref={ref} data-testid="probe">{revealed ? 'revealed' : 'hidden'}</div>
}

describe('useScrollReveal', () => {
  afterEach(() => {
    MockIntersectionObserver.instances = []
    vi.unstubAllGlobals()
  })

  it('starts not revealed, and observes the element it is attached to', () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    render(<Probe />)

    expect(screen.getByTestId('probe')).toHaveTextContent('hidden')
    const observer = MockIntersectionObserver.instances.at(-1)!
    expect(observer.observed).toContain(screen.getByTestId('probe'))
  })

  it('flips to revealed once the element intersects, and disconnects so it never fires again', () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    render(<Probe />)

    const observer = MockIntersectionObserver.instances.at(-1)!
    act(() => observer.fire(true))

    expect(screen.getByTestId('probe')).toHaveTextContent('revealed')
    expect(observer.disconnected).toBe(true)
  })

  it('ignores a non-intersecting report and only reveals on an actual intersection', () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    render(<Probe />)

    const observer = MockIntersectionObserver.instances.at(-1)!
    act(() => observer.fire(false))
    expect(screen.getByTestId('probe')).toHaveTextContent('hidden')

    act(() => observer.fire(true))
    expect(screen.getByTestId('probe')).toHaveTextContent('revealed')
  })

  it('does not hide content forever when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(<Probe />)

    expect(screen.getByTestId('probe')).toHaveTextContent('revealed')
  })
})
