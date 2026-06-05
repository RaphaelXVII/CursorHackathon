/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { useStore } from '@/lib/store'
import WebcamToggle from '@/components/WebcamToggle'

jest.mock('@/lib/websocket', () => ({
  trackingSocket: { connect: jest.fn(), disconnect: jest.fn() },
}))

const initialState = {
  status: 'idle' as const,
  modelUrl: null,
  errorMessage: null,
  isActive: false,
  isConnected: false,
  params: {} as Record<string, number>,
}

beforeEach(() => {
  useStore.setState(initialState)
})

describe('WebcamToggle', () => {
  it('renders an enable tracking button when inactive', () => {
    render(<WebcamToggle />)
    expect(screen.getByRole('button', { name: /enable tracking/i })).toBeInTheDocument()
  })

  it('shows "Tracking on" when active and connected', () => {
    useStore.setState({ isActive: true, isConnected: true })
    render(<WebcamToggle />)
    expect(screen.getByRole('button', { name: /tracking on/i })).toBeInTheDocument()
  })
})
