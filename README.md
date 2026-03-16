# A.B Deliveries Assignment

This repository contains the implementation plan and project structure for the A.B Deliveries technical assignment.

The assignment requires building a registration/login experience for web and mobile, connecting it to a Python backend, storing user data in MongoDB, generating a post-registration toast message through a second Node.js AI server, and later extending the project with a Hebrew AI chatbot for customer service and sales support.

## Project Scope

The assignment includes:

- A web interface built with React JS
- A mobile interface built with React Native
- A main backend built with Python
- MongoDB for database management
- Azure deployment for the backend
- A second server built with Node.js for OpenAI-powered toast messages
- Progress reporting and GitHub uploads
- A later chatbot phase for A.B Deliveries

## Repository Structure

- `web/` - React web application
- `mobile/` - React Native mobile application
- `python-server/` - Main Python backend API
- `node-ai/` - Node.js service for OpenAI-generated toast messages
- `chatbot/` - Hebrew AI chatbot implementation
- `docs/` - Architecture and planning documents

## Current Progress

Completed so far:

- GitHub repository created
- Base folders prepared
- `.gitkeep` files added to preserve empty folders in Git
- Initial project planning documented

Current phase:

- Define architecture and implementation plan
- Prepare documentation before scaffolding services

## Planned System Flow

1. A user fills the registration/login form on web or mobile.
2. The frontend sends the data to the Python server.
3. The Python server validates and processes the request.
4. User data is saved in MongoDB.
5. After a successful registration, the frontend requests a toast message from the Node.js AI server.
6. The Node.js server calls OpenAI and returns a short random message.
7. The frontend displays that message as a toast notification.

## Design Note

The provided Figma appears to focus on a login-style entry screen. For this assignment, the same visual language and layout will be used to support the required registration flow as well.

## Implementation Order

The planned delivery order is:

1. Create project documentation
2. Build the web interface from the Figma design
3. Create the Python backend API
4. Connect the web frontend to the Python server with a mock success flow
5. Create the Node.js AI toast service
6. Connect the toast flow after successful registration
7. Add MongoDB integration
8. Build the mobile interface in React Native
9. Prepare Azure deployment
10. Implement the Hebrew AI chatbot as a second phase

## Documentation

Detailed planning is available in [docs/architecture.md](./docs/architecture.md).

## Next Step

The immediate next step is to write the initial application scaffolds for:

- `web/`
- `python-server/`
- `node-ai/`

This will allow the first end-to-end local flow to be tested before MongoDB, Azure deployment, and chatbot work are added.
