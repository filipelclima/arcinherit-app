import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ARC_GRADIENT, COLOR_DANGER, COLOR_SKELETON, COLOR_SUCCESS, COLOR_WARNING } from '@/lib/theme'
import { ClockIcon, ShieldIcon } from './icons'
import { actionButton, Card, CardHeader, CardHeaderSkeleton, FieldError, Skeleton, SkeletonChip, StatusMessage } from './ui'

describe('Card', () => {
  it('is the shared frame: hover-shadow and entrance classes, thin border, rounded, standard padding', () => {
    render(<Card data-testid="card">content</Card>)

    const card = screen.getByTestId('card')
    expect(card).toHaveClass('ui-card', 'ui-enter')
    expect(card.style.borderRadius).toBe('12px')
    expect(card.style.padding).toBe('1.5rem')
    expect(card.style.border).toContain('1px solid')
  })

  it('lets a screen override the frame (e.g. a success border) without losing the shared classes', () => {
    render(<Card data-testid="card" style={{ padding: '2rem 1.5rem' }} className="extra">x</Card>)

    const card = screen.getByTestId('card')
    expect(card.style.padding).toBe('2rem 1.5rem')
    expect(card).toHaveClass('ui-card', 'extra')
  })
})

describe('CardHeader', () => {
  it('puts an icon chip next to the title, with the description underneath', () => {
    render(<CardHeader icon={<ShieldIcon size={18} />} title="Deposit Tokens" description="Some helpful text" />)

    const title = screen.getByText('Deposit Tokens')
    expect(title.parentElement?.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('Some helpful text')).toBeInTheDocument()
  })

  it('renders a trailing element (e.g. a status badge) on the same row as the title', () => {
    render(<CardHeader icon={<ShieldIcon />} title="Your Vault" right={<span>Protected</span>} />)

    const title = screen.getByText('Your Vault')
    const row = title.parentElement!.parentElement!
    expect(within(row).getByText('Protected')).toBeInTheDocument()
  })
})

