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

### Main Backend

The `python-server/` service will be responsible for:

- Receiving registration requests
- Validating submitted data
- Handling the business logic
- Saving users to MongoDB
- Calling the Node.js AI service after successful registration
- Returning success or error responses to the frontend

Suggested initial endpoint:

- `POST /register`
- `POST /login`

### AI Toast Service

The `node-ai/` service will be responsible for:

- Receiving a request from the Python server for a toast message
- Calling OpenAI
- Returning a short random message suitable for a toast notification

Suggested initial endpoint:

- `GET /toast-message`

### Database Layer

MongoDB will store registration data such as:

- Email
- Password hash or secure credential representation
- Created date
- Optional profile metadata

### Deployment

Azure is the target deployment platform for the backend services.

Deployment planning should include:

- Environment variable management
- Azure service selection
- MongoDB connection string configuration
- Production API URLs for frontend clients

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
8. Build the mobile UI
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

- Add the `node-ai/` toast message service
- Let the Python server call the toast service after successful registration
- Return the toast content to the frontend from Python
- Update the mobile app to follow the same registration flow
