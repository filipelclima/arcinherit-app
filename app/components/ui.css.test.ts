import { describe, expect, it } from 'vitest'
import { findAtBlocks, readCss, removeBlocks, rulesFor } from './cssTestUtils'

// ui.css owns the interaction polish of the functional screens. jsdom can't run :hover / :active /
// animations, so these tests lock in the rules that keep that polish safe: nothing moves layout,
// hover never sticks on touch, disabled buttons never react to a press, motion is opt-in.

const css = readCss('ui.css')
const keyframes = findAtBlocks(css, 'keyframes')
const media = findAtBlocks(css, 'media')
const noPreference = media.filter(b => /prefers-reduced-motion:\s*no-preference/.test(b.header))
const hoverOnly = media.filter(b => /hover:\s*hover/.test(b.header))
const base = removeBlocks(css, [...keyframes, ...media])

describe('ui.css card hover', () => {
  it('fades a shadow in on hover with a box-shadow transition, and does nothing else', () => {
    expect(rulesFor(base, '.ui-card').join('')).toMatch(/transition:\s*box-shadow/)
    expect(rulesFor(base, '.ui-card-sm').join('')).toMatch(/transition:\s*box-shadow/)

    expect(hoverOnly).toHaveLength(1)
    const hover = hoverOnly[0].body
    expect(hover).toMatch(/\.ui-card:hover\s*\{[^}]*box-shadow:/)
    expect(hover).toMatch(/\.ui-card-sm:hover\s*\{[^}]*box-shadow:/)
    // Shadow only: a translate on hover would shift the layout under the cursor.
    expect(hover).not.toMatch(/transform|margin|padding|top:|left:|width|height/)
  })

  it('only applies hover effects on devices that can actually hover, so taps never leave a stuck shadow', () => {
    expect(base).not.toMatch(/:hover/)
  })
})

describe('ui.css button press', () => {
  it('scales down and darkens the pressed button, but never a disabled one', () => {
    const press = rulesFor(base, '.ui-press:active:not(:disabled)').join('')
    expect(press).toMatch(/transform:\s*scale\(0\.9\d?\)/)
    expect(press).toMatch(/filter:\s*brightness\(/)
    // No un-guarded :active rule may exist.
    expect(base.match(/\.ui-press:active(?!:not\(:disabled\))/g)).toBeNull()
  })

  it('keeps the global hover opacity animated (the press transition list must still include opacity)', () => {
    expect(rulesFor(base, '.ui-press').join('')).toMatch(/transition:[^;]*opacity/)
  })

  it('shows a visible focus ring for keyboard users', () => {
    expect(rulesFor(base, '.ui-press:focus-visible').join('')).toMatch(/outline:\s*2px solid/)
  })
})

describe('ui.css focus ring (non-button interactive elements)', () => {
  it('gives .ui-focus-ring the same focus-visible outline as .ui-press, for things like the Tooltip trigger that are not a press button', () => {
    const press = rulesFor(base, '.ui-press:focus-visible').join('')
    const ring = rulesFor(base, '.ui-focus-ring:focus-visible').join('')
    expect(ring).toMatch(/outline:\s*2px solid/)
    expect(ring).toBe(press)
  })
})

describe('ui.css skeleton loading', () => {
  it('pulses opacity only, gated behind the same single prefers-reduced-motion: no-preference block as the entrance animation', () => {
    expect(noPreference).toHaveLength(1)
    expect(noPreference[0].body).toMatch(/\.ui-skeleton\s*\{\s*animation:\s*ui-skeleton-pulse/)

    const pulseKeyframe = keyframes.find(k => k.header === 'ui-skeleton-pulse')
    expect(pulseKeyframe).toBeDefined()
    expect(Array.from(pulseKeyframe!.body.matchAll(/([a-z-]+)\s*:/g)).map(m => m[1])).toEqual(['opacity', 'opacity'])
  })

  it('is a plain static block outside the no-preference media query (the reduced-motion state)', () => {
    expect(base).not.toMatch(/\.ui-skeleton\s*\{[^}]*animation/)
  })
})

describe('ui.css entrance', () => {
  it('runs the entrance animation only inside the prefers-reduced-motion: no-preference block', () => {
    expect(noPreference).toHaveLength(1)
    expect(noPreference[0].body).toMatch(/\.ui-enter\s*\{\s*animation:\s*ui-enter/)
    expect(removeBlocks(css, [...keyframes, ...noPreference])).not.toMatch(/animation/)
  })

  it('only fades and nudges (opacity / transform) — never anything that moves layout', () => {
    const allowed = new Set(['opacity', 'transform'])
    expect(keyframes.length).toBeGreaterThan(0)
    for (const k of keyframes) {
      const props = Array.from(k.body.matchAll(/([a-z-]+)\s*:/g)).map(m => m[1])
      props.forEach(p => expect(allowed, `@keyframes ${k.header} animates "${p}"`).toContain(p))
    }
  })
})
