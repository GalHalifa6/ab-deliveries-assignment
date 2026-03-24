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
  chatProfile: {
    fullName: '',
    phone: '',
  },
  onProfileChange: vi.fn(),
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

  it('renders the open state with guest profile fields and messages', () => {
    render(
      <ChatbotWidget
        {...buildProps({
          isOpen: true,
          chatProfile: {
            fullName: 'Gal',
            phone: '+972501234567',
          },
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
    expect(screen.getByDisplayValue('Gal')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+972501234567')).toBeInTheDocument()
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
          isSubmitting: true,
          isSubmitDisabled: true,
        })}
      />,
    )

    expect(screen.getByPlaceholderText('Your name')).toBeDisabled()
    expect(screen.getByPlaceholderText('Contact phone')).toBeDisabled()
    expect(screen.getByPlaceholderText('Ask about a shipment or paste a tracking number like GP6566')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled()
  })
})
