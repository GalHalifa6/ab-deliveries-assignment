import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const VALID_INTENTS = new Set(['tracking', 'support', 'sales', 'general'])
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROMPT_PATHS = [
  path.resolve(__dirname, '../chatbot/PROMPT.md'),
  path.resolve(__dirname, './PROMPT.md'),
]

export const readChatbotPrompt = () => {
  const promptPath = PROMPT_PATHS.find((candidate) => fs.existsSync(candidate))

  if (!promptPath) {
    throw new Error('Chatbot prompt file was not found.')
  }

  return fs.readFileSync(promptPath, 'utf-8').trim()
}

export const buildChatbotInput = (payload) =>
  [
    readChatbotPrompt(),
    '',
    'DYNAMIC CONTEXT (JSON):',
    JSON.stringify(payload, null, 2),
  ].join('\n')

export const parseChatbotReply = (rawText) => {
  let parsed

  try {
    parsed = JSON.parse((rawText || '').trim())
  } catch (error) {
    throw new Error(`OpenAI chatbot response was not valid JSON: ${error.message}`)
  }

  if (!parsed || typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
    throw new Error('OpenAI chatbot response did not include a valid reply field.')
  }

  if (!VALID_INTENTS.has(parsed.intent)) {
    throw new Error('OpenAI chatbot response did not include a valid intent field.')
  }

  return {
    reply: parsed.reply.trim(),
    intent: parsed.intent,
  }
}
