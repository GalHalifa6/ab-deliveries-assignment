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
- Docker support is now added for `python-server/` and `node-ai/`
- Backend and web automated tests are now added
- A root PowerShell test runner is now available in `scripts/run-tests.ps1`
- GitHub Actions CI now runs Python, Node AI, and web tests on every push and pull request

Still pending:

- OpenAI integration inside the Node.js toast service
- Final mobile visual polish
- Azure deployment
- Hebrew AI chatbot and conversation logging

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

## Health Endpoints

- Python: `GET /health`
- Node AI: `GET /health`

## Run Backend Services With Docker

```bash
docker compose up --build
```

This starts the Dockerized backend services defined in:

- `python-server/Dockerfile`
- `node-ai/Dockerfile`
- `docker-compose.yml`

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

The project is now prepared for deployment-oriented configuration:

- all important service settings are env-based
- local `.env` files stay private and are gitignored
- `.env.example` files document the required configuration
- backend services expose `/health`
- Docker support is available for both backend services
- local and CI test flows are in place before Azure deployment

## Next Step

The next step is to continue the post-registration flow:

1. Finish the remaining mobile visual polish
2. Replace the mock Node.js toast messages with OpenAI-generated messages
3. Prepare Azure deployment for the backend services
4. Continue with the Hebrew AI chatbot and conversation logging
