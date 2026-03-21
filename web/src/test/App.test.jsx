import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App.jsx'

describe('App auth flow', () => {
  let eventSourceInstances

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    eventSourceInstances = []

    class MockEventSource {
      constructor(url, options) {
        this.url = url
        this.options = options
        this.listeners = new Map()
        this.onerror = null
        this.closed = false
        eventSourceInstances.push(this)
      }

      addEventListener(eventName, listener) {
        this.listeners.set(eventName, listener)
      }

      emit(eventName, payload) {
        const listener = this.listeners.get(eventName)

        if (listener) {
          listener({
            data: JSON.stringify(payload),
          })
        }
      }

      close() {
        this.closed = true
      }
    }

    vi.stubGlobal('EventSource', MockEventSource)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('switches from login mode to register mode', async () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByRole('heading', { name: 'Sign up' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Phone number')).toBeInTheDocument()
  })

  it('disables register submission when passwords do not match', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    fireEvent.change(screen.getByPlaceholderText('Full name'), {
      target: { value: 'Gal Halifa' },
    })
    fireEvent.change(screen.getByPlaceholderText('Phone number'), {
      target: { value: '0501234567' },
    })
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'gal@example.com' },
    })

    const passwordInputs = screen.getAllByPlaceholderText('Password')
    fireEvent.change(passwordInputs[0], {
      target: { value: 'secret123' },
    })
    fireEvent.change(screen.getByPlaceholderText('Repeat password'), {
      target: { value: 'different123' },
    })

    const registerButton = screen.getByRole('button', { name: 'Register' })

    expect(registerButton).toBeDisabled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submits register successfully and shows the toast message', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Welcome aboard, Gal!',
          toastPending: true,
          user: {
            email: 'gal@example.com',
          },
        }),
      })

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    fireEvent.change(screen.getByPlaceholderText('Full name'), {
      target: { value: 'Gal Halifa' },
    })
    fireEvent.change(screen.getByPlaceholderText('Phone number'), {
      target: { value: '0501234567' },
    })
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'gal@example.com' },
    })

    const passwordInputs = screen.getAllByPlaceholderText('Password')
    fireEvent.change(passwordInputs[0], {
      target: { value: 'secret123' },
    })
    fireEvent.change(screen.getByPlaceholderText('Repeat password'), {
      target: { value: 'secret123' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    eventSourceInstances[0].emit('toast-ready', {
      toastMessage: "I'll be back.",
    })

    expect(await screen.findByText('Welcome aboard, Gal!')).toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent("I'll be back.")
    expect(eventSourceInstances[0].closed).toBe(true)
  })
})
