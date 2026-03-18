import http from 'node:http'
import { fileURLToPath } from 'node:url'

const HOST = process.env.HOST || '0.0.0.0'
const PORT = Number(process.env.PORT || 3001)

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
  http.createServer((request, response) => {
    if (request.method === 'OPTIONS') {
      sendJson(response, 200, { ok: true })
      return
    }

    if (request.method === 'GET' && request.url === '/health') {
      sendJson(response, 200, {
        status: 'ok',
        service: 'node-ai',
        openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      })
      return
    }

    if (request.method === 'GET' && request.url === '/toast-message') {
      sendJson(response, 200, {
        success: true,
        toastMessage: pickRandomMessage(),
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
