import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { InfoIcon } from './Tooltip'

describe('InfoIcon', () => {
  it('does not show the tooltip text by default', () => {
    render(<InfoIcon tooltip="Explains the thing" />)
    expect(screen.queryByText('Explains the thing')).not.toBeInTheDocument()
  })

  it('shows the tooltip text on hover and hides it again on mouse leave', () => {
    render(<InfoIcon tooltip="Explains the thing" />)
    const trigger = screen.getByText('i')

    fireEvent.mouseEnter(trigger)
    expect(screen.getByText('Explains the thing')).toBeInTheDocument()

    fireEvent.mouseLeave(trigger)
    expect(screen.queryByText('Explains the thing')).not.toBeInTheDocument()
  })
})
