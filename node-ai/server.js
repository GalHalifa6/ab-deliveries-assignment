import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { HOST, PORT } from './config.js'
import { buildRequestId, logEvent } from './logger.js'
import { generateChatbotReply, generateToastMessage } from './openaiService.js'
import {
  handleChatbotReply,
  handleHealth,
  handleNotFound,
  handleOptions,
  handleToastMessage,
} from './routeHandlers.js'

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
      handleOptions({ request, response, requestId, startedAt })
      return
    }

    if (request.method === 'GET' && request.url === '/health') {
      handleHealth({ request, response, requestId, startedAt })
      return
    }

    if (request.method === 'GET' && request.url === '/toast-message') {
      await handleToastMessage({
        request,
        response,
        requestId,
        startedAt,
        generateToastMessageFn,
      })
      return
    }

    if (request.method === 'POST' && request.url === '/chatbot/reply') {
      await handleChatbotReply({
        request,
        response,
        requestId,
        startedAt,
        generateChatbotReplyFn,
      })
      return
    }

    handleNotFound({ request, response, requestId, startedAt })
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
