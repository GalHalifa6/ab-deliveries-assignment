import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

import { createServer, pickRandomMessage, toastMessages } from '../server.js'

const makeRequest = (server, path, method = 'GET') =>
  new Promise((resolve, reject) => {
    const { port } = server.address()
    const request = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method,
      },
      (response) => {
        let rawBody = ''

        response.on('data', (chunk) => {
          rawBody += chunk
        })

        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            body: JSON.parse(rawBody),
          })
        })
      },
    )

    request.on('error', reject)
    request.end()
  })

test('pickRandomMessage returns one of the supported toast messages', () => {
  const message = pickRandomMessage()

  assert.ok(toastMessages.includes(message))
})

test('GET /health returns service metadata', async () => {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const response = await makeRequest(server, '/health')

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.status, 'ok')
    assert.equal(response.body.service, 'node-ai')
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
})

test('GET /toast-message returns a random toast payload', async () => {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const response = await makeRequest(server, '/toast-message')

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.success, true)
    assert.equal(typeof response.body.toastMessage, 'string')
    assert.ok(response.body.toastMessage.length > 0)
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
})

test('OPTIONS requests return a successful preflight response', async () => {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const response = await makeRequest(server, '/toast-message', 'OPTIONS')

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.ok, true)
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
})

test('unknown routes return 404', async () => {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const response = await makeRequest(server, '/missing')

    assert.equal(response.statusCode, 404)
    assert.equal(response.body.success, false)
    assert.equal(response.body.detail, 'Not found.')
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
})
