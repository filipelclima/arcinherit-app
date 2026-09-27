import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import {
  ARC_GRADIENT, COLOR_ACCENT, COLOR_ACCENT_TINT, COLOR_BG, COLOR_BG_SUBTLE, COLOR_BORDER, COLOR_DANGER, COLOR_DANGER_BG,
  COLOR_DANGER_BORDER, COLOR_SKELETON, COLOR_SUCCESS, COLOR_SUCCESS_BG, COLOR_SUCCESS_BORDER, COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY, COLOR_TEXT_TERTIARY, COLOR_WARNING, COLOR_WARNING_BG, COLOR_WARNING_BORDER,
} from '@/lib/theme'
import { AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon, InfoCircleIcon } from './icons'
import './ui.css'

// Shared building blocks for the screens people actually complete actions on (create vault, vault
// status, deposit, check-in, claim). Keeping the card frame, header, status messages and action
// buttons here is what makes those screens feel like one product: same rhythm, same treatment for
// errors/successes, same primary-button emphasis. Motion lives in ui.css.

// ---- Rhythm -------------------------------------------------------------------------------------

/** Inner padding of every card. */
export const CARD_PADDING = '1.5rem'
/** Vertical gap between the sections inside a card (header -> fields -> messages -> button). */
export const SECTION_GAP = '1.25rem'
/** Gap between two stacked form fields. */
export const FIELD_GAP = 12

// ---- Card ---------------------------------------------------------------------------------------

const cardStyle: CSSProperties = {
  background: COLOR_BG,
  border: `1px solid ${COLOR_BORDER}`,
  borderRadius: 12,
  padding: CARD_PADDING,
  marginBottom: '1.5rem',
}

/** The card frame: white surface, thin border, soft shadow on hover, fades in when it mounts. */
export function Card({ className, style, ...rest }: ComponentProps<'div'>) {
  return <div {...rest} className={['ui-card', 'ui-enter', className].filter(Boolean).join(' ')} style={{ ...cardStyle, ...style }} />
}

/** The round tinted chip that holds an icon (same language as the Hero feature cards). */
export function IconChip({ children, size = 36 }: { children: ReactNode; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: COLOR_ACCENT_TINT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {children}
    </div>
  )
}

/** Icon chip + title (+ optional trailing element and description): the top of every card. */
export function CardHeader({ icon, title, description, right }: {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  right?: ReactNode
}) {
  return (
    <div style={{ marginBottom: SECTION_GAP }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <IconChip>{icon}</IconChip>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLOR_TEXT_PRIMARY }}>{title}</div>
        </div>
        {right}
      </div>
      {description && (
        <div style={{ fontSize: 13, color: COLOR_TEXT_SECONDARY, lineHeight: 1.7, marginTop: 10 }}>{description}</div>
      )}
    </div>
  )
}

/** Label above a form field. */
export const fieldLabelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: COLOR_TEXT_SECONDARY,
  marginBottom: 6,
}

// ---- Status messages ----------------------------------------------------------------------------

type StatusVariant = 'success' | 'error' | 'warning' | 'info'

const STATUS_STYLES: Record<StatusVariant, { bg: string; border: string; color: string; iconColor: string; Icon: typeof CheckCircleIcon }> = {
  success: { bg: COLOR_SUCCESS_BG, border: COLOR_SUCCESS_BORDER, color: COLOR_SUCCESS, iconColor: COLOR_SUCCESS, Icon: CheckCircleIcon },
  error: { bg: COLOR_DANGER_BG, border: COLOR_DANGER_BORDER, color: COLOR_DANGER, iconColor: COLOR_DANGER, Icon: AlertCircleIcon },
  warning: { bg: COLOR_WARNING_BG, border: COLOR_WARNING_BORDER, color: COLOR_WARNING, iconColor: COLOR_WARNING, Icon: AlertTriangleIcon },
  // Neutral heads-up: accent tint, regular text color, so it doesn't read as a problem.
  info: { bg: COLOR_ACCENT_TINT, border: 'rgba(0, 23, 103, 0.15)', color: COLOR_TEXT_SECONDARY, iconColor: COLOR_ACCENT, Icon: InfoCircleIcon },
}

