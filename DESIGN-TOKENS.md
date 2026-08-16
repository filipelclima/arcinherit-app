# Heirloom Design System — Extracted Tokens

Extracted read-only from the `arcinherit-app` (Heirloom) repo for reuse in another project. Source: `lib/theme.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/components/HowItWorks.tsx`, `app/components/Tooltip.tsx`.

## 1. Stack

**Plain inline `style={{}}` objects on every component — not Tailwind, not CSS modules.**

- `tailwindcss` is a `package.json` dependency and `app/globals.css` has the three `@tailwind` directives, but **no component uses a single Tailwind utility class**. `tailwind.config.ts` only extends `colors.background`/`colors.foreground` mapped to CSS vars `--background`/`--foreground` that don't even exist in `globals.css` (dead leftover from the `create-next-app` scaffold — never populated, never referenced). Tailwind is effectively inert in this project.
- Colors live as **exported `const` string literals in [`lib/theme.ts`](lib/theme.ts)**, imported by name into each component (`import { ARC_GRADIENT, COLOR_BG, ... } from '@/lib/theme'`) and used directly in `style={{ background: COLOR_BG }}` etc. This is the single source of truth.
- A **parallel, smaller set of the same colors also exists as raw hex in CSS custom properties** in `app/globals.css` (`:root { --bg, --surface, --border, --text, --muted, --accent }`), used only for the handful of plain-CSS selectors in that file (`body`, `input`, `button`). The two systems are kept in sync by hand — there's no single-source generation between `theme.ts` and `globals.css`.
- No CSS-in-JS library (no styled-components, emotion, vanilla-extract, etc.) — literally just React inline `style` props.

## 2. Colors (exact hex)

All from `lib/theme.ts` unless noted.

| Token | Value | Notes |
|---|---|---|
| Page / card background | `#FFFFFF` | `COLOR_BG` |
| Subtle/alt background (stat boxes, inactive tab track, disabled buttons) | `#FAFAFA` | `COLOR_BG_SUBTLE` |
| Card / input border | `#E5E7EB` | `COLOR_BORDER` |
| Primary text | `#0A0A0A` | `COLOR_TEXT_PRIMARY` |
| Secondary / muted text | `#6B7280` | `COLOR_TEXT_SECONDARY` |
| Tertiary text (labels, placeholders, timestamps) | `#9CA3AF` | `COLOR_TEXT_TERTIARY` (placeholder color in `globals.css` is also `#9CA3AF`, hardcoded, not var-driven) |
| **Navy** (gradient start / solid accent) | `#001767` | `COLOR_ACCENT` — used standalone for icon strokes, borders, focus rings, accent text where a gradient isn't practical |
| **Wine** (gradient end) | `#73112C` | only ever appears inside `ARC_GRADIENT`, no standalone token |
| Lavender/tint chip background | `rgba(0, 23, 103, 0.08)` | `COLOR_ACCENT_TINT` — this is navy at 8% opacity, **not** a separate hex; used as icon-chip fill and info/notice-box fill |
| Tint border (paired with the tint bg above) | `rgba(0, 23, 103, 0.15)` | hardcoded inline wherever `COLOR_ACCENT_TINT` boxes need a border (e.g. `HowItWorks.tsx` guarantee box, `CreateVault.tsx` irreversibility notice) — **not** exported as a token, just repeated as a literal |
| Success | `#16A34A` | `COLOR_SUCCESS` |
| Success bg | `#F0FDF4` | `COLOR_SUCCESS_BG` |
| Success border | `#BBF7D0` | `COLOR_SUCCESS_BORDER` |
| Warning | `#D97706` | `COLOR_WARNING` |
| Warning bg | `#FFFBEB` | `COLOR_WARNING_BG` |
| Warning border | `#FDE68A` | `COLOR_WARNING_BORDER` |
| Danger/error | `#DC2626` | `COLOR_DANGER` |
| Danger bg | `#FEF2F2` | `COLOR_DANGER_BG` |
| Danger border | `#FECACA` | `COLOR_DANGER_BORDER` |

