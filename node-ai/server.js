import http from 'node:http'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'

const HOST = process.env.HOST || '0.0.0.0'
const PORT = Number(process.env.PORT || 3001)
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini'
const openAiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

export const toastMessages = [
  "If you want to shoot, shoot. Don't talk.",
  "I'll be back.",
  'Say hello to my little friend!.',
  "Why so serious?",
  "With great power comes great responsibility.",
]

export const pickRandomMessage = () => {
  const index = Math.floor(Math.random() * toastMessages.length)
  return toastMessages[index]
}

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
    return pickRandomMessage()
  }

  try {
    const response = await openAiClient.responses.create({
      model: OPENAI_MODEL,
      input: buildToastPrompt(),
    })

    const toastMessage = response.output_text?.trim()

    if (!toastMessage) {
      return pickRandomMessage()
    }

    return toastMessage
  } catch (error) {
    console.error('OpenAI toast generation failed:', error)
    return pickRandomMessage()
  }
}

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  response.end(JSON.stringify(payload))
}

export const createServer = () =>
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
      const toastMessage = await generateToastMessage()

      sendJson(response, 200, {
        success: true,
        toastMessage,
      })
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
