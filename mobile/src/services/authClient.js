import { API_BASE_URL } from '../constants/auth'
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from './authStorage'

const MOBILE_CLIENT_TYPE = 'mobile'

async function parseJsonResponse(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

export async function refreshMobileAccessToken() {
  const refreshToken = await getRefreshToken()

  if (!refreshToken) {
    await clearAuthTokens()
    throw new Error('Your session has expired. Please sign in again.')
  }

  const response = await fetch(`${API_BASE_URL}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Type': MOBILE_CLIENT_TYPE,
    },
    body: JSON.stringify({ refreshToken }),
  })
  const data = await parseJsonResponse(response)

  if (!response.ok || !data.auth?.accessToken || !data.refreshToken) {
    await clearAuthTokens()
    throw new Error(data.detail || 'Your session has expired. Please sign in again.')
  }

  await saveAuthTokens({
    accessToken: data.auth.accessToken,
    refreshToken: data.refreshToken,
  })

  return data.auth.accessToken
}

export async function authenticatedFetch(path, options = {}, { retryOnUnauthorized = true } = {}) {
  let accessToken = await getAccessToken()

  if (!accessToken) {
    accessToken = await refreshMobileAccessToken()
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${accessToken}`,
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
  const data = await parseJsonResponse(response)

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshedAccessToken = await refreshMobileAccessToken()

    const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${refreshedAccessToken}`,
      },
    })
    const retryData = await parseJsonResponse(retryResponse)
    return { response: retryResponse, data: retryData }
  }

  return { response, data }
}

export async function persistAuthResponse(data) {
  await saveAuthTokens({
    accessToken: data.auth?.accessToken || null,
    refreshToken: data.refreshToken || null,
  })
}
