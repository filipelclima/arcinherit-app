// Light design system (Aqueduct-inspired), official Arc colors for the accent gradient.
// Rolling out in phases: Header + Hero (part 1), rest of the app (part 2).

export const ARC_GRADIENT = 'linear-gradient(135deg, #001767 0%, #73112C 100%)'
// Solid stand-in for the gradient where a gradient isn't practical (1px borders, focus rings,
// small icon strokes, highlighted inline numbers).
export const COLOR_ACCENT = '#001767'
// Low-opacity accent wash for icon chip backgrounds etc.
export const COLOR_ACCENT_TINT = 'rgba(0, 23, 103, 0.08)'

export const COLOR_BG = '#FFFFFF'
export const COLOR_BG_SUBTLE = '#FAFAFA'
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
