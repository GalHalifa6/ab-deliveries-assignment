import http from 'node:http'

const PORT = Number(process.env.PORT || 3001)

const toastMessages = [
  "If you want to shoot, shoot. Don't talk.",
  "I'll be back.",
  'Say hello to my little friend!.',
  "Why so serious?",
  "With great power comes great responsibility.",
]

const pickRandomMessage = () => {
  const index = Math.floor(Math.random() * toastMessages.length)
  return toastMessages[index]
}

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  response.end(JSON.stringify(payload))
}

const server = http.createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 200, { ok: true })
    return
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { status: 'ok' })
    return
  }

  if (request.method === 'GET' && request.url === '/toast-message') {
    sendJson(response, 200, {
      success: true,
      toastMessage: pickRandomMessage()
    })
    return
  }

  sendJson(response, 404, {
    success: false,
    detail: 'Not found.'
  })
})

server.listen(PORT, () => {
  console.log(`Node AI service listening on http://127.0.0.1:${PORT}`)
})
