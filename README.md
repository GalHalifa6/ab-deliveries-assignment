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
- Web registration form connected to a mocked Python `POST /register` endpoint
- Python backend scaffolded with FastAPI in `python-server/`

Still pending:

- Python backend API
- MongoDB integration
- Node.js AI toast service
- React Native mobile app
- Azure deployment
- Hebrew AI chatbot and conversation logging

## Planned Flow

1. User submits the registration form from web or mobile.
2. The frontend sends the request to the Python server.
3. The Python server validates the data and stores it in MongoDB.
4. After successful registration, the frontend requests a toast message from the Node.js AI service.
5. The AI service calls OpenAI and returns a short message.
6. The frontend displays the message as a toast.

## Design Note

The provided Figma is login-oriented, but the same visual style will be used for the required registration experience.

## Run Web Locally

```bash
cd web
npm install
npm run dev
```

## Next Step

The next step is to replace the mocked backend behavior with real persistence and continue the flow:

1. Save registrations in MongoDB
2. Add the Node.js AI toast service
3. Trigger a toast after successful registration
4. Build the matching React Native mobile flow
