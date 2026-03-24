# A.B Deliveries Project Explanation

This document explains the final implementation of the A.B Deliveries assignment in practical terms:

- what was built
- which components exist
- how they connect to each other
- how data moves through the system
- how authentication works
- how the chatbot works
- how logging, CI/CD, and deployment work

It is written as a project handoff and submission companion.

## 1. Project Goal

The project implements the A.B Deliveries assignment with two main parts:

1. The base assignment
   
   - mobile registration/login experience
   - web registration/login experience
   - Python backend
   - MongoDB persistence
   - asynchronous post-registration toast message generated through a second Node.js AI service

2. The extended assignment
   
   - a friendly AI customer-service and sales chatbot
   - WhatsApp and web as customer channels
   - package-status support using real shipment data from MongoDB
   - conversation logging to Google Sheets
   - prompt documentation in the repository

## 2. High-Level Architecture

The system is built as a small multi-service application with clear responsibilities.

Main components:

- `web/`
  
  - React web client
  - registration/login UI
  - Google sign-in
  - authenticated browser behavior
  - SSE-based toast delivery
  - auth-gated web chatbot launcher

- `mobile/`
  
  - React Native / Expo mobile client
  - registration/login UI
  - secure token storage
  - refresh-aware authenticated requests
  - auth-gated mobile chatbot launcher

- `python-server/`
  
  - main backend API
  - authentication
  - MongoDB access
  - user persistence
  - refresh session management
  - toast state storage
  - chatbot orchestration
  - Google Sheets logging
  - Twilio WhatsApp webhook handling

- `node-ai/`
  
  - OpenAI-facing AI service
  - generates registration toast messages
  - generates chatbot replies

- MongoDB Atlas
  
  - persistent data store
  - users
  - refresh sessions
  - shipments

- Google Sheets
  
  - chatbot conversation/business log

- Twilio WhatsApp Sandbox
  
  - inbound/outbound WhatsApp channel for the chatbot

- Azure
  
  - hosts the deployed services
  - `web`, `python-server`, and `node-ai` run on Azure Container Apps
  - Azure Container Registry stores Docker images
  - Azure Log Analytics stores operational logs

## 3. Repository Structure

- `web/`
  
  - React application for the browser

- `mobile/`
  
  - React Native / Expo mobile app

- `python-server/`
  
  - FastAPI application
  - business logic and orchestration layer

- `node-ai/`
  
  - Node.js AI microservice

- `chatbot/`
  
  - chatbot prompt and chatbot support assets

- `docs/`
  
  - architecture and deployment notes

- `.github/workflows/`
  
  - CI, deploy, and security automation

## 4. Technologies Used

Frontend web:

- React
- Vite
- Vitest
- Testing Library

Frontend mobile:

- React Native
- Expo
- Expo Secure Store
- Jest

Backend:

- Python
- FastAPI
- Uvicorn
- PyMongo
- Passlib
- PyJWT
- `python-multipart`
- `httpx`

AI service:

- Node.js
- OpenAI Node SDK

Infrastructure and external services:

- MongoDB Atlas
- Twilio WhatsApp Sandbox
- Google Sheets API
- Azure Container Apps
- Azure Container Registry
- Docker
- Docker Compose
- GitHub Actions
- CodeQL
- Gitleaks

Design:

- Figma

## 4.1 How To Run The Modules

The project can be run module by module depending on what needs to be demonstrated.

### Python backend

```bash
cd python-server
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --env-file .env
```

### Node AI

```bash
cd node-ai
npm install
npm start
```

### Web