### Gradient — exact CSS

```css
background: linear-gradient(135deg, #001767 0%, #73112C 100%);
```

`export const ARC_GRADIENT = 'linear-gradient(135deg, #001767 0%, #73112C 100%)'` — 135° angle, navy at 0%, wine at 100%, no midpoint stop. Used for: primary CTA buttons, active tab/toggle state, hero "Built on Arc" pill, gradient text (`background-clip: text` on "Heir" in the wordmark and "Your heirs." in the hero — always paired with `WebkitBackgroundClip: 'text'`, `backgroundClip: 'text'`, `color: 'transparent'`), and the countdown progress-bar fill when under 70% elapsed.

Semantic colors (success/warning/danger) are **deliberately excluded** from the gradient system — they carry their own meaning (e.g. the countdown bar switches from the gradient to solid warning-orange at ≥70% elapsed and solid danger-red at ≥100%, specifically to not let a uniformly-branded bar bury the urgency signal).

## 3. Border radius & shadow

No single spacing/radius scale constant exists — these are repeated literal numbers at each call site. Observed values, by role:

| Element | `border-radius` |
|---|---|
| Main content cards (vault card, FAQ card, HowItWorks step card, etc.) | `12px` |
| Secondary containers (tab bar, summary/notice boxes) | `10px` |
| Buttons — primary/large CTA (submit, claim, check-in) | `10px` |
| Buttons — secondary/small (approve/deposit, timelock picker, remove-heir, dropdown items) | `8px` (global `button` CSS default in `globals.css` is also `8px`) |
| Small badges/chips (network badge, status pill, connected-wallet chip) | `6px`–`8px` (network badge `6px`, most status chips `8px`) |
| Pills / progress bar | `9999px` (hero "Built on Arc" badge) or `999px` (countdown progress track + fill) — both fully round, just different literals used in different files |
| Circular icon chips / avatar-style badges | `50%` |

**Box-shadow:** cards have **none** — flat white fill + 1px border only, deliberately (thin borders instead of shadows is a stated design goal). The only two `box-shadow` uses in the whole app are floating/overlay elements: the wallet-connector dropdown (`ConnectWallet.tsx`) and the tooltip bubble (`Tooltip.tsx`), both:
```css
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
```

## 4. Typography

- Font family: **Inter**, loaded via `next/font/google` in `app/layout.tsx`:
  ```ts
  import { Inter } from 'next/font/google'
  const inter = Inter({ subsets: ['latin'] })
  // applied as <body className={inter.className}>
  ```
  No `weight` array is passed to the loader — Inter is a variable font on Google Fonts, so this loads the **full variable axis** (effectively continuous 100–900), not a fixed subset. `app/globals.css` also has a `body { font-family: 'Inter', sans-serif; }` fallback declaration, redundant with the `next/font` class but harmless.
