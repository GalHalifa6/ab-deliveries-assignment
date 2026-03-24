jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}))

jest.mock('./authClient', () => ({
  authenticatedFetch: jest.fn(),
}))

jest.mock('./clientTelemetry', () => ({
  sendClientTelemetry: jest.fn(),
}))

import { Alert } from 'react-native'

import { authenticatedFetch } from './authClient'
import { sendClientTelemetry } from './clientTelemetry'
import {
  fetchMobileToastMessage,
  showMobileToast,
  tryFetchToastMessageWithFallback,
} from './toastService'


describe('toastService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('showMobileToast displays the branded mobile toast', () => {
    showMobileToast('Welcome aboard')

    expect(Alert.alert).toHaveBeenCalledWith('A.B Deliveries', 'Welcome aboard')
  })

  it('fetchMobileToastMessage returns true and shows the toast when ready', async () => {
    authenticatedFetch.mockResolvedValue({
      response: { ok: true },
      data: { ready: true, toastMessage: 'Welcome aboard' },
    })

    await expect(fetchMobileToastMessage()).resolves.toBe(true)
    expect(sendClientTelemetry).toHaveBeenCalledWith({
      event: 'mobile_toast_fetch_started',
      endpoint: '/me/toast',
    })
    expect(Alert.alert).toHaveBeenCalledWith('A.B Deliveries', 'Welcome aboard')
  })

  it('fetchMobileToastMessage returns false when the toast is not ready', async () => {
    authenticatedFetch.mockResolvedValue({
      response: { ok: true },
      data: { ready: false, toastMessage: null },
    })

    await expect(fetchMobileToastMessage()).resolves.toBe(false)
    expect(sendClientTelemetry).toHaveBeenCalledWith({
      event: 'mobile_toast_fetch_failed',
      endpoint: '/me/toast',
      success: false,
      detail: 'toast_not_ready',
    })
  })

  it('tryFetchToastMessageWithFallback stops after the first successful retry', async () => {
    jest.useFakeTimers()

    authenticatedFetch
      .mockResolvedValueOnce({
        response: { ok: true },
        data: { ready: false, toastMessage: null },
      })
      .mockResolvedValueOnce({
        response: { ok: true },
        data: { ready: true, toastMessage: 'Ready on retry' },
      })

    const pending = tryFetchToastMessageWithFallback()

    await jest.advanceTimersByTimeAsync(3000)
    await Promise.resolve()
    await jest.advanceTimersByTimeAsync(5000)
    await pending

    expect(authenticatedFetch).toHaveBeenCalledTimes(2)
    expect(Alert.alert).toHaveBeenCalledWith('A.B Deliveries', 'Ready on retry')

    jest.useRealTimers()
  })
})
