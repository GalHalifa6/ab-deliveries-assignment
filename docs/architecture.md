# Registration System Assignment - Architecture Plan

## Overview

This project is a registration/login system based on the provided Figma design.

The assignment includes:

- A web interface built with React JS
- A mobile interface built with React Native
- A Python server
- Azure deployment
- MongoDB database integration
- A second Node.js server that connects to OpenAI and returns a random toast message after registration
- Progress reporting and code upload to a shared GitHub repository

## Screens

The Figma currently provides the following layouts:

- Web login page
- Mobile login page

At this stage, the provided design is focused on the login/registration entry UI.

## UI Elements

### Web Screen

The web screen includes:

- Login header
- Email input
- Password input
- Password visibility toggle
- Forgot password link
- Login button
- Separator between standard login and social login
- Google button
- Facebook button
- "Have no account yet?" text
- Register button

### Mobile Screen

The mobile screen should contain the same elements as the web screen, adapted to a mobile layout:

- Login header
- Email input
- Password input
- Password visibility toggle
- Forgot password link
- Login button
- Separator between login and social login
- Google button
- Facebook button
- "Have no account yet?" text
- Register button

The mobile UI should follow the same visual language as the web version while remaining suitable for smaller screens.

## UI States From Figma

### Buttons

The design includes the following button states:

- Default
- Hover
- Disabled

This applies to:

- Login button
- Google button
- Other action buttons where relevant

### Inputs

The design includes the following input states:

- Default
- Focused
- Filled

These states should be implemented for:

- Email input
- Password input

## Submission Flow

The expected application flow is:

1. The user submits the registration/login form.
2. React or React Native sends the data to the Python server.
3. Python processes the request.
4. Python saves the user data in MongoDB.
5. After successful registration, the Python server requests a random toast message from a second server written in Node.js.
6. The Node.js server connects to OpenAI and returns a random message to the Python server.
7. Python returns the registration result together with the toast content to the frontend.
8. The frontend displays the toast message to the user.

## Development Note

For the initial implementation, it is practical to start without MongoDB and first complete:

- The UI
- Frontend/backend communication
- The toast flow

MongoDB integration can be added after the main local flow works correctly.

Current progress note:

- The web login/registration UI is implemented
- The React web app is connected to the Python server
- MongoDB is connected locally and currently stores registered users
- Login now validates against stored MongoDB users
- The `node-ai/` service is scaffolded locally
- The Python registration flow now requests a toast message from `node-ai/`
- The web frontend displays the returned toast after registration
- A React Native mobile scaffold is now added in `mobile/`
- The mobile auth screen mirrors the same login/register flow structure as the web app
- The mobile app is now running in Expo Go on a physical iPhone
- The mobile Google/Facebook buttons and logo were refined toward the provided Figma
- The Python server now logs the toast message shown after registration
- MongoDB now stores the toast message assigned to each registered user
- Environment-based configuration is now in place for local vs production API URLs
- Docker support is now added for the web and backend services
- Docker Compose now includes a local MongoDB service for a fuller local stack
- Health endpoints are available on both backend services
- Automated backend and web tests are now in place
- A local root test runner script is available in `scripts/run-tests.ps1`
- GitHub Actions now runs the Python, Node AI, and web test suites automatically
- Azure Container Registry is now in use for image storage
- Azure Container Apps now host the deployed `web`, `python-server`, and `node-ai` services
- MongoDB Atlas connectivity now works from the deployed Python backend
- Live web registration now works end to end on Azure
- The deployed `node-ai` now uses OpenAI with `gpt-5-mini` for toast generation
- The registration flow now saves the user first and stores the toast asynchronously

## Technical Requirements

### Mobile

- Use React Native to develop the registration interface for mobile devices

### Web

- Use React JS to develop the registration interface for the website

### Server

- Use Python for the main server
- Run the server on Azure cloud
- Use MongoDB for database management

### Additional Functionality

- After registration, send a toast message to the user
- The toast content should be random text obtained through an API connection to OpenAI
- This OpenAI connection should be implemented on a second server written in Node.js

### Project Management

- Report progress during development
- Upload the code to the shared GitHub repository

## Architecture Proposal

### Frontend Layer

Two clients will be implemented:

- `web/` using React JS
- `mobile/` using React Native

Both clients should share the same product flow:

- Render the form UI from the Figma
- Collect user credentials
- Submit data to the Python API
- Receive the final registration response from the Python API
- Display the returned toast message to the user

