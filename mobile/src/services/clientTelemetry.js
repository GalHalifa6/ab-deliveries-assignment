import { API_BASE_URL } from '../constants/auth'

function isTelemetryDisabled() {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
}

export function sendClientTelemetry(payload) {
  if (isTelemetryDisabled()) {
    return
  }

  Promise.resolve(
    fetch(`${API_BASE_URL}/telemetry/client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client: 'mobile',
        platform: 'react-native',
        ...payload,
      }),
    })
  ).catch(() => {})
}