/**
 * One treatment for every message a screen can show: same icon slot, padding, radius and type, with
 * only the variant color changing. `prominent` is for page-level banners (bigger, bolder).
 * `icon` swaps the default variant icon; pass `null` for none.
 */
export function StatusMessage({ variant, icon, prominent = false, children, style, ...rest }: {
  variant: StatusVariant
  icon?: ReactNode | null
  prominent?: boolean
} & Omit<ComponentProps<'div'>, 'className'>) {
  const s = STATUS_STYLES[variant]
  const iconSize = prominent ? 18 : 16
  const glyph = icon === undefined ? <s.Icon size={iconSize} color={s.iconColor} /> : icon

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      {...rest}
      className="ui-enter"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: s.bg, border: `1px solid ${s.border}`, color: s.color,
        borderRadius: prominent ? 10 : 8,
        padding: prominent ? '14px 16px' : '10px 14px',
        fontSize: prominent ? 14 : 13, fontWeight: prominent ? 600 : 500, lineHeight: 1.5,
        ...style,
      }}
    >
      {glyph !== null && <span style={{ display: 'flex', flexShrink: 0, marginTop: prominent ? 1 : 2 }}>{glyph}</span>}
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  )
}

/** Small inline validation message under a single field. */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: COLOR_DANGER, marginTop: 4 }}>
      <AlertCircleIcon size={12} color={COLOR_DANGER} />
      <span>{children}</span>
    </div>
  )
}

// ---- Skeleton loading -----------------------------------------------------------------------

/**
 * A single placeholder block, sized/shaped like the real content it stands in for. Pulses gently
 * (opacity only; `prefers-reduced-motion` turns it into a plain static block, see ui.css) via the
 * `ui-skeleton` class. Always `aria-hidden` — there's nothing here worth announcing before the real
 * content, with its own text, replaces it.
 */
export function Skeleton({ width, height = 14, radius = 6, style, ...rest }: {
  width?: number | string
  height?: number | string
  radius?: number
} & Omit<ComponentProps<'div'>, 'className' | 'aria-hidden'>) {
  return (
    <div
      aria-hidden="true"
      className="ui-skeleton"
      style={{ width, height, borderRadius: radius, background: COLOR_SKELETON, flexShrink: 0, ...style }}
      {...rest}
    />
  )
}

/** A skeleton in the exact shape of an IconChip. */
export function SkeletonChip({ size = 36 }: { size?: number }) {
  return <Skeleton width={size} height={size} radius={size / 2} />
}

/**
 * The loading state of CardHeader: icon chip + title line (+ optional right-side chip, e.g. a status
 * badge), same slots and spacing as the real thing so nothing shifts or resizes once content arrives.
 */
export function CardHeaderSkeleton({ titleWidth = 140, withRight = false }: { titleWidth?: number; withRight?: boolean }) {
  return (
    <div style={{ marginBottom: SECTION_GAP, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <SkeletonChip />
        <Skeleton width={titleWidth} height={16} />
      </div>
      {withRight && <Skeleton width={80} height={22} radius={8} />}
    </div>
  )
}

// ---- Buttons ------------------------------------------------------------------------------------

/**
 * The main action of a card. Active = Arc gradient (the one thing to click); inactive = quiet grey
 * (nothing to do yet). Same size/weight everywhere so every card's primary button has equal
 * emphasis. Spread onto a <button>: gives it the press feedback class too.
 */
export function actionButton(active: boolean): { className: string; style: CSSProperties } {
  return {
    className: 'ui-press',
    style: {
      width: '100%', padding: 14, fontSize: 15, fontWeight: 700, borderRadius: 10,
      border: 'none',
      // The quiet state draws its outline as an inset shadow instead of a real border, so both states
      // have exactly the same box (a border would make it 2px taller and stretch a neighbouring button).
      ...(active
        ? { background: ARC_GRADIENT, color: '#fff' }
        : { background: COLOR_BG_SUBTLE, boxShadow: `inset 0 0 0 1px ${COLOR_BORDER}`, color: COLOR_TEXT_TERTIARY }),
    },
  }
}
