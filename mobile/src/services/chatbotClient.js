import { authenticatedFetch } from './authClient'


export async function sendMobileChatMessage({ customerName, customerPhone, message }) {
  const { response, data } = await authenticatedFetch('/chatbot/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: 'mobile',
      customerName,
      customerPhone,
      message,
    }),
  })

  if (!response.ok) {
    throw new Error(data.detail || 'Mobile chatbot is currently unavailable.')
  }

  return data
}
