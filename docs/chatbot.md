# A.B Deliveries Chatbot Architecture

## Goal

Build a minimal but realistic chatbot flow for the extended assignment with:

- WhatsApp as the customer channel
- MongoDB as the shipment-status source
- Google Sheets as the conversation log
- OpenAI as the customer-service and sales assistant
- prompt documentation stored in the repository

The goal is not to build a full logistics platform. The goal is to build a clean end-to-end system that:

1. receives a customer message from WhatsApp
2. identifies the customer by phone number or tracking number
3. looks up shipment data in MongoDB
4. generates a reply in the same language used by the customer
5. gently supports upsell when relevant
6. logs the conversation to Google Sheets

## Current Implementation Status

The repository already includes a working end-to-end chatbot flow:

- Twilio WhatsApp Sandbox is the first live channel adapter
- the authenticated React web app is the second live channel adapter
- `python-server/` exposes:
  - `POST /chatbot/messages`
  - `POST /chatbot/webhooks/whatsapp`
- `node-ai/` exposes:
  - `POST /chatbot/reply`
- MongoDB stores shipment data in `shipments`
- Google Sheets logging is implemented and verified
- Azure Container Apps host the live `python-server` and `node-ai` chatbot services

## Recommended Architecture

Use the existing repo in this shape:

- `python-server/`
  - source of truth for MongoDB
  - channel adapters and chatbot orchestration
  - shipment lookup logic
  - Google Sheets logging integration

- `node-ai/`
  - OpenAI integration
  - chatbot prompt construction
  - structured response generation in the customer's language

- `chatbot/`
  - architecture note
  - `PROMPT.md`
  - implementation plan

- Google Sheets
  - audit log for all chatbot conversations

This keeps responsibilities clear:

- Python = adapters, orchestration, business data, integrations
- Node AI = prompting and language generation
- Google Sheets = human-readable conversation log

## Channel-Agnostic Core

The chatbot core should not depend on WhatsApp only.

WhatsApp is the first supported adapter, but the main chatbot logic should stay channel-agnostic so the system can support additional channels later without rewriting the core behavior.

Future channels may include:

- web chat
- email
- CRM integrations
- SMS
- additional messaging platforms

When a new channel is added, these parts should remain unchanged:

- customer identification
- shipment lookup
- prompt construction
- AI response generation
- conversation logging
- support and sales behavior rules

Each platform should be implemented as a separate adapter layer that:

1. receives the platform-specific payload
2. maps it into a shared internal message format
3. calls the chatbot orchestration service
4. maps the chatbot response back into the platform format

The reusable core should stay the same:

- chatbot orchestrator
- shipment repository
- AI service
- logging service

This is the main benefit of the design:

- WhatsApp works now
- future channels can be added later with minimal duplication
- the business logic stays in one place

## Future Channel Extension

If a new channel is added later, the expected implementation pattern is:

### Add a New Adapter

Examples:

- `POST /chatbot/webhooks/web`
- `POST /chatbot/webhooks/email`
- `POST /chatbot/webhooks/crm`
- `POST /chatbot/webhooks/sms`

That adapter should only handle channel-specific concerns:

- webhook/authentication requirements
- incoming payload parsing
- sender identity extraction
- response formatting for that provider

### Reuse the Shared Core

The adapter should then pass a normalized message object into the same orchestration flow used by WhatsApp.

Suggested normalized internal format:

```json
{
  "channel": "whatsapp",
  "externalUserId": "+972501234567",
  "customerPhone": "+972501234567",
  "customerName": null,
  "messageText": "איפה החבילה שלי?",
  "messageId": "provider-message-id",
  "timestamp": "2026-03-22T12:00:00Z"
}
```

Once converted into this format, the rest of the flow should stay exactly the same:

- customer identification
- shipment lookup
- AI prompt orchestration
- AI response handling
- conversation logging

This keeps the current design compatible with the existing codebase while making future expansion straightforward.

## Main Components

### 1. WhatsApp Channel

Recommended provider:

- Twilio WhatsApp Sandbox for fastest implementation

