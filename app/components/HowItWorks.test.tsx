import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HowItWorks } from './HowItWorks'

describe('HowItWorks', () => {
  it('renders the section heading', () => {
    render(<HowItWorks />)
    expect(screen.getByText('How it works')).toBeInTheDocument()
  })

  it('renders all four steps in order', () => {
    render(<HowItWorks />)
    expect(screen.getByText('Create your vault')).toBeInTheDocument()
    expect(screen.getByText('Deposit your tokens')).toBeInTheDocument()
    expect(screen.getByText('Check in regularly')).toBeInTheDocument()
    expect(screen.getByText('Heirs claim automatically')).toBeInTheDocument()
  })
})
