import { COLOR_ACCENT } from '@/lib/theme'

// Hand-written Lucide-style icons (24x24 viewBox, stroke-only, 2px round strokes) shared by
// HowItWorks, the Hero and the functional screens (status messages, card headers). lucide-react isn't a
// dependency of this project.

type IconProps = { size?: number; color?: string }

function iconProps(size: number, color: string) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
}

export function ShieldIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}

export function CoinsIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 0 3h-1a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 0 1.5-1.5" />
    </svg>
  )
}

export function CheckCircleIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  )
}

export function AlertCircleIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}

export function AlertTriangleIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export function InfoCircleIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

export function CalendarIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

export function DownloadIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  )
}

export function LockIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function LockOpenIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  )
}

export function ClockIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function UsersIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function ShieldCheckIcon({ size = 20, color = COLOR_ACCENT }: IconProps) {
  return (
    <svg {...iconProps(size, color)}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
