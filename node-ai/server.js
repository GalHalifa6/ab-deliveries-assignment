import http from 'node:http'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'
import { buildChatbotInput, parseChatbotReply } from './chatbotPrompt.js'
import { buildRequestId, logErrorEvent, logEvent } from './logger.js'

const HOST = process.env.HOST || '0.0.0.0'
const PORT = Number(process.env.PORT || 3001)
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini'
const openAiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const buildToastPrompt = () =>
  [
    'Write one short welcome toast message for a new delivery-platform user.',
    'Requirements:',
    '- plain English',
    '- friendly and upbeat',
    '- maximum 14 words',
    '- no quotation marks',
    '- no emojis',
    '- no markdown',
    '- sound a little varied from run to run',
  ].join('\n')

export const generateToastMessage = async (requestId = null) => {
  if (!openAiClient) {
    throw new Error('OPENAI_API_KEY is not configured for node-ai.')
  }

  logEvent('toast_generation_started', { requestId, model: OPENAI_MODEL })

  const response = await openAiClient.responses.create({
    model: OPENAI_MODEL,
    input: buildToastPrompt(),
  })

  const toastMessage = response.output_text?.trim()

  if (!toastMessage) {
    throw new Error('OpenAI returned an empty toast message.')
  }

  logEvent('toast_generation_succeeded', { requestId, model: OPENAI_MODEL })

  return toastMessage
}

export const generateChatbotReply = async (payload, requestId = null) => {
  if (!openAiClient) {
    throw new Error('OPENAI_API_KEY is not configured for node-ai.')
  }

  logEvent('chatbot_generation_started', {
    requestId,
    model: OPENAI_MODEL,
    phone: payload?.customer?.phone,
    trackingNumber: payload?.shipment?.trackingNumber,
    channel: payload?.channel,
  })

  const response = await openAiClient.responses.create({
    model: OPENAI_MODEL,
    input: buildChatbotInput(payload),
  })

  const parsed = parseChatbotReply(response.output_text)

  logEvent('chatbot_generation_succeeded', {
    requestId,
    model: OPENAI_MODEL,
    phone: payload?.customer?.phone,
    trackingNumber: payload?.shipment?.trackingNumber,
    intent: parsed.intent,
    channel: payload?.channel,
  })

  return parsed
}

const readJsonBody = async (request) => {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (!chunks.length) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
}

const sendJson = (response, statusCode, payload, requestId = null) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Request-ID',
    'X-Request-ID': requestId || '',
  })
  response.end(JSON.stringify(payload))
}

export const createServer = ({
  generateToastMessageFn = generateToastMessage,
  generateChatbotReplyFn = generateChatbotReply,
} = {}) =>
  http.createServer(async (request, response) => {
    const requestId = request.headers['x-request-id'] || buildRequestId()
    const startedAt = Date.now()

    logEvent('http_request_started', {
      requestId,
      method: request.method,
      path: request.url,
    })

    if (request.method === 'OPTIONS') {
      sendJson(response, 200, { ok: true }, requestId)
      logEvent('http_request_completed', {
        requestId,
        method: request.method,
        path: request.url,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
      })
      return
    }

    if (request.method === 'GET' && request.url === '/health') {
      sendJson(response, 200, {
        status: 'ok',
        service: 'node-ai',
        openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
        model: OPENAI_MODEL,
      }, requestId)
      logEvent('http_request_completed', {
        requestId,
        method: request.method,
        path: request.url,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
      })
      return
    }

    if (request.method === 'GET' && request.url === '/toast-message') {
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

      logEvent('http_request_completed', {
        requestId,
        method: request.method,
        path: request.url,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      })
      return
    }

    if (request.method === 'POST' && request.url === '/chatbot/reply') {
      try {
        const payload = await readJsonBody(request)
        const userMessage = typeof payload.userMessage === 'string' ? payload.userMessage.trim() : ''

        if (!userMessage) {
          sendJson(response, 400, {
            success: false,
            detail: 'userMessage is required.',
          }, requestId)
          logEvent('http_request_completed', {
            requestId,
            method: request.method,
            path: request.url,
            statusCode: 400,
            durationMs: Date.now() - startedAt,
          })
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

      logEvent('http_request_completed', {
        requestId,
        method: request.method,
        path: request.url,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      })
      return
    }

    sendJson(response, 404, {
      success: false,
      detail: 'Not found.',
    }, requestId)
    logEvent('http_request_completed', {
      requestId,
      method: request.method,
      path: request.url,
      statusCode: 404,
      durationMs: Date.now() - startedAt,
    })
  })

export const startServer = (host = HOST, port = PORT) => {
  const server = createServer()

  return server.listen(port, host, () => {
    console.log(`Node AI service listening on http://${host}:${port}`)
  })
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isDirectRun) {
  startServer()
}
