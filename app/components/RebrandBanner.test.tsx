import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RebrandBanner } from './RebrandBanner'

describe('RebrandBanner', () => {
  it('shows the rebrand notice and dismisses it when the close button is clicked', () => {
    render(<RebrandBanner />)

    expect(screen.getByTestId('rebrand-banner')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Dismiss'))
    expect(screen.queryByTestId('rebrand-banner')).not.toBeInTheDocument()
  })

  it('gives the dismiss button a visible keyboard focus ring, same as the other utility buttons', () => {
    render(<RebrandBanner />)

    expect(screen.getByLabelText('Dismiss')).toHaveClass('ui-focus-ring')
  })
})
