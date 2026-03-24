jest.mock('./authClient', () => ({
  authenticatedFetch: jest.fn(),
}))

import { authenticatedFetch } from './authClient'
import { sendMobileChatMessage } from './chatbotClient'


describe('chatbotClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends mobile channel payload through the shared chatbot endpoint', async () => {
    authenticatedFetch.mockResolvedValue({
      response: { ok: true },
      data: {
        reply: 'Your shipment is on the way.',
        intent: 'tracking',
      },
    })

    const result = await sendMobileChatMessage({
      customerName: 'Gal Halifa',
      customerPhone: '+972501234567',
      message: 'Where is AB1001?',
    })

    expect(authenticatedFetch).toHaveBeenCalledWith(
      '/chatbot/messages',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )
    expect(JSON.parse(authenticatedFetch.mock.calls[0][1].body)).toEqual({
      channel: 'mobile',
      customerName: 'Gal Halifa',
      customerPhone: '+972501234567',
      message: 'Where is AB1001?',
    })
    expect(result.intent).toBe('tracking')
  })

  it('throws a friendly error when the backend request fails', async () => {
    authenticatedFetch.mockResolvedValue({
      response: { ok: false },
      data: {
        detail: 'Backend error',
      },
    })

    await expect(
      sendMobileChatMessage({
        customerName: 'Gal Halifa',
        customerPhone: '+972501234567',
        message: 'Hello',
      }),
    ).rejects.toThrow('Backend error')
  })
})
