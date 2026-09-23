import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { InfoIcon, Tooltip } from './Tooltip'

describe('InfoIcon', () => {
  it('does not show the tooltip text by default', () => {
    render(<InfoIcon tooltip="Explains the thing" />)
    expect(screen.queryByText('Explains the thing')).not.toBeInTheDocument()
  })

  it('shows the tooltip text on hover and hides it again on mouse leave', () => {
    render(<InfoIcon tooltip="Explains the thing" />)
    const trigger = screen.getByLabelText('More information')

    fireEvent.mouseEnter(trigger)
    expect(screen.getByText('Explains the thing')).toBeInTheDocument()

    fireEvent.mouseLeave(trigger)
    expect(screen.queryByText('Explains the thing')).not.toBeInTheDocument()
  })

  it('shows the tooltip text on keyboard focus and hides it again on blur — not hover-only', () => {
    render(<InfoIcon tooltip="Explains the thing" />)
    const trigger = screen.getByLabelText('More information')

    fireEvent.focus(trigger)
    expect(screen.getByText('Explains the thing')).toBeInTheDocument()

    fireEvent.blur(trigger)
    expect(screen.queryByText('Explains the thing')).not.toBeInTheDocument()
  })

  it('closes the tooltip on Escape while it has keyboard focus', () => {
    render(<InfoIcon tooltip="Explains the thing" />)
    const trigger = screen.getByLabelText('More information')

    fireEvent.focus(trigger)
    expect(screen.getByText('Explains the thing')).toBeInTheDocument()

    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByText('Explains the thing')).not.toBeInTheDocument()
  })

  it('is reachable by Tab (in the tab order) and has an accessible name, since the visible "i" glyph alone is not descriptive', () => {
    render(<InfoIcon tooltip="Explains the thing" />)
    const trigger = screen.getByLabelText('More information')

    expect(trigger).toHaveAttribute('tabIndex', '0')
    // The visible "i" glyph is decorative — the accessible name lives on the trigger itself.
    expect(trigger.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('wires aria-describedby on the trigger to the tooltip content, which has role="tooltip"', () => {
    render(<InfoIcon tooltip="Explains the thing" />)
    const trigger = screen.getByLabelText('More information')

    fireEvent.focus(trigger)
    const bubble = screen.getByRole('tooltip')
    expect(bubble).toHaveTextContent('Explains the thing')
    expect(trigger.getAttribute('aria-describedby')).toBe(bubble.id)
    expect(bubble.id).toBeTruthy()
  })

  it('gives every InfoIcon on a page its own unique id, so aria-describedby never collides', () => {
    render(
      <>
        <InfoIcon tooltip="First tip" />
        <InfoIcon tooltip="Second tip" />
      </>
    )
    const [first, second] = screen.getAllByLabelText('More information')

    fireEvent.focus(first)
    fireEvent.focus(second)
    const [firstBubble, secondBubble] = screen.getAllByRole('tooltip')

    expect(firstBubble.id).not.toBe(secondBubble.id)
    expect(first.getAttribute('aria-describedby')).toBe(firstBubble.id)
    expect(second.getAttribute('aria-describedby')).toBe(secondBubble.id)
  })

  it('does not intercept clicks meant for content behind it (the bubble ignores pointer events)', () => {
    render(<InfoIcon tooltip="Explains the thing" />)
    fireEvent.focus(screen.getByLabelText('More information'))

    expect(screen.getByRole('tooltip').style.pointerEvents).toBe('none')
  })
})

describe('Tooltip', () => {
  it('works without a label (aria-label is optional — only InfoIcon requires one)', () => {
    render(
      <Tooltip text="Explains the thing">
        <span>trigger</span>
      </Tooltip>
    )
    const trigger = screen.getByText('trigger')

    expect(trigger.getAttribute('aria-label')).toBeNull()
    fireEvent.focus(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Explains the thing')
  })
})
