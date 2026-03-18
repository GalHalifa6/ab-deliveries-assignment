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
- Web app scaffolded with Vite + React
- Figma-inspired web login/registration UI implemented in `web/`
- Web registration and login flows connected to the Python server
- Python backend scaffolded with FastAPI in `python-server/`
- MongoDB connected locally and used for registration/login persistence
- Duplicate email protection implemented in the backend
- `node-ai/` scaffolded with a Node.js toast-message service
- Python registration flow connected to the Node.js toast service
- Web frontend displays the toast after successful registration
- React Native mobile scaffold created in `mobile/`
- Mobile login/register screen added with the same auth flow structure as web
- Mobile app tested successfully in Expo Go on a physical iPhone
- Mobile auth screen visually aligned further with the provided mobile Figma
- Python backend now logs the toast message sent after registration
- MongoDB now stores the toast message each registered user received
- Environment-based API configuration is now added for web, mobile, Python, and Node services
- Health endpoints are now available on both backend services
- Docker support is now added for `web/`, `python-server/`, and `node-ai/`
- Docker Compose now includes a local MongoDB service for a fuller local stack
- Backend and web automated tests are now added
- A root PowerShell test runner is now available in `scripts/run-tests.ps1`
- GitHub Actions CI now runs Python, Node AI, and web tests on every push and pull request
- Azure Container Registry is now created and used for image publishing
- Azure Container Apps environment is now created and running in `northeurope`
- `node-ai` is now deployed to Azure Container Apps
- `python-server` is now deployed to Azure Container Apps
- `web` is now deployed to Azure Container Apps
- MongoDB Atlas is now connected successfully from the deployed Python backend
- End-to-end registration now works from the live deployed web app
- Mock toast messages now work end to end on the deployed Azure stack

Still pending:

- OpenAI integration inside the Node.js toast service
- Final mobile visual polish
- Hebrew AI chatbot and conversation logging
- MongoDB credential rotation after deployment testing

## Planned Flow

1. User submits the registration form from web or mobile.
2. The frontend sends the request to the Python server.
3. The Python server validates the data and stores it in MongoDB.
4. After successful registration, the Python server requests a toast message from the Node.js AI service.
5. The AI service calls OpenAI and returns a short message to the Python server.
6. The Python server stores that toast message for the user in MongoDB and logs it in the terminal.
7. The Python server returns the registration result and toast content to the frontend.
8. The frontend displays the message as a toast.

## Design Note

The provided Figma is login-oriented, but the same visual style will be used for the required registration experience.

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

## Azure Deployment

The application is now deployed on Azure Container Apps.

Live endpoints:

- Web: `https://ab-web.salmonmoss-0b293592.northeurope.azurecontainerapps.io`
- Python API: `https://ab-python-server.salmonmoss-0b293592.northeurope.azurecontainerapps.io`
- Node AI: `https://ab-node-ai.salmonmoss-0b293592.northeurope.azurecontainerapps.io`

Deployment notes:

- Azure Container Registry stores the Docker images
- Azure Container Apps hosts `web`, `python-server`, and `node-ai`
- MongoDB Atlas remains the external database
- Python CORS is configured to allow the deployed web origin
- `node-ai` currently returns mock toast messages, not OpenAI-generated text yet

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
- This keeps device testing simple while still containerizing the parts that matter most for backend/cloud readiness
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
  - register endpoint integration tests
  - login endpoint integration tests
  - toast-fetch unit tests
- `node-ai/`
  - health endpoint integration test
  - toast-message endpoint integration test
  - CORS preflight and 404 tests
  - random message selection unit test
- `web/`
  - auth mode switching UI test
  - register validation UI test
  - successful register + toast rendering UI test

## CI/CD

GitHub Actions is configured in:

- `.github/workflows/tests.yml`

What it does:

- checks out the repository
- installs Python and runs the `python-server` tests
- installs Node dependencies for `node-ai` and runs its tests
- installs Node dependencies for `web` and runs its tests

You do not need to run the workflow file manually. After you commit and push, GitHub runs it automatically in the repository `Actions` tab.

## Deployment Readiness

The project is now prepared for deployment-oriented configuration and is deployed on Azure:

- all important service settings are env-based
- local `.env` files stay private and are gitignored
- `.env.example` files document the required configuration
- backend services expose `/health`
- Docker support is available for the meaningful deployable services
- local and CI test flows are in place before Azure deployment
- Azure Container Registry is in use for image publishing
- Azure Container Apps are running for the web and backend services
- MongoDB Atlas connectivity from Azure is now working

Current containerization approach:

- `web` is containerized as a static production-style build served by Nginx
- `python-server` is containerized as the main backend API
- `node-ai` is containerized as the toast/AI backend service
- `mongo` is included in Docker Compose for local full-stack development
- `mobile` is intentionally not containerized

## Next Step

The next step is to continue the post-registration flow:

1. Finish the remaining mobile visual polish
2. Replace the mock Node.js toast messages with OpenAI-generated messages
3. Rotate the MongoDB Atlas credentials used during deployment testing
4. Continue with the Hebrew AI chatbot and conversation logging
