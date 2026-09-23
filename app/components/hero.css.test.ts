import { describe, expect, it } from 'vitest'
import { findAtBlocks, readCss, removeBlocks, rulesFor } from './cssTestUtils'

// These tests read hero.css as text (jsdom doesn't run CSS animations) to lock in the two rules the
// Hero animation was built around: motion is opt-in (prefers-reduced-motion), and keyframes only
// touch cheap properties so the scene can't jank on weak devices.

const css = readCss('hero.css')

const keyframes = findAtBlocks(css, 'keyframes')
const noPreference = findAtBlocks(css, 'media').filter(b => /prefers-reduced-motion:\s*no-preference/.test(b.header))

describe('hero.css motion rules', () => {
  it('has keyframes and exactly one prefers-reduced-motion: no-preference block', () => {
    expect(keyframes.length).toBeGreaterThan(5)
    expect(noPreference).toHaveLength(1)
  })

  it('declares every animation inside the no-preference block, so motion is opt-in', () => {
    const outside = removeBlocks(css, [...keyframes, ...noPreference])

    expect(outside).not.toMatch(/animation/)
    expect(noPreference[0].body).toMatch(/animation:/)
  })

  it('only points animations at keyframes that exist', () => {
    const defined = new Set(keyframes.map(k => k.header))
    const used = Array.from(noPreference[0].body.matchAll(/animation:\s*([\w-]+)/g)).map(m => m[1])

    expect(used.length).toBeGreaterThan(5)
    used.forEach(name => expect(defined).toContain(name))
  })

  it('keeps keyframes to compositor-friendly properties (opacity, transform) plus stroke-dashoffset for the flowing line', () => {
    const allowed = new Set(['opacity', 'transform', 'stroke-dashoffset', 'animation-timing-function'])

    for (const k of keyframes) {
      const props = Array.from(k.body.matchAll(/([a-z-]+)\s*:/g)).map(m => m[1])
      expect(props.length).toBeGreaterThan(0)
      props.forEach(p => expect(allowed, `@keyframes ${k.header} animates "${p}"`).toContain(p))
    }
  })

  it('never animates layout-triggering properties anywhere', () => {
    const layoutProps = /(^|[^-])\b(width|height|top|left|right|bottom|margin|padding|inset|flex|font-size)\s*:/
    for (const k of keyframes) expect(k.body, `@keyframes ${k.header}`).not.toMatch(layoutProps)
  })
})

describe('hero.css static (reduced-motion) state', () => {
  const base = removeBlocks(css, [...keyframes, ...findAtBlocks(css, 'media')])

  it('shows the timer bar half drained', () => {
    expect(rulesFor(base, '.hero-bar-cover').some(b => /transform:\s*scaleX\(0\.5\)/.test(b))).toBe(true)
  })

  it('shows only the "timer runs down" caption', () => {
    expect(rulesFor(base, '.hero-cap').some(b => /opacity:\s*0/.test(b))).toBe(true)
    expect(rulesFor(base, '.hero-cap-b').some(b => /opacity:\s*1/.test(b))).toBe(true)
    expect(rulesFor(base, '.hero-cap-a').join('')).not.toMatch(/opacity:\s*1/)
    expect(rulesFor(base, '.hero-cap-c').join('')).not.toMatch(/opacity:\s*1/)
  })

  it('hides the token and the flowing line, keeps the vault locked, and keeps the network pulses dark', () => {
    expect(rulesFor(base, '.hero-token').some(b => /opacity:\s*0/.test(b))).toBe(true)
    expect(rulesFor(base, '.hero-flow-line').some(b => /opacity:\s*0/.test(b))).toBe(true)
    expect(rulesFor(base, '.hero-lock-b').some(b => /opacity:\s*0/.test(b))).toBe(true)
    expect(rulesFor(base, '.hero-heir-fill').some(b => /opacity:\s*0/.test(b))).toBe(true)
    expect(rulesFor(base, '.hero-net-pulse').some(b => /opacity:\s*0/.test(b))).toBe(true)
  })
})

describe('hero.css scene card', () => {
  const base = removeBlocks(css, [...keyframes, ...findAtBlocks(css, 'media')])

  it('blurs whatever sits behind the translucent card, with a Safari-prefixed fallback', () => {
    const rules = rulesFor(base, '.hero-scene-card').join(' ')
    expect(rules).toMatch(/(?<!-webkit-)backdrop-filter:\s*blur\(/)
    expect(rules).toMatch(/-webkit-backdrop-filter:\s*blur\(/)
  })
})
