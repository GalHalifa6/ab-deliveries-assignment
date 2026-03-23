import crypto from 'node:crypto'

const normalizeFields = (fields) =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && value !== null))

export const buildRequestId = () => crypto.randomUUID().replace(/-/g, '')

export const logEvent = (event, fields = {}) => {
  const payload = {
    event,
    ...normalizeFields(fields),
  }

  console.log(JSON.stringify(payload))
}

export const logErrorEvent = (event, fields = {}) => {
  const payload = {
    event,
    ...normalizeFields(fields),
  }

  console.error(JSON.stringify(payload))
}