Why:

- easiest setup for a technical assignment
- straightforward webhook flow
- easier than direct Meta WhatsApp Cloud API for a first implementation

WhatsApp will send inbound customer messages to a Python webhook endpoint.

In the updated design, WhatsApp is only the first channel adapter, not the full chatbot core.

### 1.1 Web Channel

The web app now uses the generic Python adapter endpoint:

- `POST /chatbot/messages`

The authenticated React client sends:

- `channel: "web"`
- the logged-in user's full name
- the logged-in user's phone number
- the user message text

This means the website chat widget reuses the same orchestrator, shipment lookup, AI service, and Google Sheets log as WhatsApp.

### 2. Python Backend

This should become both:

- the first channel adapter host
- the chatbot orchestration layer

Responsibilities:

- receive inbound WhatsApp webhook requests
- normalize platform-specific payloads into a shared internal format
- look up shipment/customer data in MongoDB
- call `node-ai` with:
  - customer message
  - phone number
  - shipment context
  - business rules
- receive generated Hebrew reply
- send reply back through Twilio
- log both sides of the conversation to Google Sheets

This is the right place because:

- MongoDB is already connected here
- the backend already owns business data
- adapter + persistence logic belongs here more than in `node-ai`

### 3. Node AI Service

Extend the existing `node-ai` service instead of creating another AI service.

Current role:

- generates registration toast messages

New role:

- keep toast endpoint as is
- add one chatbot generation endpoint

Suggested new endpoint:

- `POST /chatbot/reply`

Its job:

- receive structured input from Python
- load the prompt from `chatbot/PROMPT.md`
- call OpenAI
- return only the structured assistant reply

This keeps all prompt logic in one place.

### 4. MongoDB

MongoDB should store shipment data and, optionally, conversation history.

Required collection:

- `shipments`

Optional collection:

- `chatbot_conversations`

Google Sheets is still the required visible log, but MongoDB can help with debugging or session context.

### 5. Google Sheets

Google Sheets should be the official conversation log for the assignment.

Why it is a strong choice:

- easy for reviewers to inspect
- **clearly shows name, phone, and conversation details**
- demonstrates correct data transfer

The Python backend should append rows to a sheet after each inbound and outbound message.

## End-to-End Webhook Flow

This is the recommended runtime flow for the current live channel adapters: WhatsApp and web.

### Inbound Flow

1. The customer sends a message from either WhatsApp or the authenticated website chat widget.
2. The channel adapter sends the request to Python:
   - WhatsApp: `POST /chatbot/webhooks/whatsapp`
   - Web: `POST /chatbot/messages`
3. The adapter extracts or forwards:
   - sender phone number
   - message text
   - timestamp if available
   - provider message id if available
4. The adapter maps the request into the shared internal format.
5. The chatbot orchestrator tries to identify the customer:
   - first by phone number
   - if needed by tracking number extracted from the message
6. The chatbot orchestrator loads shipment context from MongoDB.
7. The chatbot orchestrator sends a structured request to `node-ai`:
   - customer phone
   - detected customer name
   - shipment status data
   - user message
   - business rules
8. `node-ai` generates a reply in the same language used by the customer.
9. The chatbot orchestrator logs:
   - customer name
   - phone number
   - user message
   - assistant reply
   - timestamp
   - conversation id
   - shipment/tracking reference if available
10. The adapter formats the response for the calling channel:
   - WhatsApp returns TwiML to Twilio
   - web returns JSON to the React client

### Outbound Behavior

The assistant should:

- answer in the same language used by the customer
- be concise and useful
- provide shipment status if data exists
- ask for missing details if data is insufficient
- never invent status information
- suggest another delivery order naturally when relevant

## MongoDB Collections

### 1. `shipments`

This is the core new collection.

Purpose:

- hold package status information that the chatbot can actually query

Suggested minimal schema:

```json
{
  "_id": "ObjectId",
  "trackingNumber": "AB123456",
  "customerName": "Gal Halifa",
  "phone": "+972501234567",
  "status": "out_for_delivery",
  "statusLabel": "בדרך למסירה",
  "pickupAddress": "Tel Aviv",
  "deliveryAddress": "Haifa",
  "destinationCity": "Haifa",
  "estimatedDelivery": "2026-03-23T15:00:00Z",
  "createdAt": 1774000000,
  "updatedAt": 1774003600
}
```

Recommended indexed fields:

- `trackingNumber` unique
- `phone`
- maybe `customerName`

Minimal statuses to support:

- `created`
- `picked_up`
- `in_transit`
- `out_for_delivery`
- `delivered`
- `delayed`

### 2. `chatbot_conversations` (optional)

Purpose:

- store structured transcript data for debugging or future context memory

Suggested minimal schema:

```json
{
  "_id": "ObjectId",
  "conversationId": "whatsapp:+972501234567",
  "platform": "whatsapp",
  "customerName": "Gal Halifa",
  "phone": "+972501234567",
  "trackingNumber": "AB123456",
  "messages": [
    {
      "role": "user",
      "text": "איפה החבילה שלי?",
      "timestamp": 1774000000
    },
    {
      "role": "assistant",
      "text": "החבילה שלך בדרך למסירה ותגיע היום עד 15:00.",
      "timestamp": 1774000001
    }
  ],
  "createdAt": 1774000000,
  "updatedAt": 1774000001
}
```

This collection is optional because Google Sheets is the main assignment log.

## How Identification Should Work

The assistant should identify the customer in this order:

1. by WhatsApp sender phone number
2. by tracking number mentioned in the message
3. if still unclear, ask for one of:
   - tracking number
   - full name
   - phone confirmation

Practical rule:

- if exactly one active shipment matches the phone number, use it
- if multiple shipments match, ask which tracking number they mean
- if none match, say no shipment was found and offer help creating a new order

## Prompt Structure

Keep the final exact prompt in:

- `chatbot/PROMPT.md`

## Proposed System Prompt

Use this exact system prompt for the chatbot:

```text
You are an AI customer service and sales assistant for a delivery company called "A.B Deliveries".

LANGUAGE:
- Support both Hebrew and English.
- Automatically reply in the same language used by the customer.
- If the customer writes in Hebrew, reply in Hebrew.
- If the customer writes in English, reply in English.
- Do not ask the customer which language they prefer.

GOALS:
1. Help customers with delivery-related questions.
2. Assist with package tracking.
3. Provide general support.
4. Encourage additional orders in a subtle and natural way.

TONE:
- Friendly, polite, and professional.
- Warm and helpful, not robotic.
- Keep responses short (1–2 sentences).
- You may use light emojis when appropriate.

BEHAVIOR RULES:
- If the user asks about package status:
  → Ask for missing information (tracking number / phone / name).
- If required data is missing:
  → Ask a clear follow-up question.
- NEVER invent package details or tracking results.
- NEVER claim access to real systems if none exists.
- If the user is frustrated:
  → Respond with empathy before giving instructions.
- Stay strictly within delivery-related topics.

SALES BEHAVIOR:
- Suggest additional services ONLY when it fits naturally.
- Do not push aggressively.
- Example: faster delivery, multiple shipments, business solutions.

ERROR HANDLING:
- If the request is unclear → ask for clarification.
- If the request is unrelated → politely redirect to delivery topics.

OUTPUT FORMAT (STRICT):
You MUST return ONLY a valid JSON object with NO extra text.

Format:
{
  "reply": "<response in the customer's language>",
  "intent": "<tracking | support | sales | general>"
}

CONSTRAINTS:
- No text outside JSON.
- No explanations.
- No markdown.
- No code blocks.
- Only valid JSON.
```

The AI request should use a structured prompt with two parts:

### System Prompt

The system prompt should define:

- identity:
  - you are the Hebrew WhatsApp assistant of A.B Deliveries
- language:
  - reply in natural, friendly language that matches the customer's message
- role:
  - customer support for package status
  - light sales support for new deliveries
