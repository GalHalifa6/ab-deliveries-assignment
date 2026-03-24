import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ChatbotWidget } from '../components/ChatbotWidget'


afterEach(() => {
  cleanup()
})


const buildProps = (overrides = {}) => ({
  isOpen: false,
  onToggle: vi.fn(),
  isAuthenticated: false,
  onLoginIntent: vi.fn(),
  onRegisterIntent: vi.fn(),
  chatMessages: [],
  chatInput: '',
  onInputChange: vi.fn(),
  onSubmit: vi.fn(),
  isSubmitting: false,
  isSubmitDisabled: false,
  stateMessage: '',
  stateStatus: 'idle',
  ...overrides,
})


describe('ChatbotWidget', () => {
  it('shows the launcher when the panel is closed', async () => {
    const user = userEvent.setup()
    const props = buildProps()

    render(<ChatbotWidget {...props} />)

    expect(screen.getByRole('button', { name: 'Chat with us' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Delivery assistant')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Chat with us' }))

    expect(props.onToggle).toHaveBeenCalledTimes(1)
  })

  it('renders the gated open state when the user is not authenticated', async () => {
    const user = userEvent.setup()
    const props = buildProps({
      isOpen: true,
    })

    render(<ChatbotWidget {...props} />)

    expect(screen.getByText('Log in or create an account to chat with the delivery assistant on the website.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in to chat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Register to chat' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Ask about a shipment or paste a tracking number like GP6566')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log in to chat' }))
    await user.click(screen.getByRole('button', { name: 'Register to chat' }))

    expect(props.onLoginIntent).toHaveBeenCalledTimes(1)
    expect(props.onRegisterIntent).toHaveBeenCalledTimes(1)
  })

  it('renders the open authenticated state with messages', () => {
    render(
      <ChatbotWidget
        {...buildProps({
          isOpen: true,
          isAuthenticated: true,
          chatMessages: [
            { id: '1', role: 'assistant', content: 'Hello there' },
            { id: '2', role: 'user', content: 'Where is GP6566?' },
          ],
          chatInput: 'Track GP6566',
          stateMessage: 'Ready to help',
          stateStatus: 'success',
        })}
      />,
    )

    expect(screen.getByLabelText('Delivery assistant')).toBeInTheDocument()
    expect(screen.getByText('Hello there')).toBeInTheDocument()
    expect(screen.getByText('Where is GP6566?')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Track GP6566')).toBeInTheDocument()
    expect(screen.getByText('Ready to help')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide chat' })).toBeInTheDocument()
  })

  it('disables inputs and shows sending state while submitting', () => {
    render(
      <ChatbotWidget
        {...buildProps({
          isOpen: true,
          isAuthenticated: true,
          isSubmitting: true,
          isSubmitDisabled: true,
        })}
      />,
    )

    expect(screen.getByPlaceholderText('Ask about a shipment or paste a tracking number like GP6566')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled()
  })
})