Current containerization choice:

- `web/` is now containerized as a static build served through Nginx
- `mobile/` intentionally remains outside Docker for practical Expo/device development

### Main Backend

The `python-server/` service will be responsible for:

- Receiving registration requests
- Validating submitted data
- Handling the business logic
- Saving users to MongoDB
- Calling the Node.js AI service after successful registration
- Saving the returned toast message with the registered user document
- Logging registration/login activity using Python logging
- Returning success or error responses to the frontend
- Reading deployment settings from environment variables

Suggested initial endpoint:

- `POST /register`
- `POST /login`

### AI Toast Service

The `node-ai/` service will be responsible for:

- Receiving a request from the Python server for a toast message
- Calling OpenAI
- Returning a short random message suitable for a toast notification
- Exposing a health endpoint for deployment checks

Suggested initial endpoint:

- `GET /toast-message`

Current implementation note:

- A local Node.js scaffold is already in place
- The service now supports real OpenAI toast generation
- A mock fallback still exists for resilience if OpenAI fails
- The service is structured for local testing and CI execution
- The deployed Azure version is currently still mock-based

### Database Layer

MongoDB will store registration data such as:

- Email
- Password hash or secure credential representation
- Toast message assigned after registration
- Created date
- Optional profile metadata

### Deployment

Azure is the target deployment platform for the backend services.

Deployment planning should include:

- Environment variable management
- Azure service selection
- MongoDB connection string configuration
- Production API URLs for frontend clients
- Optional container-based deployment using the added Dockerfiles and `docker-compose.yml`
- CI validation through GitHub Actions before deployment

Current local container stack:

- `web`
- `python-server`
- `node-ai`
- `mongo`

This gives the project a practical local environment closer to production without over-complicating mobile development.

Current deployed cloud stack:

- `web` deployed on Azure Container Apps
- `python-server` deployed on Azure Container Apps
- `node-ai` deployed on Azure Container Apps
- MongoDB Atlas used as the external managed database

Current deployment note:

- the working Azure Container Apps environment is in `northeurope`
- the live deployed flow now works for registration through the web app
- the deployed `node-ai` now uses OpenAI with Azure-managed environment variables
- detailed deployment steps are documented in `docs/azure-deployment.md`

### Testing Strategy

The current project test strategy is split by service:

- `python-server/tests/`
  - FastAPI integration tests for `/health`, `/register`, and `/login`
  - unit tests for toast-fetch behavior and fallback handling
- `node-ai/tests/`
  - service tests for `/health`, `/toast-message`, CORS preflight, and 404 responses
  - unit-level coverage for random toast message selection
- `web/src/test/`
  - UI behavior tests for login/register mode switching
  - register form validation tests
  - successful registration and toast rendering tests

Local execution is available through:

- direct per-service test commands
- `scripts/run-tests.ps1` for one command across all suites

Remote validation is available through:

- `.github/workflows/tests.yml`
- automatic execution on pushes and pull requests

## Design Clarification

The assignment asks for a registration interface, while the Figma appears to show a login-style screen. The implementation will follow the provided design language and adapt the interface to support the required registration flow.

## Suggested Implementation Order

To keep delivery organized and reduce risk, the recommended order is:

1. Document the project structure and architecture
2. Build the web UI from the Figma
3. Create the Python server
4. Connect the web frontend to the backend with a mock response
5. Create the Node.js AI toast service
6. Connect the toast flow after successful registration
7. Add MongoDB integration
8. Test and polish the mobile UI on a physical device
9. Prepare Azure deployment
10. Implement the chatbot as a separate second phase

## Chatbot Phase

The A.B Deliveries Hebrew AI chatbot will be handled after the main registration flow is stable.

Planned chatbot requirements:

- Friendly Hebrew-speaking AI agent
- Customer service support for package status
- Sales assistance to encourage more delivery orders
- Deployment on at least one supported platform such as website, WhatsApp, SMS, Instagram, or Facebook
- Logging of conversations, including:
- Caller or customer name
- Phone number
- Conversation details
- Prompt documentation for review

## Immediate Next Steps

The next development milestone is to scaffold these services:

- `web/`
- `python-server/`
- `node-ai/`

The first local web-to-Python-to-MongoDB flow is now working.

The next immediate milestone is:

- Finish the remaining mobile visual polish
- Rotate the MongoDB credentials used during deployment testing
- Polish the delayed toast delivery UX after registration
- Continue with the chatbot implementation phase
