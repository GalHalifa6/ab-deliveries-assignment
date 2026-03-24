import OpenAI from 'openai'
import { buildChatbotInput, parseChatbotReply } from './chatbotPrompt.js'
import { OPENAI_MODEL } from './config.js'
import { logEvent } from './logger.js'

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

const requireOpenAiClient = () => {
  if (!openAiClient) {
    throw new Error('OPENAI_API_KEY is not configured for node-ai.')
  }

  return openAiClient
}

export const generateToastMessage = async (requestId = null) => {
  const client = requireOpenAiClient()

  logEvent('toast_generation_started', { requestId, model: OPENAI_MODEL })

  const response = await client.responses.create({
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
  const client = requireOpenAiClient()

  logEvent('chatbot_generation_started', {
    requestId,
    model: OPENAI_MODEL,
    phone: payload?.customer?.phone,
    trackingNumber: payload?.shipment?.trackingNumber,
    channel: payload?.channel,
  })

  const response = await client.responses.create({
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
