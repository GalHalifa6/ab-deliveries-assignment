const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Request-ID',
}

export const readJsonBody = async (request) => {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (!chunks.length) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
}

export const sendJson = (response, statusCode, payload, requestId = null) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId || '',
    ...CORS_HEADERS,
  })
  response.end(JSON.stringify(payload))
}