describe('StatusMessage', () => {
  it('gives every variant the same anatomy: an icon and the message, in the variant color', () => {
    const { container } = render(
      <>
        <StatusMessage variant="success">Done</StatusMessage>
        <StatusMessage variant="error">Broke</StatusMessage>
        <StatusMessage variant="warning">Careful</StatusMessage>
        <StatusMessage variant="info">FYI</StatusMessage>
      </>
    )

    const boxes = Array.from(container.children) as HTMLElement[]
    expect(boxes).toHaveLength(4)
    boxes.forEach(box => {
      expect(box.querySelector('svg')).not.toBeNull()
      expect(box).toHaveClass('ui-enter')
      expect(box.style.padding).toBe('10px 14px')
      expect(box.style.borderRadius).toBe('8px')
    })
    expect((screen.getByText('Broke').closest('[role]') as HTMLElement).style.color).toBe(COLOR_DANGER)
    expect((screen.getByText('Careful').closest('[role]') as HTMLElement).style.color).toBe(COLOR_WARNING)
    expect((screen.getByText('Done').closest('[role]') as HTMLElement).style.color).toBe(COLOR_SUCCESS)
  })

  it('announces errors as alerts and everything else politely', () => {
    render(
      <>
        <StatusMessage variant="error">Broke</StatusMessage>
        <StatusMessage variant="success">Done</StatusMessage>
      </>
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Broke')
    expect(screen.getByRole('status')).toHaveTextContent('Done')
  })

  it('makes page-level banners bigger and bolder with `prominent`', () => {
    render(<StatusMessage variant="warning" prominent>Heads up</StatusMessage>)

    const box = screen.getByRole('status')
    expect(box.style.padding).toBe('14px 16px')
    expect(box.style.fontSize).toBe('14px')
    expect(box.style.fontWeight).toBe('600')
  })

  it('accepts a custom icon, or none at all', () => {
    const { rerender } = render(<StatusMessage variant="warning" icon={<ClockIcon size={16} />}>Ticking</StatusMessage>)
    expect(screen.getByRole('status').querySelectorAll('svg')).toHaveLength(1)

    rerender(<StatusMessage variant="warning" icon={null}>Ticking</StatusMessage>)
    expect(screen.getByRole('status').querySelector('svg')).toBeNull()
  })
})

describe('FieldError', () => {
  it('shows a small inline alert with an icon', () => {
    render(<FieldError>Wallet address must start with 0x</FieldError>)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Wallet address must start with 0x')
    expect(alert.querySelector('svg')).not.toBeNull()
  })
})

describe('actionButton', () => {
  it('makes the active state the Arc-gradient primary action, with the press-feedback class', () => {
    const { className, style } = actionButton(true)

    expect(className).toBe('ui-press')
    expect(style.background).toBe(ARC_GRADIENT)
    expect(style.color).toBe('#fff')
  })

  it('makes the inactive state a quiet grey, with exactly the same size, weight and radius', () => {
    const active = actionButton(true).style
    const inactive = actionButton(false).style

    expect(inactive.background).not.toBe(ARC_GRADIENT)
    for (const key of ['width', 'padding', 'fontSize', 'fontWeight', 'borderRadius'] as const) {
      expect(inactive[key]).toBe(active[key])
    }
  })

  it('draws the quiet state\'s outline as an inset shadow, so neither state has a border and both boxes are the same height', () => {
    // Regression: the inactive button used a 1px border, making it 2px taller than the active one
    // (visible when the Approve/Deposit pair stretched to match).
    const active = actionButton(true).style
    const inactive = actionButton(false).style

    expect(active.border).toBe('none')
    expect(inactive.border).toBe('none')
    expect(inactive.boxShadow).toMatch(/^inset 0 0 0 1px /)
  })
})

describe('Skeleton', () => {
  it('renders a neutral, hidden-from-assistive-tech placeholder block, sized as given', () => {
    render(<Skeleton data-testid="sk" width={90} height={16} radius={8} />)

    const el = screen.getByTestId('sk')
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el).toHaveClass('ui-skeleton')
    expect(el.style.width).toBe('90px')
    expect(el.style.height).toBe('16px')
    expect(el.style.borderRadius).toBe('8px')
    expect(el.style.background).toBe(COLOR_SKELETON)
  })

  it('defaults to a small text-line size when no dimensions are given', () => {
    render(<Skeleton data-testid="sk" />)

    const el = screen.getByTestId('sk')
    expect(el.style.height).toBe('14px')
    expect(el.style.borderRadius).toBe('6px')
  })
})

describe('SkeletonChip', () => {
  it('is a circle sized like an IconChip', () => {
    render(<SkeletonChip size={28} />)

    const el = document.querySelector('.ui-skeleton') as HTMLElement
    expect(el.style.width).toBe('28px')
    expect(el.style.height).toBe('28px')
    expect(el.style.borderRadius).toBe('14px')
  })
})

describe('CardHeaderSkeleton', () => {
  it('mirrors CardHeader\'s slots: a chip and a title line, same bottom margin as the real header', () => {
    render(<CardHeaderSkeleton titleWidth={150} />)

    const chip = document.querySelector('.ui-skeleton') as HTMLElement
    expect(chip.style.width).toBe('36px') // IconChip's default size
    expect(screen.queryByText(/./)).toBeNull() // no real text anywhere — it's all placeholder blocks
  })

  it('adds a right-side chip only when asked (e.g. a status badge slot)', () => {
    const { rerender } = render(<CardHeaderSkeleton />)
    expect(document.querySelectorAll('.ui-skeleton')).toHaveLength(2) // chip + title line

    rerender(<CardHeaderSkeleton withRight />)
    expect(document.querySelectorAll('.ui-skeleton')).toHaveLength(3) // + the right-side chip
  })
})
