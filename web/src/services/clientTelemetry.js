const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

function isTelemetryDisabled() {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return true
  }

  return Boolean(import.meta.env?.MODE === 'test')
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
        client: 'web',
        platform: 'browser',
        ...payload,
      }),
    })
  ).catch(() => {})
}