```bash
cd web
npm install
npm run dev
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

The mobile app is intended to be run through Expo during development:

- scan the QR code with Expo Go
- or run it on an emulator

Important note:

- unlike the web app, the mobile client is not hosted as a separate always-on Azure frontend
- the mobile UI runs locally through Expo
- it still connects to the same backend system

### Practical local run combinations

Most common combinations:

- web only:
  - run `python-server`
  - run `node-ai`
  - run `web`
- mobile only:
  - run `python-server`
  - run `node-ai`
  - run `mobile`
- chatbot verification with the deployed backend:
  - run `mobile` locally in Expo
  - or use the live web app
  - and point the client to the deployed Azure backend when needed

## 5. Main Runtime Components and Their Responsibilities

### 5.1 Web Client

The web client is responsible for:

- rendering the registration and login UI
- supporting email/password auth plus Google sign-in
- sending login/register requests to the Python API
- sending Google ID tokens to `POST /login/google`
- storing the access token in memory only
- relying on an `HttpOnly` refresh cookie for session continuation
- opening an authenticated SSE stream to receive the toast message after registration
- rendering an authenticated website chatbot widget
- forwarding website chatbot messages into the shared Python chatbot adapter with `channel: "web"`
- sending lightweight operational telemetry events to the backend

Important files:

- `web/src/App.jsx`
- `web/src/hooks/useAuthToastSession.js`
- `web/src/services/clientTelemetry.js`

### 5.2 Mobile Client

The mobile client is responsible for:

- rendering the registration and login UI
- sending login/register requests to the Python API
- storing both access and refresh tokens in Expo Secure Store
- automatically refreshing the session on `401`
- polling for the toast message in a low-noise fallback flow after registration
- sending lightweight operational telemetry events to the backend
- exposing the same authenticated chat-entry pattern as the web app

Important files:

- `mobile/src/screens/AuthScreen.js`
- `mobile/src/services/authClient.js`
- `mobile/src/services/authStorage.js`
- `mobile/src/services/clientTelemetry.js`

### 5.3 Python Server

The Python server is the main system backend and orchestration layer.

It is responsible for:

- user registration and login
- password hashing and verification
- issuing access tokens
- verifying Google ID tokens before issuing local app auth
- creating and rotating refresh sessions
- storing users in MongoDB
- saving and loading toast message state
- handling authenticated routes
- handling chatbot requests
- handling Twilio WhatsApp webhook traffic
- logging chatbot conversations to Google Sheets
- receiving web/mobile telemetry
- emitting structured operational logs

Important folders/files:

- `python-server/app/main.py`
- `python-server/app/routes/`
- `python-server/app/services/`
- `python-server/app/repositories/`

### 5.4 Node AI Service

The Node AI service is intentionally narrow.

It is responsible for:

- generating registration toast messages through OpenAI
- generating chatbot replies through OpenAI
- enforcing a structured chatbot response format
- loading the chatbot prompt
- emitting structured operational logs

Important files:

- `node-ai/server.js`
- `node-ai/chatbotPrompt.js`
- `node-ai/PROMPT.md`
- `node-ai/logger.js`

### 5.5 MongoDB Atlas

MongoDB is the main persistent datastore.

Collections currently used:

- `users`
- `refresh_sessions`
- `shipments`

Legacy session-era collections were cleaned up during the auth migration.

### 5.6 Google Sheets

Google Sheets is used as the business log for the chatbot.

It records:

- timestamp
- channel
- customer name
- phone
- tracking number
- shipment status
- user message
- assistant reply
- intent

This satisfies the assignment requirement for conversation logging.

### 5.7 Twilio WhatsApp Sandbox

Twilio provides the first chatbot channel adapter.

It is responsible for:

- receiving WhatsApp messages from users
- forwarding them to the deployed Python webhook
- delivering TwiML-based replies back to WhatsApp

The chatbot core itself is channel-agnostic. WhatsApp is simply the first adapter.

## 6. Data Model

### 6.1 `users`

Purpose:

- stores application users

Fields used:

- `fullName`
- `phone`
- `email`
- `passwordHash`
- `toastMessage`
- `createdAt`

### 6.2 `refresh_sessions`

Purpose:

- stores refresh-token session state
- controls token rotation and revocation

Fields used:

- `sessionId`
- `userEmail`
- `clientType`
- `refreshTokenHash`
- `tokenFamilyId`
- `createdAt`
- `expiresAt`
- `lastUsedAt`
- `revokedAt`

Important security point:

- the raw refresh token is not stored in MongoDB
- only a hash of the refresh token is stored

### 6.3 `shipments`

Purpose:

- stores package/shipment data for the chatbot

Typical fields:

- `trackingNumber`
- `customerName`
- `phone`
- `status`
- `statusLabel`
- `estimatedDelivery`
- `destinationCity`
- `createdAt`
- `updatedAt`

This collection allows the chatbot to answer package-status questions from real backend data instead of a mock dataset.

## 7. Registration Flow

The registration flow works like this:

1. The user fills the registration form on web or mobile.
2. The client sends `POST /register` to the Python API.
3. The Python backend validates:
   - required fields
   - password length
   - duplicate email
4. The backend hashes the password with Passlib.
5. The backend writes the new user into the `users` collection.
6. The backend creates a refresh session in `refresh_sessions`.
7. The backend issues a short-lived access token.
8. After registration, the backend starts asynchronous toast generation through `node-ai`.
9. Once the toast message is generated, it is stored on the user record in MongoDB.
10. The frontend later receives or fetches the toast.

### Web registration result

The web client receives:

- an access token in the response body
- a refresh token as an `HttpOnly` cookie

### Mobile registration result

The mobile client receives:

- an access token
- a refresh token

Mobile stores both in Expo Secure Store.

## 8. Authentication Flow

The project uses a JWT access token + refresh session model.

### 8.1 Access token

The access token is:

- short-lived
- signed JWT
- sent in the `Authorization` header

It contains:

- user identity
- session id
- client type
- expiry metadata

### 8.2 Refresh session

A refresh session represents a durable login session for one client context.

Examples:

- one browser login creates one refresh session
- one mobile login creates one refresh session
- logging in from another device creates another refresh session

### 8.3 Web auth behavior

Web uses:

- access token in memory only
- refresh token in `HttpOnly` cookie
- short-lived stream cookie for SSE

Flow:

1. Login/register returns an access token.
2. Browser stores it only in memory.
3. Protected requests use `Authorization: Bearer <accessToken>`.
4. If the token is missing or expired, the frontend calls `POST /refresh`.
5. The backend reads the refresh cookie and rotates the session.
6. A new access token is returned.

### 8.4 Mobile auth behavior

Mobile uses:

- access token in secure storage
- refresh token in secure storage

Flow:

1. Login/register returns both tokens.
2. Mobile stores both in Expo Secure Store.
3. Protected requests use the access token.
4. On `401`, the mobile client calls `POST /refresh` with the stored refresh token.
5. The backend rotates the refresh session.
6. Mobile stores the new access + refresh token pair.

### 8.5 Logout behavior

`POST /logout`

- revokes the current refresh session only

`POST /logout-all`

- revokes all refresh sessions for that user

Because access tokens are short-lived JWTs, revocation mainly affects refresh ability. Existing access tokens continue until they expire unless stricter session checks are enabled.

Additional auth endpoints now in use:

- `POST /login/google`
- `PATCH /me/profile`

## 9. Toast Message Flow

After registration:

1. Python saves the user immediately.
2. Python triggers background toast generation.
3. Python calls `node-ai`.
4. `node-ai` calls OpenAI.
5. OpenAI returns a welcome-style toast message.
6. Python stores the toast on the user record.

### Web delivery

Web uses:

- `POST /me/toast/stream-session`
- `GET /me/toast/stream`

Because `EventSource` cannot send bearer tokens directly, Python issues a short-lived stream cookie first, then the browser opens the SSE stream using that cookie.

### Mobile delivery

Mobile uses a fallback polling flow:

- first check after 3 seconds
- second check after 5 seconds
- final check after 8 seconds

This avoids aggressive polling while still handling delayed toast generation.

## 10. Chatbot Architecture

The chatbot was designed as a channel-agnostic core with adapters.

Current channel:

- WhatsApp through Twilio Sandbox
- authenticated web chat through the React web client
- authenticated mobile chat through the Expo client

Future possible channels:

- web chat
- email
- SMS
- CRM integration
- other messaging platforms

### 10.1 Main chatbot components

Channel adapter:

- currently Twilio WhatsApp webhook

Chatbot orchestrator:

- implemented in `python-server`
- central workflow controller

Shipment repository:

- loads shipments from MongoDB

AI service:

- `node-ai`
- prompt handling + OpenAI reply generation

Logging service:

- Google Sheets

### 10.2 Why this architecture matters

If a new channel is added later, the chatbot core should not need to be rewritten.

Only the adapter changes:

- receive the platform payload
- normalize it
- call the orchestrator
- map the reply back to the platform

The reusable core stays the same:

- chatbot orchestrator
- shipment repository
- AI service
- logging service

## 11. Chatbot Data Flow

The current chatbot flow works like this:

1. The customer sends a message from either WhatsApp or the authenticated web chat widget.
2. The channel adapter sends the request to Python:
   - WhatsApp: `POST /chatbot/webhooks/whatsapp`
   - Web: `POST /chatbot/messages`
   - Mobile: `POST /chatbot/messages`
3. Python normalizes the inbound channel payload.
4. Python identifies the user by:
   - sender phone
   - tracking number if present in the message
5. Python loads shipment data from MongoDB.
6. Python builds structured chatbot context.
7. Python calls `POST /chatbot/reply` on `node-ai`.
8. `node-ai` loads the system prompt and asks OpenAI for a structured reply.
9. `node-ai` returns JSON:
   - `reply`
   - `intent`
10. Python formats the reply for the channel:
    - TwiML for Twilio
    - JSON for the web client
11. Python writes the interaction to Google Sheets, including the channel value such as `whatsapp` or `web`.
12. The calling channel displays the reply to the customer.

## 12. Chatbot Prompt Behavior

The chatbot prompt is documented in:

- `chatbot/PROMPT.md`

A container-safe runtime copy exists in:

- `node-ai/PROMPT.md`

Current prompt behavior:

- delivery-company assistant persona
- customer service + sales support
- automatic language adaptation
- Hebrew replies when the user writes in Hebrew
- English replies when the user writes in English
- structured JSON output for backend parsing

## 13. Logging and Observability

The project uses two different logging layers for different purposes.

### 13.1 Business log

Google Sheets is the business log required by the assignment.

It is for:

- customer-facing conversation history
- audit-style chatbot records
- name / phone / conversation details

### 13.2 Operational logs

Azure Log Analytics is the technical / engineering log layer.

It is used for:

- backend request logs
- chatbot orchestration logs
- OpenAI service logs
- web/mobile auth telemetry
- deployment/runtime troubleshooting

The system emits structured JSON logs with fields like:

- `event`
- `requestId`
- `phone`
- `trackingNumber`
- `intent`
- `client`
- `platform`

This makes it possible to filter and trace specific user actions later.

### 13.3 Correlation

Backend and AI services use request correlation IDs so one request can be traced across:

- Twilio webhook
- Python orchestration
- Node AI
- Google Sheets logging outcome

Frontend telemetry is also sent into the backend so web/mobile auth flows can be seen centrally in Azure logs.

## 14. CI/CD and Security Automation

The repository includes GitHub automation for:

- tests
- secret scanning
- deployment
- code scanning

### 14.1 Tests workflow

The `Tests` workflow runs:

- Python backend tests
- Node AI tests
- web tests
- mobile tests

### 14.2 Secret scanning

The `Secret Scan` workflow uses Gitleaks to catch committed secrets early.

### 14.3 Automatic deployment

The `Deploy to Azure` workflow:

- waits for a successful `Tests` workflow on `main`
- detects which service folders changed in the pushed commit
- builds Docker images only for the affected services
- pushes only those images to Azure Container Registry
- updates only the matching Azure Container Apps
- runs health checks only for the services that were redeployed

Current deploy path rules:

- `python-server/**` changes deploy `ab-python-server`
- `node-ai/**` changes deploy `ab-node-ai`
- `web/**` changes deploy `ab-web`
- changes outside deployable service paths do not trigger a container rebuild
- manual workflow dispatch is still available when a full redeploy is desired

This means deployment is now automated and no longer needs to be done manually every time.

### 14.4 Code scanning

CodeQL is enabled for additional repository security analysis.

## 15. Azure Deployment

Live deployment currently runs on Azure Container Apps:

- Web:
  - `https://ab-web.salmonmoss-0b293592.northeurope.azurecontainerapps.io`
- Python API:
  - `https://ab-python-server.salmonmoss-0b293592.northeurope.azurecontainerapps.io`
- Node AI:
  - `https://ab-node-ai.salmonmoss-0b293592.northeurope.azurecontainerapps.io`

Azure services used:

- Azure Container Registry
- Azure Container Apps
- Azure Log Analytics

Google web auth in Azure also depends on:

- `GOOGLE_OAUTH_WEB_CLIENT_ID` configured on `ab-python-server`
- `VITE_GOOGLE_CLIENT_ID` being passed during the `web` image build
- the live web origin being added to Google OAuth authorized JavaScript origins

## 16. Testing Coverage

The project includes coverage for the most important behavior:

Python backend:

- registration
- login
- refresh
- logout
- logout-all
- protected routes
- stream session behavior
- chatbot routes
- chatbot orchestration

Node AI:

- health endpoint
- toast endpoint
- chatbot reply endpoint
- CORS
- unknown route behavior

Web:

- auth mode switching
- register validation
- successful registration + toast SSE
- token refresh behavior
- SSE recovery behavior

Mobile:

- token persistence
- refresh-on-401
- rotated token persistence
- token cleanup on refresh failure

## 17. Testing Strategy

The testing strategy is designed to show both engineering discipline and product reliability.

### 17.1 Two-layer approach

The project uses a deliberate mix of:

- unit tests
  - focused on small modules and helpers
  - protect internal logic during refactoring
- integration tests
  - focused on real HTTP flows, user journeys, and service boundaries
  - prove the system still behaves correctly as a whole

This is important because the codebase is split across several layers:

- web
- mobile
- python-server
- node-ai

Each layer benefits from isolated tests, but the assignment is only convincing when the main business flows are also verified end to end.

### 17.2 What unit tests are used for

Unit tests are used where the code was intentionally extracted into smaller, reusable modules.

Examples:

- web
  - chatbot widget rendering and interaction states
- mobile
  - auth form validation
  - toast fallback behavior
- node-ai
  - prompt loading
  - prompt assembly
  - structured chatbot response parsing
- python-server
  - auth cookie helpers
  - refresh-session helpers
  - HTTP observability middleware
  - chatbot helper logic

These tests help ensure that internal refactors improve structure without silently breaking behavior.

### 17.3 What integration tests are used for

Integration tests are used for the flows that matter most from the interviewer’s point of view.

Examples:

- registration and login
- refresh token rotation
- logout and logout-all
- protected user endpoints
- SSE-based toast delivery flow
- mobile authenticated API behavior
- Node AI HTTP endpoints
- chatbot message endpoint
- WhatsApp webhook endpoint

These tests demonstrate that the application works across real boundaries such as:

- route -> service
- service -> repository
- service -> external adapter
- frontend -> backend

### 17.4 Why this testing strategy is strong

This approach was chosen because it gives better evidence than only one style of testing:

- only unit tests would miss real runtime integration issues
- only end-to-end style tests would make refactoring harder and debugging slower

By combining both, the project shows:

- maintainability
- confidence during refactoring
- protection of critical product flows
- better separation of concerns in both code and test design

## 18. What Was Improved Beyond the Basic Assignment

In addition to the base assignment, the project now includes:

- a more realistic auth architecture
- secure refresh-session model
- real shipment-backed chatbot support
- Google Sheets business logging
- structured cloud logging
- CI testing
- secret scanning
- automatic Azure deployment

These changes make the project much closer to a production-style implementation instead of only a UI or demo solution.

## 19. Current Status

The project is basically complete for the assignment.

Base assignment:

- done

Extended chatbot assignment:

- done

Live deployment:

- done

Operational logging:

- done

Automated deployment:

- done

## 20. Remaining Optional Hardening Work

These are useful future improvements, but they are not blockers for the assignment:

- enforce branch protection rules on `main`
- turn on Twilio signature validation with final production credentials
- clean up or classify remaining CodeQL findings
- move from Twilio Sandbox to a production WhatsApp sender
- add a password reset flow
- improve cross-layer correlation even further

## 21. Summary

This project delivers the requested assignment as a full working multi-service system.

It includes:

- a web client
- a mobile client
- a Python backend
- a Node.js AI service
- MongoDB persistence
- OpenAI-generated toast messaging
- a WhatsApp AI chatbot
- Google Sheets logging
- Azure deployment
- observability and CI/CD automation

The final result is not only feature-complete for the assignment, but also structured in a way that is maintainable, explainable, and extendable.
