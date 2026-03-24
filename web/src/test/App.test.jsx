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
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        detail: 'No refresh session.',
      }),
    })

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByRole('heading', { name: 'Sign up' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Phone number')).toBeInTheDocument()
  })

  it('disables register submission when passwords do not match', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        detail: 'No refresh session.',
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
      target: { value: 'different123' },
    })

    expect(screen.getByRole('button', { name: 'Register' })).toBeDisabled()
  })

  it('submits register successfully and shows the toast message over SSE', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          detail: 'No refresh session.',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Welcome aboard, Gal!',
          toastPending: true,
          auth: {
            accessToken: 'register-token',
            clientType: 'web',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: {
            fullName: 'Gal Halifa',
            phone: '+972501234567',
            email: 'gal@example.com',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: {
            fullName: 'Gal Halifa',
            phone: '+972501234567',
            email: 'gal@example.com',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: {
            fullName: 'Gal Halifa',
            phone: '+972501234567',
            email: 'gal@example.com',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
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

    expect(await screen.findByText('Welcome aboard, Gal!')).toBeInTheDocument()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/toast/stream-session'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer register-token',
          }),
        })
      )
    })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/me/toast/stream-session'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer register-token',
        }),
      })
    )

    eventSourceInstances[0].emit('toast-ready', {
      toastMessage: 'Fresh toast message',
    })

    expect(await screen.findByRole('status')).toHaveTextContent('Fresh toast message')
    expect(eventSourceInstances[0].url).toContain('/me/toast/stream')
    expect(eventSourceInstances[0].options).toEqual({ withCredentials: true })
  })

  it('refreshes the access token before creating the stream session after a 401', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          detail: 'No refresh session.',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Welcome aboard, Gal!',
          toastPending: true,
          auth: {
            accessToken: 'expired-token',
            clientType: 'web',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          detail: 'Authentication token has expired.',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          auth: {
            accessToken: 'refreshed-token',
            clientType: 'web',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: {
            fullName: 'Gal Halifa',
            phone: '+972501234567',
            email: 'gal@example.com',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
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
      expect(fetch).toHaveBeenCalledTimes(5)
    })

    expect(fetch).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/me/toast/stream-session'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer expired-token',
        }),
      })
    )
    expect(fetch).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('/refresh'),
      expect.objectContaining({
        method: 'POST',
      })
    )
    expect(fetch).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('/me/toast/stream-session'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer refreshed-token',
        }),
      })
    )
  })

  it('reopens the SSE stream after a timeout by creating a new stream session', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          detail: 'No refresh session.',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Welcome aboard, Gal!',
          toastPending: true,
          auth: {
            accessToken: 'register-token',
            clientType: 'web',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: {
            fullName: 'Gal Halifa',
            phone: '+972501234567',
            email: 'gal@example.com',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
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
      expect(eventSourceInstances).toHaveLength(1)
    })

    eventSourceInstances[0].emit('timeout', {})

    await waitFor(() => {
      expect(eventSourceInstances).toHaveLength(2)
    }, { timeout: 3000 })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/me/toast/stream-session'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer register-token',
        }),
      })
    )

    eventSourceInstances[1].emit('toast-ready', {
      toastMessage: 'Toast after reconnect',
    })

    expect(await screen.findByRole('status')).toHaveTextContent('Toast after reconnect')
  }, 10000)

  it('keeps the chatbot visible but gated until the user signs in', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          detail: 'No refresh session.',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          channel: 'web',
          reply: 'Your package AB1001 is on the way.',
          intent: 'tracking',
        }),
      })

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Chat with us' }))

    expect(screen.getByText('Log in or create an account to chat with the delivery assistant on the website.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('shows signed-in status and allows logout', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          detail: 'No refresh session.',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Welcome back!',
          auth: {
            accessToken: 'login-token',
            clientType: 'web',
          },
          user: {
            fullName: 'Gal Halifa',
            phone: '+972501234567',
            email: 'gal@example.com',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: {
            fullName: 'Gal Halifa',
            phone: '+972501234567',
            email: 'gal@example.com',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      })

    render(<App />)

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'gal@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByText('Logged in as gal@example.com.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/logout'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      )
    })

    expect(await screen.findByText('Logged out successfully.')).toBeInTheDocument()
  })

})
