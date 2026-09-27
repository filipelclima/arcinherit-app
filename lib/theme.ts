// Light design system (Aqueduct-inspired), official Arc colors for the accent gradient.
// Rolling out in phases: Header + Hero (part 1), rest of the app (part 2).

export const ARC_GRADIENT = 'linear-gradient(135deg, #001767 0%, #73112C 100%)'
// A more saturated variant of the gradient above, reserved for the single boldest emphasis point on
// the landing page (the "Your heirs." headline). Navy (#001767) is already at 100% HSL saturation in
// the official gradient — there's no headroom to push it further — so only the wine stop moves, from
// ~74% saturation/26% lightness to ~85%/30%, same hue (~343°), reading as a richer magenta-crimson
// instead of a slightly muted brick red. This is NOT a replacement for ARC_GRADIENT/COLOR_ARC_WINE,
// which stay the official brand colors used everywhere else (CTAs, tabs, progress bars, badges) —
// using the vivid variant everywhere would dilute exactly the emphasis it's meant to create.
export const ARC_GRADIENT_VIVID = 'linear-gradient(135deg, #001767 0%, #8E0C2F 100%)'
// Solid stand-in for the gradient where a gradient isn't practical (1px borders, focus rings,
// small icon strokes, highlighted inline numbers).
export const COLOR_ACCENT = '#001767'
// The wine end of ARC_GRADIENT on its own — only for places that need the two gradient stops
// separately (SVG <stop>s), where the CSS gradient string can't be used.
export const COLOR_ARC_WINE = '#73112C'
// Low-opacity accent wash for icon chip backgrounds etc.
export const COLOR_ACCENT_TINT = 'rgba(0, 23, 103, 0.08)'
// A louder version of the tint above (~18% vs ~8%), reserved for the one or two spots that should
// read as more vivid than the rest of the app (the Hero feature-card icons) — not a replacement for
// COLOR_ACCENT_TINT, which stays as-is everywhere else (icon chips across the functional screens,
// HeroScene, HowItWorks) so those already-reviewed screens don't shift.
export const COLOR_ACCENT_TINT_VIVID = 'rgba(0, 23, 103, 0.18)'
// Soft radial wash of the Arc gradient (wine core fading through navy to transparent), meant to
// sit blurred behind a focal element (the Hero scene) as a glow — never as a flat fill.
// closest-side: the fade reaches fully transparent exactly at the edge of the element's own box,
// so the glow never gets hard-clipped by a parent's overflow.
export const ARC_GLOW = 'radial-gradient(closest-side, rgba(115, 17, 44, 0.34) 0%, rgba(0, 23, 103, 0.22) 40%, rgba(0, 23, 103, 0) 100%)'

export const COLOR_BG = '#FFFFFF'
export const COLOR_BG_SUBTLE = '#FAFAFA'
// Translucent stand-ins for COLOR_BG/COLOR_BORDER, used only by the Hero scene card so it sits
// blurred over the background network and the glow instead of opaquely covering them — paired
// with `backdrop-filter: blur(...)` on `.hero-scene-card` in hero.css.
export const COLOR_BG_TRANSLUCENT = 'rgba(255, 255, 255, 0.6)'
export const COLOR_BORDER_TRANSLUCENT = 'rgba(229, 231, 235, 0.6)'
export const COLOR_TEXT_PRIMARY = '#0A0A0A'
export const COLOR_TEXT_SECONDARY = '#6B7280'
export const COLOR_TEXT_TERTIARY = '#9CA3AF'
export const COLOR_BORDER = '#E5E7EB'

// Semantic status colors — deliberately not part of the brand accent (success/warning/danger
// carry their own meaning regardless of brand), just relit for the light theme.
export const COLOR_SUCCESS = '#16A34A'
export const COLOR_SUCCESS_BG = '#F0FDF4'
export const COLOR_SUCCESS_BORDER = '#BBF7D0'
export const COLOR_WARNING = '#D97706'
export const COLOR_WARNING_BG = '#FFFBEB'
export const COLOR_WARNING_BORDER = '#FDE68A'
export const COLOR_DANGER = '#DC2626'
export const COLOR_DANGER_BG = '#FEF2F2'
export const COLOR_DANGER_BORDER = '#FECACA'
