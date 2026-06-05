/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { useStore } from '@/lib/store'
import PromptInput from '@/components/PromptInput'

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

describe('PromptInput', () => {
  it('renders the prompt textarea and generate button', () => {
    render(<PromptInput />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate avatar/i })).toBeInTheDocument()
  })

  it('shows an element with role="alert" when status is error', () => {
    useStore.setState({ status: 'error', errorMessage: 'Could not reach backend' })
    render(<PromptInput />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/could not reach backend/i)).toBeInTheDocument()
  })

  it('shows progress steps while generating', () => {
    useStore.setState({ status: 'decomposing' })
    render(<PromptInput />)
    expect(screen.getByText(/decomposing prompt with claude/i)).toBeInTheDocument()
    expect(screen.getByText(/generating character layers/i)).toBeInTheDocument()
  })
})