- rules:
  - do not invent shipment information
  - if data is missing, ask a short follow-up question
  - if status exists, explain it clearly
  - if appropriate, gently suggest ordering another delivery
  - do not be aggressive or overly salesy
- keep messages concise for WhatsApp
- never ask the user which language they want; infer it from their message

### Dynamic Context Block

The Python backend should send structured context to `node-ai`, for example:

```json
{
  "platform": "whatsapp",
  "customer": {
    "name": "Gal Halifa",
    "phone": "+972501234567"
  },
  "shipment": {
    "trackingNumber": "AB123456",
    "status": "out_for_delivery",
    "statusLabel": "בדרך למסירה",
    "estimatedDelivery": "2026-03-23T15:00:00Z",
    "destinationCity": "Haifa"
  },
  "userMessage": "איפה החבילה שלי?"
}
```

This is important:

- OpenAI should not fetch shipment data itself
- the chatbot orchestrator should provide the trusted shipment context
- the model should only explain and communicate it well

## Google Sheets Logging Design

Log one row per message pair.

Recommended columns:

- `timestamp`
- `conversationId`
- `platform`
- `customerName`
- `phone`
- `trackingNumber`
- `shipmentStatus`
- `userMessage`
- `assistantReply`

This is enough to satisfy:

- caller's name
- phone number
- conversation details

Recommended implementation:

- create one Google Cloud service account
- share the target sheet with the service account email
- Python backend appends rows through Google Sheets API

Why Python should own logging:

- it already has the webhook payload
- it already has the shipment lookup result
- it already gets the final AI reply back
- that means Python can log the complete verified record in one place

## Runtime Configuration

The current implementation is environment-driven so the same code can run:

- locally with logging disabled
- in Azure with Google Sheets enabled
- in Twilio sandbox or production WhatsApp mode
- in Hebrew or English without changing deployment configuration

### Python Server Environment Variables

Core chatbot integration:

- `NODE_AI_CHATBOT_URL`
- `SHIPMENTS_COLLECTION_NAME`

Google Sheets logging:

- `GOOGLE_SHEETS_LOGGING_ENABLED`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_SHEET_NAME`
- `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` or `GOOGLE_SERVICE_ACCOUNT_FILE`

WhatsApp / Twilio:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `TWILIO_VALIDATE_SIGNATURE`
- `TWILIO_WHATSAPP_WEBHOOK_URL`

Recommended production behavior:

- enable `TWILIO_VALIDATE_SIGNATURE=true`
- set `TWILIO_WHATSAPP_WEBHOOK_URL` to the public HTTPS webhook URL used by Twilio
- enable `GOOGLE_SHEETS_LOGGING_ENABLED=true` only after the service account has access to the spreadsheet

### Google Sheets Setup

1. Create a Google Cloud service account.
2. Enable the Google Sheets API for that project.
3. Share the target Google Sheet with the service account email.
4. Set:
   - `GOOGLE_SHEETS_LOGGING_ENABLED=true`
   - `GOOGLE_SHEETS_SPREADSHEET_ID=<spreadsheet id>`
   - either `GOOGLE_SERVICE_ACCOUNT_JSON=<json>` or `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<base64>` or `GOOGLE_SERVICE_ACCOUNT_FILE=<path>`

Recommended sheet columns:

- `timestamp`
- `channel`
- `customerName`
- `phone`
- `trackingNumber`
- `shipmentStatus`
- `userMessage`
- `assistantReply`
- `intent`

### Twilio WhatsApp Setup

1. Create or use a Twilio account with WhatsApp enabled.
2. Use the Twilio WhatsApp Sandbox for the first live test.
3. Point the inbound webhook to:
   - `POST /chatbot/webhooks/whatsapp`
4. For production-style validation, set:
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_VALIDATE_SIGNATURE=true`
   - `TWILIO_WHATSAPP_WEBHOOK_URL=<public https webhook url>`

The webhook route is intentionally thin:

- it reads Twilio form fields
- optionally validates the Twilio signature
- maps the payload into the shared chatbot flow
- returns TwiML XML back to Twilio

