import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { WrongNetworkBanner } from './WrongNetworkBanner'

describe('WrongNetworkBanner', () => {
  it('renders nothing when the network is correct', () => {
    const { container } = render(
      <WrongNetworkBanner isWrongNetwork={false} isSwitching={false} onSwitch={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the persistent warning and calls onSwitch when clicked', () => {
    const onSwitch = vi.fn()
    render(<WrongNetworkBanner isWrongNetwork={true} isSwitching={false} onSwitch={onSwitch} />)

    const banner = screen.getByTestId('wrong-network-banner')
    expect(banner).toHaveTextContent('Wrong network — click to switch to Arc Testnet')

    fireEvent.click(banner)
    expect(onSwitch).toHaveBeenCalledTimes(1)
  })

  it('shows a switching state and disables the banner while a switch is already in progress', () => {
    const onSwitch = vi.fn()
    render(<WrongNetworkBanner isWrongNetwork={true} isSwitching={true} onSwitch={onSwitch} />)

    const banner = screen.getByTestId('wrong-network-banner')
    expect(banner).toHaveTextContent('Switching to Arc Testnet')
    expect(banner).toBeDisabled()
  })
})
