const mockStore = new Map()

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key, value) => {
    mockStore.set(key, value)
  }),
  getItemAsync: jest.fn(async (key) => mockStore.get(key) ?? null),
  deleteItemAsync: jest.fn(async (key) => {
    mockStore.delete(key)
  }),
}))

describe('authStorage', () => {
  beforeEach(() => {
    mockStore.clear()
    jest.resetModules()
  })

  it('persists both access and refresh tokens together', async () => {
    const { getAccessToken, getRefreshToken, saveAuthTokens } = require('./authStorage')

    await saveAuthTokens({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    })

    await expect(getAccessToken()).resolves.toBe('access-1')
    await expect(getRefreshToken()).resolves.toBe('refresh-1')
  })

  it('clears both tokens together', async () => {
    const { clearAuthTokens, getAccessToken, getRefreshToken, saveAuthTokens } = require('./authStorage')

    await saveAuthTokens({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    })
    await clearAuthTokens()

    await expect(getAccessToken()).resolves.toBeNull()
    await expect(getRefreshToken()).resolves.toBeNull()
  })
})