- Weights actually **used** in the UI (not all 100–900, just what's called out in `fontWeight:` inline styles): `500`, `600`, `700`, and `800` (the `800` appears exactly once — the hero title "Your crypto. / Your heirs.", `fontSize: 46`). Default/unset text (body copy, descriptions) renders at normal `400`. The global `button` CSS rule also defaults every button to `font-weight: 500` unless a component overrides it inline.
- **"STEP 01" label style** (from `HowItWorks.tsx`):
  ```ts
  { fontSize: 11, color: COLOR_ACCENT, fontWeight: 700, letterSpacing: '0.1em' }
  ```
  i.e. `font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #001767;` — no text-transform is applied in code (the source string is already the literal `STEP 01`, not `step 01` transformed via CSS).

## 5. Icon library

**None installed.** `lucide-react` is not a dependency (confirmed absent from `package.json`) — it was deliberately not added to avoid a new dependency for ~5 icons. Instead, `app/components/HowItWorks.tsx` hand-rolls 5 inline SVG components matching Lucide's visual conventions exactly (24×24 viewBox, `stroke`-only, `stroke-width: 2`, round caps/joins, no fill) so they'd be a drop-in visual match if `lucide-react` were added later.

Shared icon-prop helper:
```tsx
function iconProps(size: number, color: string) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
}
```

### Full JSX of one step badge (circular chip + icon + "STEP 01" label)

This is the complete markup block from `HowItWorks.tsx` for a single step's header row (chip + label), plus the icon component it renders (`ShieldIcon`, used for step 01):

```tsx
function ShieldIcon({ size = 20, color = COLOR_ACCENT }: { size?: number; color?: string }) {
  return (
    <svg {...iconProps(size, color)}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}

// ...inside the step card:
<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
  <div style={{
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: COLOR_ACCENT_TINT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }}>
    <ShieldIcon size={20} />
  </div>
  <div style={{ fontSize: 11, color: COLOR_ACCENT, fontWeight: 700, letterSpacing: '0.1em' }}>
    STEP 01
  </div>
</div>
```

Chip: 40×40px circle, `background: rgba(0, 23, 103, 0.08)` (the lavender tint), icon centered via flex, icon itself rendered at `size={20}` with default `color = COLOR_ACCENT` (`#001767`) stroke.

## 6. Tooltip (`ⓘ`) component

`app/components/Tooltip.tsx` exports two pieces: a generic `<Tooltip>` wrapper (hover-triggered, CSS-positioned, no JS library — no Radix/Floating UI/Popper) and an `<InfoIcon>` convenience wrapper that renders the "ⓘ" trigger + tooltip together.

- **Mechanism:** plain `useState<boolean>` toggled on `onMouseEnter`/`onMouseLeave` on the trigger `<span>`. The bubble is an absolutely-positioned sibling `<span>` (`position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%)`) inside a `position: relative` wrapper — pure CSS popover, no portal, no positioning library.
- **Bubble style:** white bg (`COLOR_BG`), `1px solid ${COLOR_BORDER}`, `border-radius: 8px`, `padding: 8px 12px`, `font-size: 12px`, `color: COLOR_TEXT_SECONDARY`, fixed `width: 220px`, `line-height: 1.5`, `text-align: left`, `pointer-events: none` (so it never blocks the cursor), `z-index: 50`, `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08)`, `margin-bottom: 6px` gap above the trigger.
- **The "i" trigger itself (`InfoIcon`)** is not an SVG — it's a 16×16px circular `<span>` with the literal text character `i` inside: `background: COLOR_BG_SUBTLE`, `1px solid ${COLOR_BORDER}`, `border-radius: 50%`, `color: COLOR_TEXT_PRIMARY`, `font-size: 10px`, `font-weight: 700`, centered via flex, `cursor: help`, `margin-left: 6px`, `flex-shrink: 0`.

Full source:

```tsx
'use client'
import { useState } from 'react'
import { COLOR_BG, COLOR_BG_SUBTLE, COLOR_BORDER, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY } from '@/lib/theme'

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: 'help' }}
      >
        {children}
      </span>
      {show && (
        <span style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 6,
          background: COLOR_BG,
          border: `1px solid ${COLOR_BORDER}`,
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          color: COLOR_TEXT_SECONDARY,
          whiteSpace: 'normal',
          width: 220,
          zIndex: 50,
          lineHeight: 1.5,
          textAlign: 'left',
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}

export function InfoIcon({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip text={tooltip}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: COLOR_BG_SUBTLE,
        border: `1px solid ${COLOR_BORDER}`,
        color: COLOR_TEXT_PRIMARY,
        fontSize: 10,
        fontWeight: 700,
        marginLeft: 6,
        cursor: 'help',
        flexShrink: 0,
      }}>i</span>
    </Tooltip>
  )
}
```

**Caveat for hover-only tooltips:** this implementation has no keyboard/focus trigger (`onFocus`/`onBlur`) and no `role="tooltip"`/`aria-describedby` wiring — it's mouse-hover only. Worth fixing if reused in a project with an accessibility bar to meet, not a straight copy-paste win.

---

*Generated read-only from `arcinherit-app` on 2026-08-15. Nothing in the source repo was modified to produce this file.*
