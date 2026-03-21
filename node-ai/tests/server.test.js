import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

import { createServer } from '../server.js'

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

test('GET /toast-message returns a generated toast payload', async () => {
  const server = createServer({
    generateToastMessageFn: async () => 'Freshly generated toast',
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const response = await makeRequest(server, '/toast-message')

    assert.equal(response.statusCode, 200)
    assert.equal(response.body.success, true)
    assert.equal(response.body.toastMessage, 'Freshly generated toast')
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
})

test('GET /toast-message returns 503 when generation fails', async () => {
  const server = createServer({
    generateToastMessageFn: async () => {
      throw new Error('boom')
    },
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  try {
    const response = await makeRequest(server, '/toast-message')

    assert.equal(response.statusCode, 503)
    assert.equal(response.body.success, false)
    assert.equal(response.body.detail, 'Toast generation is currently unavailable.')
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
