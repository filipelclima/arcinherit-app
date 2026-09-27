// Design system (Aqueduct-inspired), official Arc colors for the accent gradient.
// Rolled out in phases: Header + Hero (part 1), rest of the app (part 2), dark mode (part 3).
//
// Dark mode: every token below that needs a different value per theme is a CSS custom property
// reference (`var(--x)`), defined for light in `:root` and overridden for dark under `.dark` in
// globals.css. Consuming components never branch on theme themselves — they just use these
// constants exactly as before, and the browser resolves the right value from whichever class is on
// <html> (toggled by useTheme, see app/hooks/useTheme.tsx). A few tokens are genuinely invariant
// (the brand gradient/accent) and stay plain hex, see the note above them.

// The two-stop gradient's hex values are the same in both themes by design (this is what makes it
// "the Arc gradient" rather than a theme-relative color) — it stays a plain string, not a CSS var,
// and is always used as an opaque fill with its own built-in contrast (button backgrounds, badge
// pills, white text on top) rather than as a thin line/text directly against the page background.
export const ARC_GRADIENT = 'linear-gradient(135deg, #001767 0%, #73112C 100%)'
// A more saturated variant of the gradient above, reserved for the single boldest emphasis point on
// the landing page (the "Your heirs." headline). Navy (#001767) is already at 100% HSL saturation in
// the official gradient — there's no headroom to push it further — so only the wine stop moves, from
// ~74% saturation/26% lightness to ~85%/30%, same hue (~343°), reading as a richer magenta-crimson
// instead of a slightly muted brick red. This is NOT a replacement for ARC_GRADIENT/COLOR_ARC_WINE,
// which stay the official brand colors used everywhere else (CTAs, tabs, progress bars, badges) —
// using the vivid variant everywhere would dilute exactly the emphasis it's meant to create.
export const ARC_GRADIENT_VIVID = 'linear-gradient(135deg, #001767 0%, #8E0C2F 100%)'
// Text-clip variants of the two gradients above (`background-image` + `background-clip: text`,
// used for the header wordmark and "Your heirs."). Unlike a filled button/badge, gradient TEXT has
// no background of its own behind it for contrast — it's bare foreground content straight on the
// page, exactly the same problem as COLOR_ACCENT. The navy stop (#001767) is identical in both
// ARC_GRADIENT/ARC_GRADIENT_VIVID, so both text usages inherited the same low-contrast start on a
// dark page; these swap in the same brightened #5C8AFF used for COLOR_ACCENT for that stop only,
// leaving the wine end (and both gradients' light-mode values) untouched.
export const ARC_GRADIENT_TEXT = 'var(--gradient-text)'
export const ARC_GRADIENT_VIVID_TEXT = 'var(--gradient-text-vivid)'
// Solid stand-in for the gradient where a gradient isn't practical — but unlike the gradient itself,
// this one DOES need a dark-mode value: it's used directly as small foreground content (1px borders,
// focus rings, icon strokes, "highlighted inline numbers" like a balance or a heir's %) sitting
// straight on the page background, and navy-on-near-black has essentially no contrast. Dark mode
// brightens it to #5C8AFF — same hue (~223°) and full saturation as #001767, lightness raised from
// ~20% to ~68% — recognizably the same accent, legible against a dark page instead of invisible on it.
export const COLOR_ACCENT = 'var(--accent)'
// The wine end of ARC_GRADIENT on its own — only for places that need the two gradient stops
// separately (SVG <stop>s), where the CSS gradient string can't be used. Stays invariant like
// ARC_GRADIENT itself (always paired with COLOR_ACCENT in a 2-stop gradient fill, never bare text).
export const COLOR_ARC_WINE = '#73112C'
// Soft radial wash of the Arc gradient (wine core fading through navy to transparent), meant to
// sit blurred behind a focal element (the Hero scene) as a glow — never as a flat fill.
// closest-side: the fade reaches fully transparent exactly at the edge of the element's own box,
// so the glow never gets hard-clipped by a parent's overflow.
export const ARC_GLOW = 'radial-gradient(closest-side, rgba(115, 17, 44, 0.34) 0%, rgba(0, 23, 103, 0.22) 40%, rgba(0, 23, 103, 0) 100%)'

// Low-opacity accent wash for icon chip backgrounds etc. Unlike the gradient/solid accent above,
// this DOES need a different value per theme: it's a low-alpha wash meant to read as a faint tinted
// background, and low-alpha navy over a near-black dark background is imperceptible — see globals.css
// for the (brighter, dark-only) base hue this resolves to under `.dark`.
export const COLOR_ACCENT_TINT = 'var(--accent-tint)'
// A louder version of the tint above (~18% vs ~8% alpha in light mode), reserved for the one or two
// spots that should read as more vivid than the rest of the app (the Hero feature-card icons) — not a
// replacement for COLOR_ACCENT_TINT, which stays the default everywhere else (icon chips across the
// functional screens, HeroScene, HowItWorks) so those already-reviewed screens don't shift.
export const COLOR_ACCENT_TINT_VIVID = 'var(--accent-tint-vivid)'

export const COLOR_BG = 'var(--bg)'
export const COLOR_BG_SUBTLE = 'var(--bg-subtle)'
// Translucent stand-ins for COLOR_BG/COLOR_BORDER, used only by the Hero scene card and the
// stat/feature cards so they sit blurred over the background network (and, on the scene card, the
// glow) instead of opaquely covering it — paired with `backdrop-filter: blur(...)` in hero.css.
export const COLOR_BG_TRANSLUCENT = 'var(--bg-translucent)'
export const COLOR_BORDER_TRANSLUCENT = 'var(--border-translucent)'
export const COLOR_TEXT_PRIMARY = 'var(--text)'
export const COLOR_TEXT_SECONDARY = 'var(--muted)'
export const COLOR_TEXT_TERTIARY = 'var(--text-tertiary)'
export const COLOR_BORDER = 'var(--border)'
// Neutral gray block standing in for on-chain data while it loads (Skeleton in ui.tsx). Deliberately
// its own token rather than reusing COLOR_BORDER: a border wants to be a near-invisible hairline in
// dark mode, but a skeleton block needs to stay clearly visible as "something is loading" — the two
// pull in opposite directions once there's a dark theme, so they can't share one value anymore.
export const COLOR_SKELETON = 'var(--skeleton)'

// Semantic status colors — deliberately not part of the brand accent (success/warning/danger
// carry their own meaning regardless of brand). Each has a dark-mode value too: the light-mode `_BG`
// tints are near-white pastel washes (e.g. success's #F0FDF4), which would look like a rendering
// mistake pasted straight onto a dark page — under `.dark` these become low-alpha washes of a
// brightened version of the same hue instead, and the foreground/border tones brighten to match, so
// the badges built from them (Protected, Verified, Claimable, StatusMessage) stay legible.
export const COLOR_SUCCESS = 'var(--success)'
export const COLOR_SUCCESS_BG = 'var(--success-bg)'
export const COLOR_SUCCESS_BORDER = 'var(--success-border)'
export const COLOR_WARNING = 'var(--warning)'
export const COLOR_WARNING_BG = 'var(--warning-bg)'
export const COLOR_WARNING_BORDER = 'var(--warning-border)'
export const COLOR_DANGER = 'var(--danger)'
export const COLOR_DANGER_BG = 'var(--danger-bg)'
export const COLOR_DANGER_BORDER = 'var(--danger-border)'
