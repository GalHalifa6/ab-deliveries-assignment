import { Alert } from 'react-native'
import { authenticatedFetch } from './authClient'
import { sendClientTelemetry } from './clientTelemetry'

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

export function showMobileToast(message) {
  Alert.alert('A.B Deliveries', message)
}

export async function fetchMobileToastMessage() {
  sendClientTelemetry({
    event: 'mobile_toast_fetch_started',
    endpoint: '/me/toast',
  })

  const { response, data } = await authenticatedFetch('/me/toast')

  if (response.ok && data.ready && data.toastMessage) {
    sendClientTelemetry({
      event: 'mobile_toast_fetch_succeeded',
      endpoint: '/me/toast',
      success: true,
    })
    showMobileToast(data.toastMessage)
    return true
  }

  sendClientTelemetry({
    event: 'mobile_toast_fetch_failed',
    endpoint: '/me/toast',
    success: false,
    detail: response.ok ? 'toast_not_ready' : data.detail || 'request_failed',
  })
  return false
}

export async function tryFetchToastMessageWithFallback() {
  try {
    const retrySchedule = [3000, 5000, 8000]

    for (const waitTime of retrySchedule) {
      await delay(waitTime)

      if (await fetchMobileToastMessage()) {
        return
      }
    }
  } catch {
    return
  }
}
