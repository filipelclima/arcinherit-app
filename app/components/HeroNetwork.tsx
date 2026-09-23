import type { CSSProperties } from 'react'
import { COLOR_ACCENT } from '@/lib/theme'

// A very faint web of nodes joined by hairlines, behind the whole Hero. Deliberately close to
// invisible: it should read as a "blockchain-ish" depth cue, never compete with the animated scene
// or the cards. Neutral near-black (same as COLOR_TEXT_PRIMARY) at low alpha, with the navy accent
// only on the rare pulse.
const LINE_COLOR = 'rgba(10, 10, 10, 0.06)'
const NODE_COLOR = 'rgba(10, 10, 10, 0.12)'
const FADE_MASK = 'radial-gradient(ellipse 90% 85% at 50% 40%, #000 30%, transparent 100%)'

const COLS = 6
const ROWS = 9
const PULSING_NODES = 7

// Small seeded PRNG: the layout has to be identical on the server and the client (no hydration
// mismatch) and across reloads, so Math.random() is out.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10

type Point = { x: number; y: number }

function buildNetwork() {
  const rand = mulberry32(20260921)

  // Jittered grid: every node stays inside its own cell, so nodes spread evenly without clumping,
  // but the layout still doesn't look like a lattice.
  const nodes: Point[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      nodes.push({
        x: round1(((c + 0.5 + (rand() - 0.5) * 0.7) / COLS) * 100),
        y: round1(((r + 0.5 + (rand() - 0.5) * 0.7) / ROWS) * 100),
      })
    }
  }

  // Edges only join neighbouring cells (right, down, and occasional diagonals), with a few dropped
  // at random so the web has gaps.
  const at = (r: number, c: number) => r * COLS + c
  const edges: [number, number][] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS && rand() > 0.12) edges.push([at(r, c), at(r, c + 1)])
      if (r + 1 < ROWS && rand() > 0.12) edges.push([at(r, c), at(r + 1, c)])
      if (r + 1 < ROWS && c + 1 < COLS && rand() < 0.35) edges.push([at(r, c), at(r + 1, c + 1)])
      if (r + 1 < ROWS && c > 0 && rand() < 0.25) edges.push([at(r, c), at(r + 1, c - 1)])
    }
  }

  // A handful of nodes get a soft halo that blinks once per (long, staggered) cycle.
  const pulses = Array.from({ length: PULSING_NODES }, () => ({
    node: Math.floor(rand() * nodes.length),
    duration: round1(7 + rand() * 5),
    delay: -round1(rand() * 10),
  }))

  return { nodes, edges, pulses }
}

const network = buildNetwork()

export function HeroNetwork() {
  return (
    <div
      aria-hidden="true"
      data-testid="hero-network"
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        WebkitMaskImage: FADE_MASK,
        maskImage: FADE_MASK,
      }}
    >
      {/* No viewBox on purpose: percentage coordinates stretch the web to whatever height the Hero
          has (short on desktop, very tall on phones) while circles stay round. */}
      <svg width="100%" height="100%" style={{ display: 'block' }}>
        <g stroke={LINE_COLOR} strokeWidth={1}>
          {network.edges.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={`${network.nodes[a].x}%`} y1={`${network.nodes[a].y}%`}
              x2={`${network.nodes[b].x}%`} y2={`${network.nodes[b].y}%`}
            />
          ))}
        </g>
        <g fill={NODE_COLOR}>
          {network.nodes.map((n, i) => (
            <circle key={i} cx={`${n.x}%`} cy={`${n.y}%`} r={2} />
          ))}
        </g>
        <g fill={COLOR_ACCENT}>
          {network.pulses.map((p, i) => (
            <circle
              key={i}
              className="hero-net-pulse"
              cx={`${network.nodes[p.node].x}%`} cy={`${network.nodes[p.node].y}%`} r={9}
              style={{ '--pulse-duration': `${p.duration}s`, '--pulse-delay': `${p.delay}s` } as CSSProperties}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
