# A.B Deliveries Assignment

This repository contains the implementation for the A.B Deliveries technical assignment.

## Repository Structure

- `web/` - React web application
- `mobile/` - React Native mobile application
- `python-server/` - Python backend API
- `node-ai/` - Node.js service for AI-generated toast messages
- `chatbot/` - Hebrew AI chatbot implementation
- `docs/` - Architecture and planning documents

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
- Web auth is now secured with an `HttpOnly` cookie session
- Mobile auth now uses a bearer access token returned by the Python API
- Private user data now loads through authenticated endpoints instead of email query params
- Health endpoints are available on both backend services
- Docker support is now added for `web/`, `python-server/`, and `node-ai/`
- Docker Compose includes a local MongoDB service for a fuller local stack
- Backend and web automated tests are in place
- A root PowerShell test runner is available in `scripts/run-tests.ps1`
- GitHub Actions CI runs Python, Node AI, and web tests on every push and pull request
- Azure Container Registry is used for image publishing
- Azure Container Apps host `web`, `python-server`, and `node-ai`
- MongoDB Atlas is connected successfully from the deployed Python backend

Still pending:

- Final mobile visual polish
- Hebrew AI chatbot and conversation logging
- MongoDB credential rotation after deployment testing
- Optional refresh-token support if the mobile app later needs longer-lived sessions

## Auth Model

The project now uses a split auth approach that matches real-world client behavior:

- `web/`
  - logs in through `POST /login` or `POST /register`
  - receives an `HttpOnly` session cookie from the Python API
  - sends authenticated requests with `credentials: 'include'`
- `mobile/`
  - logs in through the same endpoints with `X-Client-Type: mobile`
  - receives a short-lived bearer access token
  - stores that token in Expo Secure Store and sends it in the `Authorization` header

Protected API endpoints:

- `GET /me`
- `GET /me/toast`
- `POST /logout`

Important change:

- the old `GET /user-toast?email=...` pattern is no longer used for private user data
- toast polling now happens through the authenticated `GET /me/toast` route

## Planned Flow

1. User submits the registration or login form from web or mobile.
2. The frontend sends the request to the Python server.
3. The Python server validates the data and stores or verifies the user in MongoDB.
4. For web, the Python server creates a server-side session and sets an `HttpOnly` cookie.
5. For mobile, the Python server returns a bearer access token.
6. After successful registration, the Python server requests a toast message from the Node.js AI service in the background.
7. The frontend polls `GET /me/toast` as the authenticated user until the toast is ready.
8. The frontend displays the toast message when it becomes available.

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

- `mobile/` now uses `expo-secure-store` for access-token storage
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
- Web session cookies can work on Azure because the browser and API stay on the Azure Container Apps domain family
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
  - register/login tests for web-session and mobile-token clients
  - protected endpoint tests for `/me`, `/me/toast`, and `/logout`
  - toast-fetch unit tests
- `node-ai/`
  - health endpoint integration test
  - toast-message endpoint integration test
  - CORS preflight and 404 tests
  - random message selection unit test
- `web/`
  - auth mode switching UI test
  - register validation UI test
  - successful authenticated register + toast polling UI test

## CI/CD

GitHub Actions is configured in:

- `.github/workflows/tests.yml`

What it does:

- checks out the repository
- installs Python and runs the `python-server` tests
- installs Node dependencies for `node-ai` and runs its tests
- installs Node dependencies for `web` and runs its tests

## Deployment Readiness

The project is prepared for deployment-oriented configuration:

- all important service settings are env-based
- local `.env` files stay private and are gitignored
- `.env.example` files document the required configuration
- backend services expose `/health`
- browser auth uses an `HttpOnly` cookie instead of exposing a session token to JavaScript
- mobile auth uses a bearer token stored with Expo Secure Store
- Docker support is available for the deployable services
- local and CI test flows are in place before Azure deployment

## Next Step

The next step is to continue hardening and polishing the product:

1. Finish the remaining mobile visual polish
2. Rotate the MongoDB Atlas credentials used during deployment testing
3. Add a production-grade password reset flow
4. Continue with the Hebrew AI chatbot and conversation logging
