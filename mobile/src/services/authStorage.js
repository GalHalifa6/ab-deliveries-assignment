import * as SecureStore from 'expo-secure-store'

const ACCESS_TOKEN_KEY = 'ab_deliveries_access_token'
const REFRESH_TOKEN_KEY = 'ab_deliveries_refresh_token'

export async function saveAccessToken(token) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token)
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
}

export async function clearAccessToken() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY)
}

export async function saveRefreshToken(token) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token)
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
}

export async function clearRefreshToken() {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
}

export async function saveAuthTokens({ accessToken, refreshToken }) {
  if (accessToken) {
    await saveAccessToken(accessToken)
  } else {
    await clearAccessToken()
  }

  if (refreshToken) {
    await saveRefreshToken(refreshToken)
  } else {
    await clearRefreshToken()
  }
}

export async function clearAuthTokens() {
  await Promise.all([clearAccessToken(), clearRefreshToken()])
}
