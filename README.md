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

Still pending:

- Node.js AI toast service
- React Native mobile app
- Azure deployment
- Hebrew AI chatbot and conversation logging

## Planned Flow

1. User submits the registration form from web or mobile.
2. The frontend sends the request to the Python server.
3. The Python server validates the data and stores it in MongoDB.
4. After successful registration, the Python server requests a toast message from the Node.js AI service.
5. The AI service calls OpenAI and returns a short message to the Python server.
6. The Python server returns the registration result and toast content to the frontend.
7. The frontend displays the message as a toast.

## Design Note

The provided Figma is login-oriented, but the same visual style will be used for the required registration experience.

## Run Web Locally

```bash
cd web
npm install
npm run dev
```

## Next Step

The next step is to continue the post-registration flow:

1. Add the Node.js AI toast service
2. Let the Python server request the toast message after successful registration
3. Return the toast content from Python to the frontend
4. Build the matching React Native mobile flow
5. Prepare Azure deployment for the backend services