## Minimal Endpoints To Implement First

Start with the smallest vertical slice.

### In `python-server/`

1. `POST /chatbot/webhooks/whatsapp`

Purpose:

- receive inbound WhatsApp message
- act as the first channel adapter
- pass normalized input into the chatbot orchestrator

2. `POST /chatbot/messages`

Purpose:

- internal or local test endpoint
- lets you test the channel-agnostic orchestrator without Twilio

3. Optional internal helper:
- `GET /chatbot/shipments/by-phone`
- not required if lookup stays purely inside the service layer

Realistically:

- `POST /chatbot/webhooks/whatsapp` is enough for the real integration
- `POST /chatbot/messages` is very helpful for local development and testing

### In `node-ai/`

1. `POST /chatbot/reply`

Purpose:

- accept structured chatbot context
- call OpenAI
- return:
  - `reply`
  - `intent`

### No extra public endpoints are required at first

Keep the first version small.

## Minimal Files To Implement First

### Python

Suggested additions:

- `python-server/app/services/chatbot_service.py`

  - shared chatbot orchestrator
  - customer identification
  - shipment lookup
  - call node-ai
  - call Google Sheets logger

- `python-server/app/services/channel_adapter_service.py`

  - normalize inbound provider payloads
  - format outbound provider responses
  - keep WhatsApp-specific mapping out of the main orchestrator

- `python-server/app/repositories/shipment_repository.py`

  - `get_by_tracking_number`
  - `get_recent_by_phone`

- `python-server/app/routes/chatbot_routes.py`

  - WhatsApp webhook route
  - generic local test route

- `python-server/app/services/google_sheets_service.py`

  - append conversation rows

### Node

Suggested additions:

- `node-ai/chatbotPrompt.js`
- `node-ai/chatbotPrompt.js`
- `node-ai/chatbotResponseSchema.js`
- `node-ai/server.js`

Recommended approach:

- keep `server.js` as the transport layer
- move prompt construction and response validation into small dedicated modules

### Documentation

- `chatbot/PROMPT.md`
- `docs/chatbot.md`

## Recommended First Build Order

Build order that was used:

1. Create `shipments` collection and seed 5 to 10 realistic records.
2. Add Python shipment repository.
3. Add `chatbot/PROMPT.md` as the source of truth for the system prompt.
4. Add `POST /chatbot/reply` in `node-ai`.
5. Add `chatbot_service.py` as the shared orchestrator.
6. Add `POST /chatbot/messages` for local channel-agnostic testing.
7. Add Google Sheets logging service.
8. Add WhatsApp adapter route and Twilio-specific mapping.
9. Add real Twilio WhatsApp webhook config.
10. Deploy updated Python and Node services to Azure.
11. Validate the end-to-end flow in WhatsApp.

## Minimal Seed Data Recommendation

Seed a few realistic shipments so demos are reliable.

Examples:

- one delivered shipment
- one out-for-delivery shipment
- one delayed shipment
- one in-transit shipment
- one customer with two shipments to test ambiguity

This will make the assistant demo much stronger.

## Recommended MVP Scope

For the first clean submission, implement only:

- channel-agnostic orchestrator
- WhatsApp as the first adapter
- shipment lookup by phone and tracking number
- one OpenAI-powered Hebrew reply endpoint
- Google Sheets append logging
- prompt documentation

Do not add:

- admin dashboards
- agent handoff
- multi-turn memory beyond simple context
- full order creation flow
- complex analytics

That keeps the project clean and presentable.

## Final Recommendation

The best first implementation for this repository is:

- Twilio WhatsApp webhook into `python-server`
- channel adapter layer in Python for inbound and outbound provider mapping
- shared chatbot orchestrator in Python
- shipment lookup in MongoDB through Python
- AI reply generation in `node-ai`
- conversation logging from Python to Google Sheets
- prompt documentation in `chatbot/PROMPT.md`

This is the smallest version that still feels production-style and should score well on:

- prompt quality
- correctness of transferred data
- realistic architecture
- clarity of presentation
