# A.B Deliveries Assignment

This repository contains the implementation for the A.B Deliveries technical assignment.

## Repository Structure

- `web/` - React web application
- `mobile/` - React Native mobile application
- `python-server/` - Python backend API
- `node-ai/` - Node.js service for AI-generated toast messages
- `chatbot/` - AI chatbot prompt and chatbot-related assets
- `docs/` - Architecture and planning documents

## Technologies Used

- Frontend web
  - React
  - Vite
  - Vitest
  - Testing Library
- Frontend mobile
  - React Native
  - Expo
  - Expo Secure Store
  - Jest
- Backend
  - Python
  - FastAPI
  - Uvicorn
  - PyMongo
  - Passlib
  - PyJWT
  - `python-multipart`
  - `httpx`
- AI service
  - Node.js
  - OpenAI Node SDK
- Database and external services
  - MongoDB Atlas
  - OpenAI API
  - Twilio WhatsApp Sandbox
  - Google Sheets API
- DevOps and cloud
  - Azure Container Apps
  - Azure Container Registry
  - Docker
  - Docker Compose
  - GitHub Actions
  - CodeQL
  - Gitleaks
- Design and product assets
  - Figma

## Current Status

Completed:

- Project structure and documentation created
- Figma-inspired login and registration flows implemented for web and mobile
- Python backend scaffolded with FastAPI in `python-server/`
- MongoDB connected locally and used for registration/login persistence
- Duplicate email protection implemented in the backend
- `node-ai/` scaffolded with a Node.js toast-message service
- Python registration flow connected to the Node.js toast service
- Toast generation is stored asynchronously after successful registration
- JWT access-token auth with refresh-session control is implemented end to end
- Web auth now uses an in-memory access token, `HttpOnly` refresh cookie, and short-lived SSE stream cookie
- Mobile auth now uses access + refresh tokens stored in Expo Secure Store
- Private user data now loads through authenticated endpoints instead of email query params
- Web toast delivery now uses Server-Sent Events instead of repeated polling
- Mobile toast delivery now uses a low-noise fallback check instead of aggressive polling
- Health endpoints are available on both backend services
- Docker support is now added for `web/`, `python-server/`, and `node-ai/`
- Docker Compose includes a local MongoDB service for a fuller local stack
- Backend and web automated tests are in place
- A root PowerShell test runner is available in `scripts/run-tests.ps1`
- GitHub Actions CI runs Python, Node AI, web, and mobile tests on every push and pull request
- Azure Container Registry is used for image publishing
- Azure Container Apps host `web`, `python-server`, and `node-ai`
- MongoDB Atlas is connected successfully from the deployed Python backend
- The registration toast flow now saves the user first, waits for a real OpenAI-generated toast, and avoids writing a fake fallback message
- Production `node-ai`, `python-server`, and `web` have been redeployed with the current toast-flow fixes
- WhatsApp chatbot flow is live through Twilio Sandbox
- Web chatbot flow is available inside the authenticated web app
- Chatbot conversations are logged to Google Sheets
- Shipment lookup is backed by a real MongoDB `shipments` collection
- The chatbot prompt is documented in `chatbot/PROMPT.md`



## Assignment Coverage

Base assignment status:

- Mobile registration UI in React Native: implemented
- Web registration UI in React: implemented
- Python backend: implemented
- Azure deployment: implemented
- MongoDB persistence: implemented
- Post-registration toast from a second Node.js service: implemented
- Toast text generated through OpenAI: implemented

Extended assignment status:

- Friendly AI support agent with Hebrew and English auto-detection: implemented
- Chatbot on WhatsApp: implemented through Twilio WhatsApp Sandbox
- Chatbot on the website: implemented through the existing React web app and Python chatbot adapter
- Conversation logging to Google Sheets: implemented
- Prompt presentation for the chatbot: implemented

## Auth Model

The project now uses a split auth approach that matches real-world client behavior:

- `web/`
  - logs in through `POST /login` or `POST /register`
  - receives a short-lived access token in the response body
  - stores the access token in memory only
  - receives a long-lived refresh token in an `HttpOnly` cookie
  - sends authenticated API requests with `Authorization: Bearer <accessToken>`
  - uses `credentials: 'include'` for refresh and SSE stream-cookie setup
- `mobile/`
  - logs in through the same endpoints with `X-Client-Type: mobile`
  - receives a short-lived bearer access token and a long-lived refresh token
  - stores both tokens in Expo Secure Store
  - sends the access token in the `Authorization` header and refreshes when needed

Protected API endpoints:

- `GET /me`
- `GET /me/toast`
- `POST /refresh`
- `GET /me/toast/stream`
- `POST /logout`
- `POST /logout-all`
- `POST /me/toast/stream-session`

Important change:

- the old `GET /user-toast?email=...` pattern is no longer used for private user data
- `web/` now opens a single authenticated SSE stream through `GET /me/toast/stream`
- `mobile/` now checks `GET /me/toast` only twice after registration: once after 3 seconds and once 5 seconds later

## Planned Flow

1. User submits the registration or login form from web or mobile.
2. The frontend sends the request to the Python server.
3. The Python server validates the data and stores or verifies the user in MongoDB.
4. The Python server creates a refresh session in MongoDB for that login.
5. For web, the Python server returns a short-lived access token and sets an `HttpOnly` refresh cookie.
6. For mobile, the Python server returns a short-lived access token and a refresh token.
7. After successful registration, the Python server requests a toast message from the Node.js AI service in the background.
8. The Node.js AI service requests a real welcome message from OpenAI.
9. If toast generation fails, the user remains saved and `toastMessage` stays empty instead of storing a fake fallback string.
10. On web, the frontend silently refreshes access when needed and requests a short-lived stream cookie before opening SSE.
11. On web, the frontend opens `GET /me/toast/stream` and waits for the backend to push the toast event.
12. On mobile, the app performs a minimal fallback check against `GET /me/toast` after 3 seconds and again 5 seconds later.
13. The frontend displays the toast message when it becomes available.

## Chatbot Flow

The extended assignment chatbot is now running as a small multi-service flow:

1. A customer sends a message either from WhatsApp or from the authenticated web chat widget.
2. The channel adapter calls the deployed Python API:
   - WhatsApp: `POST /chatbot/webhooks/whatsapp`
   - Web: `POST /chatbot/messages` with `channel: "web"`
3. `python-server/` normalizes the channel payload and acts as the chatbot orchestrator.
4. The Python backend identifies the customer by phone number and/or tracking number.
5. The Python backend loads shipment data from MongoDB `shipments`.
6. The Python backend calls `POST /chatbot/reply` on `node-ai/`.
7. `node-ai/` loads the chatbot prompt from `PROMPT.md`, calls OpenAI, and returns strict JSON with `reply` and `intent`.
8. The Python backend returns the reply to the calling channel and logs the exchange to Google Sheets with the appropriate channel value such as `whatsapp` or `web`.

Language behavior:

- the chatbot automatically replies in Hebrew when the user writes in Hebrew
- the chatbot automatically replies in English when the user writes in English
- it does not ask the user to choose a language

## Design Note

The provided Figma is login-oriented, but the same visual style is used for the required registration experience.

## Run Web Locally

```bash
cd web
npm install
npm run dev
```

## Environment Setup

Example env files are included in:

- `web/.env.example`
- `mobile/.env.example`
- `python-server/.env.example`
- `node-ai/.env.example`

Use those files to create local `.env` files before deployment.

Additional local setup notes:

- `mobile/` now uses `expo-secure-store` for access-token and refresh-token storage
- after pulling the latest code, run `npm install` inside `mobile/` before starting Expo

## Azure Deployment

The application is deployed on Azure Container Apps.

Live endpoints:

- Web: `https://ab-web.salmonmoss-0b293592.northeurope.azurecontainerapps.io`
- Python API: `https://ab-python-server.salmonmoss-0b293592.northeurope.azurecontainerapps.io`
- Node AI: `https://ab-node-ai.salmonmoss-0b293592.northeurope.azurecontainerapps.io`

Deployment notes:

- Azure Container Registry stores the Docker images
- Azure Container Apps host `web`, `python-server`, and `node-ai`
- MongoDB Atlas remains the external database
- Python CORS allows the deployed web origin with credentials enabled
- Web refresh and stream cookies are enabled over HTTPS in Azure
- `node-ai` calls OpenAI using the `OPENAI_API_KEY` configured in Azure
- `OPENAI_MODEL` is currently set to `gpt-5-mini`

For the deployment walkthrough and troubleshooting notes, see:

- `docs/azure-deployment.md`

## Health Endpoints

- Python: `GET /health`
- Node AI: `GET /health`

## Run Local Stack With Docker

```bash
docker compose up --build
```

This starts the Dockerized local stack:

- `web/Dockerfile`
- `python-server/Dockerfile`
- `node-ai/Dockerfile`
- `docker-compose.yml`

Key local ports:

- Web: `http://localhost:5173`
- Python API: `http://localhost:8000`
- Node AI: `http://localhost:3001`
- MongoDB: `mongodb://localhost:27018`

