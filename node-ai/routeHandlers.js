import { OPENAI_MODEL } from './config.js'
import { readJsonBody, sendJson } from './http.js'
import { logErrorEvent, logEvent } from './logger.js'

const logRequestCompleted = ({ requestId, request, response, startedAt }) => {
  logEvent('http_request_completed', {
    requestId,
    method: request.method,
    path: request.url,
    statusCode: response.statusCode,
    durationMs: Date.now() - startedAt,
  })
}

export const handleOptions = ({ request, response, requestId, startedAt }) => {
  sendJson(response, 200, { ok: true }, requestId)
  logRequestCompleted({ requestId, request, response, startedAt })
}

export const handleHealth = ({ request, response, requestId, startedAt }) => {
  sendJson(response, 200, {
    status: 'ok',
    service: 'node-ai',
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: OPENAI_MODEL,
  }, requestId)
  logRequestCompleted({ requestId, request, response, startedAt })
}

export const handleToastMessage = async ({
  request,
  response,
  requestId,
  startedAt,
  generateToastMessageFn,
}) => {
  try {
    const toastMessage = await generateToastMessageFn(requestId)

    sendJson(response, 200, {
      success: true,
      toastMessage,
    }, requestId)
  } catch (error) {
    logErrorEvent('toast_generation_failed', {
      requestId,
      error: error.message,
      model: OPENAI_MODEL,
    })
    sendJson(response, 503, {
      success: false,
      detail: 'Toast generation is currently unavailable.',
    }, requestId)
  }

  logRequestCompleted({ requestId, request, response, startedAt })
}

export const handleChatbotReply = async ({
  request,
  response,
  requestId,
  startedAt,
  generateChatbotReplyFn,
}) => {
  try {
    const payload = await readJsonBody(request)
    const userMessage = typeof payload.userMessage === 'string' ? payload.userMessage.trim() : ''

    if (!userMessage) {
      sendJson(response, 400, {
        success: false,
        detail: 'userMessage is required.',
      }, requestId)
      logRequestCompleted({ requestId, request, response, startedAt })
      return
    }

    logEvent('chatbot_request_received', {
      requestId,
      channel: payload.channel,
      phone: payload.customer?.phone,
      trackingNumber: payload.shipment?.trackingNumber,
    })

    const chatbotReply = await generateChatbotReplyFn(payload, requestId)

    sendJson(response, 200, {
      success: true,
      ...chatbotReply,
    }, requestId)
  } catch (error) {
    logErrorEvent('chatbot_generation_failed', {
      requestId,
      error: error.message,
      model: OPENAI_MODEL,
    })
    sendJson(response, 503, {
      success: false,
      detail: 'Chatbot reply generation is currently unavailable.',
    }, requestId)
  }

  logRequestCompleted({ requestId, request, response, startedAt })
}

export const handleNotFound = ({ request, response, requestId, startedAt }) => {
  sendJson(response, 404, {
    success: false,
    detail: 'Not found.',
  }, requestId)
  logRequestCompleted({ requestId, request, response, startedAt })
}
