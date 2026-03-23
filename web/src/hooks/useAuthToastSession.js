import { useEffect, useRef, useState } from 'react'
import { sendClientTelemetry } from '../services/clientTelemetry'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const WEB_CLIENT_TYPE = 'web'
const TOAST_STREAM_RECONNECT_DELAY_MS = 1000
const TOAST_STREAM_MAX_RECONNECTS = 3
const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.'

const parseJsonResponse = async (response) => {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

export function useAuthToastSession() {
  const [toastMessage, setToastMessage] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const accessTokenRef = useRef('')
  const refreshPromiseRef = useRef(null)
  const toastEventSourceRef = useRef(null)
  const toastReconnectTimeoutRef = useRef(null)

  useEffect(() => {
    if (!toastMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  useEffect(() => {
    accessTokenRef.current = accessToken
  }, [accessToken])

  useEffect(() => () => {
    toastEventSourceRef.current?.close()

    if (!toastReconnectTimeoutRef.current) {
      return
    }

    window.clearTimeout(toastReconnectTimeoutRef.current)
    toastReconnectTimeoutRef.current = null
  }, [])

  useEffect(() => {
    void refreshAccessToken().catch(() => {})
  }, [])

  const clearAccessToken = () => {
    accessTokenRef.current = ''
    setAccessToken('')
  }

  const setCurrentAccessToken = (nextAccessToken) => {
    accessTokenRef.current = nextAccessToken || ''
    setAccessToken(nextAccessToken || '')
  }

  const refreshAccessToken = async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    refreshPromiseRef.current = (async () => {
      sendClientTelemetry({
        event: 'auth_refresh_started',
        endpoint: '/refresh',
      })

      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': WEB_CLIENT_TYPE,
        },
      })
      const data = await parseJsonResponse(response)

      if (!response.ok || !data.auth?.accessToken) {
        sendClientTelemetry({
          event: 'auth_refresh_failed',
          endpoint: '/refresh',
          success: false,
          detail: data.detail || SESSION_EXPIRED_MESSAGE,
        })
        clearAccessToken()
        throw new Error(data.detail || SESSION_EXPIRED_MESSAGE)
      }

      setCurrentAccessToken(data.auth.accessToken)
      sendClientTelemetry({
        event: 'auth_refresh_succeeded',
        endpoint: '/refresh',
        success: true,
      })
      return data.auth.accessToken
    })()

    try {
      return await refreshPromiseRef.current
    } finally {
      refreshPromiseRef.current = null
    }
  }

  const fetchJson = async (path, options = {}, { requiresAuth = false, retryOnUnauthorized = true } = {}) => {
    const headers = {
      ...(options.headers || {}),
    }

    if (requiresAuth) {
      if (!accessTokenRef.current) {
        await refreshAccessToken()
      }

      headers.Authorization = `Bearer ${accessTokenRef.current}`
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers,
    })
    const data = await parseJsonResponse(response)

    if (requiresAuth && response.status === 401 && retryOnUnauthorized) {
      const nextAccessToken = await refreshAccessToken()

      const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
        credentials: 'include',
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${nextAccessToken}`,
        },
      })
      const retryData = await parseJsonResponse(retryResponse)
      return { response: retryResponse, data: retryData }
    }

    return { response, data }
  }

  const clearToastReconnectTimer = () => {
    if (!toastReconnectTimeoutRef.current) {
      return
    }

    window.clearTimeout(toastReconnectTimeoutRef.current)
    toastReconnectTimeoutRef.current = null
  }

  const resetToastStream = () => {
    toastEventSourceRef.current?.close()
    toastEventSourceRef.current = null
    clearToastReconnectTimer()
  }

  const createToastStreamSession = async () => {
    const { response, data } = await fetchJson(
      '/me/toast/stream-session',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      { requiresAuth: true }
    )

    if (!response.ok) {
      throw new Error(data.detail || 'Could not open the live toast stream.')
    }
  }

  const subscribeToToastStream = async (attempt = 0) => {
    resetToastStream()

    try {
      await createToastStreamSession()
    } catch {
      if (attempt >= TOAST_STREAM_MAX_RECONNECTS) {
        return
      }

      toastReconnectTimeoutRef.current = window.setTimeout(() => {
        void subscribeToToastStream(attempt + 1)
      }, TOAST_STREAM_RECONNECT_DELAY_MS)
      return
    }

    const eventSource = new EventSource(`${API_BASE_URL}/me/toast/stream`, {
      withCredentials: true,
    })

    toastEventSourceRef.current = eventSource
    sendClientTelemetry({
      event: 'web_toast_stream_connected',
      endpoint: '/me/toast/stream',
      success: true,
    })

    const scheduleReconnect = () => {
      eventSource.close()
      toastEventSourceRef.current = null

      if (attempt >= TOAST_STREAM_MAX_RECONNECTS) {
        clearToastReconnectTimer()
        return
      }

      clearToastReconnectTimer()
      toastReconnectTimeoutRef.current = window.setTimeout(() => {
        void subscribeToToastStream(attempt + 1)
      }, TOAST_STREAM_RECONNECT_DELAY_MS)
      sendClientTelemetry({
        event: 'web_toast_stream_reconnect_scheduled',
        endpoint: '/me/toast/stream',
        detail: `attempt:${attempt + 1}`,
      })
    }

    eventSource.addEventListener('toast-ready', (event) => {
      try {
        const payload = JSON.parse(event.data)

        if (payload.toastMessage) {
          setToastMessage(payload.toastMessage)
          clearToastReconnectTimer()
        }
      } finally {
        eventSource.close()
        toastEventSourceRef.current = null
      }
    })

    eventSource.addEventListener('timeout', () => {
      scheduleReconnect()
    })

    eventSource.onerror = () => {
      sendClientTelemetry({
        event: 'web_toast_stream_error',
        endpoint: '/me/toast/stream',
        success: false,
      })
      scheduleReconnect()
    }
  }

  return {
    accessToken,
    clearAccessToken,
    fetchJson,
    resetToastStream,
    setCurrentAccessToken,
    subscribeToToastStream,
    toastMessage,
    setToastMessage,
    sessionExpiredMessage: SESSION_EXPIRED_MESSAGE,
  }
}