Important note:

- The mobile Expo app is intentionally kept outside Docker
- `docker-compose.yml` overrides the Python container to use the internal service addresses for MongoDB and Node AI

## Run Tests

Run Python server tests:

```bash
cd python-server
python -m unittest discover -s tests -v
```

Run Node AI tests:

```bash
cd node-ai
npm test
```

Run web tests:

```bash
cd web
npm test
```

Run mobile auth tests:

```bash
cd mobile
npm test
```

Run all test suites from the repository root in PowerShell:

```powershell
.\scripts\run-tests.ps1
```

Run one suite at a time:

```powershell
.\scripts\run-tests.ps1 -Suite python
.\scripts\run-tests.ps1 -Suite node
.\scripts\run-tests.ps1 -Suite web
```

Current automated coverage:

- `python-server/`
  - health endpoint integration test
  - register/login/refresh tests for web and mobile clients
  - protected endpoint tests for `/me`, `/me/toast`, `/logout`, `/logout-all`, and stream-session setup
  - toast-fetch unit tests, including the no-fake-fallback behavior
- `node-ai/`
  - health endpoint integration test
  - toast-message success and failure endpoint integration tests
  - chatbot reply endpoint tests
  - CORS preflight and 404 tests
- `web/`
  - auth mode switching UI test
  - register validation UI test
  - successful authenticated register + toast SSE UI test
  - toast recovery tests for delayed backend generation
- `mobile/`
  - secure token persistence tests
  - refresh-on-401 auth client tests
  - rotated refresh-token persistence tests
- `python-server/` chatbot coverage
  - `POST /chatbot/messages`
  - `POST /chatbot/webhooks/whatsapp`
  - shipment lookup and orchestrator tests
  - Google Sheets log-entry generation tests

## Testing Strategy

The testing approach is intentionally split into two layers:

- Unit tests
  - validate small extracted modules in isolation
  - examples:
    - web chatbot widget rendering and disabled states
    - mobile auth-form validation and toast helper behavior
    - Node AI prompt parsing and prompt assembly
    - Python auth cookie helpers, refresh-session helpers, and HTTP observability middleware
- Integration tests
  - verify the important runtime flows across real module boundaries
  - examples:
    - Python register/login/refresh/logout flows
    - protected endpoint access
    - WhatsApp webhook handling
    - chatbot orchestration endpoints
    - Node AI HTTP endpoints
    - web auth and toast-stream UI flows

Why this matters:

- unit tests make refactoring safer by protecting internal behavior
- integration tests prove the actual user-facing flows still work end to end
- together they show both maintainability and product confidence, which is more valuable than only testing happy-path screens

## CI/CD

GitHub Actions is configured in:

- `.github/workflows/tests.yml`
- `.github/workflows/deploy-azure.yml`
- `.github/workflows/secret-scan.yml`

What it does:

- `Tests` runs four independent jobs:
  - `python-server` tests
  - `node-ai` tests
  - `web` tests
  - `mobile` tests
- `Deploy to Azure` runs automatically only after the `Tests` workflow completes successfully on `main`
- the deploy workflow detects which service paths changed and deploys only the affected apps
- manual workflow dispatch still deploys all three services
- when no deployable service changed, the workflow exits without rebuilding containers
- `Secret Scan` runs Gitleaks on every push and pull request to catch committed secrets early

Required GitHub repository secrets for deployment:

- `AZURE_CREDENTIALS`

Recommended GitHub repository configuration:

- protect the `main` branch
- require the `Tests` workflow status checks before merge
- require the `Secret Scan` workflow status check before merge
- optionally require pull requests before pushing to `main`

## Deployment Readiness

The project is prepared for deployment-oriented configuration:

- all important service settings are env-based
- local `.env` files stay private and are gitignored
- `.env.example` files document the required configuration
- backend services expose `/health`
- browser auth uses an in-memory access token plus `HttpOnly` refresh and stream cookies
- mobile auth uses access and refresh tokens stored with Expo Secure Store
- Docker support is available for the deployable services
- local and CI test flows are in place before Azure deployment
- Azure deployment is now set up to happen automatically from GitHub after a green `main` build

## Next Step

The next step is to continue hardening and polishing the product:

1. Finish the remaining mobile visual polish
2. Turn on Twilio signature validation with production credentials
3. Move from Twilio Sandbox to a production WhatsApp sender if needed
4. Run additional live chatbot verification with more edge cases
5. Rotate the MongoDB Atlas credentials used during deployment testing
6. Add a production-grade password reset flow
