import http from 'node:http'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'
import { buildChatbotInput, parseChatbotReply } from './chatbotPrompt.js'

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

export const generateToastMessage = async () => {
  if (!openAiClient) {
    throw new Error('OPENAI_API_KEY is not configured for node-ai.')
  }

  const response = await openAiClient.responses.create({
    model: OPENAI_MODEL,
    input: buildToastPrompt(),
  })

  const toastMessage = response.output_text?.trim()

  if (!toastMessage) {
    throw new Error('OpenAI returned an empty toast message.')
  }

  return toastMessage
}

export const generateChatbotReply = async (payload) => {
  if (!openAiClient) {
    throw new Error('OPENAI_API_KEY is not configured for node-ai.')
  }

  const response = await openAiClient.responses.create({
    model: OPENAI_MODEL,
    input: buildChatbotInput(payload),
  })

  return parseChatbotReply(response.output_text)
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

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  })
  response.end(JSON.stringify(payload))
}

export const createServer = ({
  generateToastMessageFn = generateToastMessage,
  generateChatbotReplyFn = generateChatbotReply,
} = {}) =>
  http.createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      sendJson(response, 200, { ok: true })
      return
    }

    if (request.method === 'GET' && request.url === '/health') {
      sendJson(response, 200, {
        status: 'ok',
        service: 'node-ai',
        openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
        model: OPENAI_MODEL,
      })
      return
    }

    if (request.method === 'GET' && request.url === '/toast-message') {
      try {
        const toastMessage = await generateToastMessageFn()

        sendJson(response, 200, {
          success: true,
          toastMessage,
        })
      } catch (error) {
        console.error('OpenAI toast generation failed:', error)
        sendJson(response, 503, {
          success: false,
          detail: 'Toast generation is currently unavailable.',
        })
      }

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
          })
          return
        }

        const chatbotReply = await generateChatbotReplyFn(payload)

        sendJson(response, 200, {
          success: true,
          ...chatbotReply,
        })
      } catch (error) {
        console.error('OpenAI chatbot generation failed:', error)
        sendJson(response, 503, {
          success: false,
          detail: 'Chatbot reply generation is currently unavailable.',
        })
      }

      return
    }

    sendJson(response, 404, {
      success: false,
      detail: 'Not found.',
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
