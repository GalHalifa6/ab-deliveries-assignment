jest.mock('./authStorage', () => ({
  clearAuthTokens: jest.fn(async () => {
    tokens.accessToken = null
    tokens.refreshToken = null
  }),
  getAccessToken: jest.fn(async () => tokens.accessToken),
  getRefreshToken: jest.fn(async () => tokens.refreshToken),
  saveAuthTokens: jest.fn(async ({ accessToken, refreshToken }) => {
    tokens.accessToken = accessToken ?? null
    tokens.refreshToken = refreshToken ?? null
  }),
}))

jest.mock('../constants/auth', () => ({
  API_BASE_URL: 'http://example.test',
}))

const tokens = {
  accessToken: null,
  refreshToken: null,
}

describe('authClient', () => {
  beforeEach(() => {
    tokens.accessToken = null
    tokens.refreshToken = null
    global.fetch = jest.fn()
    jest.resetModules()
  })

  afterEach(() => {
    delete global.fetch
  })

  it('persists rotated tokens when refresh succeeds', async () => {
    tokens.refreshToken = 'refresh-old'
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        auth: { accessToken: 'access-new' },
        refreshToken: 'refresh-new',
      }),
    })

    const { refreshMobileAccessToken } = require('./authClient')

    await expect(refreshMobileAccessToken()).resolves.toBe('access-new')
    expect(tokens).toEqual({
      accessToken: 'access-new',
      refreshToken: 'refresh-new',
    })
  })

  it('retries an authenticated request after a 401 using a refreshed access token', async () => {
    tokens.accessToken = 'access-old'
    tokens.refreshToken = 'refresh-old'
    global.fetch
      .mockResolvedValueOnce({
        status: 401,
        json: async () => ({
          detail: 'expired',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          auth: { accessToken: 'access-new' },
          refreshToken: 'refresh-new',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ready: true,
        }),
      })

    const { authenticatedFetch } = require('./authClient')

    const result = await authenticatedFetch('/me/toast')

    expect(result.response.ok).toBe(true)
    expect(tokens).toEqual({
      accessToken: 'access-new',
      refreshToken: 'refresh-new',
    })
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'http://example.test/me/toast',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-old',
        }),
      })
    )
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      'http://example.test/me/toast',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-new',
        }),
      })
    )
  })

  it('clears stored tokens when refresh fails', async () => {
    tokens.refreshToken = 'refresh-old'
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        detail: 'Refresh token is invalid.',
      }),
    })

    const { refreshMobileAccessToken } = require('./authClient')

    await expect(refreshMobileAccessToken()).rejects.toThrow('Refresh token is invalid.')
    expect(tokens).toEqual({
      accessToken: null,
      refreshToken: null,
    })
  })
})
