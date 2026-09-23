import { ARC_GLOW, ARC_GRADIENT, COLOR_ACCENT, COLOR_ACCENT_TINT, COLOR_ARC_WINE, COLOR_BG_TRANSLUCENT, COLOR_BORDER, COLOR_BORDER_TRANSLUCENT, COLOR_TEXT_SECONDARY } from '@/lib/theme'
import { LockIcon, LockOpenIcon, UsersIcon } from './icons'

// The Heirloom mechanism in one looping picture: the owner's check-in timer drains, and when it hits
// zero the funds flow from the vault to the heir. All motion is CSS (see hero.css) and opt-in via
// prefers-reduced-motion; the markup below is also the complete static picture (timer half full).

const SCENE_LABEL =
  'Animated illustration: as long as the owner keeps checking in, the vault stays locked. ' +
  'If the check-ins stop and the timer runs out, the funds flow from the vault to the heir.'

// The connector's coordinate space. The token travels 0 -> CONNECTOR_WIDTH (mirrored in hero.css).
const CONNECTOR_WIDTH = 240
const CONNECTOR_HEIGHT = 28
const CONNECTOR_MID = CONNECTOR_HEIGHT / 2

export function HeroScene() {
  return (
    <div className="hero-scene" data-testid="hero-scene" role="img" aria-label={SCENE_LABEL}>
      {/* The Arc glow sits behind the scene; the card is translucent + blurred (not opaque), so the
          glow and the background network both show through it instead of being covered by a flat card. */}
      <div aria-hidden="true" data-testid="hero-scene-glow" className="hero-scene-glow" style={{ background: ARC_GLOW }} />

      <div data-testid="hero-scene-card" className="hero-scene-card" style={{ background: COLOR_BG_TRANSLUCENT, border: `1px solid ${COLOR_BORDER_TRANSLUCENT}` }}>
        <div className="hero-scene-row">
          {/* Vault: locked until the timer runs out, then it opens */}
          <div className="hero-node" data-testid="hero-vault-node">
            <span className="hero-ring hero-ring-vault" style={{ border: `2px solid ${COLOR_ACCENT}` }} />
            <div className="hero-chip" style={{ background: COLOR_ACCENT_TINT }}>
              <span className="hero-lock-a"><LockIcon size={24} /></span>
              <span className="hero-lock-b"><LockOpenIcon size={24} /></span>
            </div>
            <div className="hero-node-label" style={{ color: COLOR_TEXT_SECONDARY }}>Your vault</div>
          </div>

          {/* Connector: a dotted line, a brighter dashed line that flows during the release, and the token */}
          <svg
            className="hero-connector"
            data-testid="hero-connector"
            viewBox={`0 0 ${CONNECTOR_WIDTH} ${CONNECTOR_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="hero-flow-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={CONNECTOR_WIDTH} y2="0">
                <stop offset="0" stopColor={COLOR_ACCENT} />
                <stop offset="1" stopColor={COLOR_ARC_WINE} />
              </linearGradient>
              <linearGradient id="hero-token-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={COLOR_ACCENT} />
                <stop offset="1" stopColor={COLOR_ARC_WINE} />
              </linearGradient>
            </defs>
            <line
              x1="0" y1={CONNECTOR_MID} x2={CONNECTOR_WIDTH} y2={CONNECTOR_MID}
              stroke={COLOR_BORDER} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1 6"
            />
            <line
              className="hero-flow-line" data-testid="hero-flow-line"
              x1="0" y1={CONNECTOR_MID} x2={CONNECTOR_WIDTH} y2={CONNECTOR_MID}
              stroke="url(#hero-flow-gradient)" strokeWidth="2" strokeLinecap="round" strokeDasharray="8 8"
            />
            <g className="hero-token" data-testid="hero-token">
              <circle cx="0" cy={CONNECTOR_MID} r="13" fill="url(#hero-token-gradient)" opacity="0.18" />
              <circle cx="0" cy={CONNECTOR_MID} r="7" fill="url(#hero-token-gradient)" />
            </g>
          </svg>

          {/* Heir: lights up (gradient fill + ring) when the token arrives */}
          <div className="hero-node" data-testid="hero-heir-node">
            <span className="hero-ring hero-ring-heir" style={{ border: `2px solid ${COLOR_ACCENT}` }} />
            <div className="hero-chip hero-chip-heir" style={{ background: COLOR_ACCENT_TINT }}>
              <span><UsersIcon size={24} /></span>
              <span className="hero-heir-fill" style={{ background: ARC_GRADIENT }}><UsersIcon size={24} color="#fff" /></span>
            </div>
            <div className="hero-node-label" style={{ color: COLOR_TEXT_SECONDARY }}>Your heir</div>
          </div>
        </div>

        {/* The check-in timer: full while the owner is active, drains when they go silent */}
        <div className="hero-timer-row">
          <span className="hero-timer-label" style={{ color: COLOR_TEXT_SECONDARY }}>Check-in timer</span>
          <div className="hero-bar-track" data-testid="hero-bar-track" style={{ background: COLOR_BORDER }}>
            <div className="hero-bar-fill" style={{ background: ARC_GRADIENT }} />
            <div className="hero-bar-cover" data-testid="hero-bar-cover" style={{ background: COLOR_BORDER }} />
          </div>
        </div>

        {/* One caption per beat of the story, cross-faded (static state shows the middle one) */}
        <div className="hero-captions" style={{ color: COLOR_TEXT_SECONDARY }}>
          <span className="hero-cap hero-cap-a" data-testid="hero-caption">Owner checks in — vault stays locked</span>
          <span className="hero-cap hero-cap-b" data-testid="hero-caption">No check-in — the timer runs down</span>
          <span className="hero-cap hero-cap-c" data-testid="hero-caption">Timer ends — funds flow to the heir</span>
        </div>
      </div>
    </div>
  )
}
