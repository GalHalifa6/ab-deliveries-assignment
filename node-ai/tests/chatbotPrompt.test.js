import assert from 'node:assert/strict'
import test from 'node:test'

import { buildChatbotInput, parseChatbotReply, readChatbotPrompt } from '../chatbotPrompt.js'


test('readChatbotPrompt returns the configured prompt text', () => {
  const prompt = readChatbotPrompt()

  assert.equal(typeof prompt, 'string')
  assert.ok(prompt.length > 50)
})

test('buildChatbotInput includes the dynamic context marker and payload', () => {
  const input = buildChatbotInput({
    channel: 'web',
    userMessage: 'Where is AB1001?',
  })

  assert.match(input, /DYNAMIC CONTEXT \(JSON\):/)
  assert.match(input, /"channel": "web"/)
  assert.match(input, /"userMessage": "Where is AB1001\?"/)
})

test('parseChatbotReply accepts valid structured JSON', () => {
  const result = parseChatbotReply(
    JSON.stringify({
      reply: 'Your shipment is on the way.',
      intent: 'tracking',
    }),
  )

  assert.deepEqual(result, {
    reply: 'Your shipment is on the way.',
    intent: 'tracking',
  })
})

test('parseChatbotReply rejects invalid JSON', () => {
  assert.throws(
    () => parseChatbotReply('not-json'),
    /OpenAI chatbot response was not valid JSON/,
  )
})

test('parseChatbotReply rejects unsupported intents', () => {
  assert.throws(
    () =>
      parseChatbotReply(
        JSON.stringify({
          reply: 'Hello',
          intent: 'unsupported',
        }),
      ),
    /valid intent field/,
  )
})
