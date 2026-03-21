# Registration System Assignment - Architecture Plan

## Overview

This project is a registration and login system based on the provided Figma design.

The implementation includes:

- a web interface built with React
- a mobile interface built with React Native
- a Python server built with FastAPI
- MongoDB for persistence
- a second Node.js service that generates a welcome toast message through OpenAI
- Azure deployment for the production stack

## Client Security Model

The project now uses a client-specific auth design that is close to production practice without adding unnecessary complexity.

### Web

- the browser authenticates with an `HttpOnly` session cookie
- the cookie is set by the Python API after successful register or login
- the React app sends authenticated requests with `credentials: 'include'`
- private user data is loaded through authenticated routes instead of query-string email lookups

### Mobile

- the mobile app authenticates with a bearer access token
- the token is returned by the Python API when the request includes `X-Client-Type: mobile`
- the token is stored in Expo Secure Store
- protected mobile requests send `Authorization: Bearer <token>`

This split keeps the browser flow safer and more natural while still giving the mobile app a standard API-style auth flow.

## Screens

The Figma currently provides:

- a web login page
- a mobile login page

The implementation adapts that design language to support both registration and login.

## UI Elements

### Web Screen

- login header
- email input
- password input
- password visibility toggle
- forgot password link
- login button
- separator between standard login and social login
- Google button
- Facebook button
- register mode switch

### Mobile Screen

- the same auth fields and actions as the web screen
- layout adapted for mobile spacing and touch targets
- token-backed authenticated toast polling after registration

## Submission Flow

### Registration

1. The user submits the registration form from web or mobile.
2. The frontend sends the data to the Python server.
3. Python validates the payload and saves the user in MongoDB.
4. Python authenticates the user immediately:
   - `web`: creates a session and sets an `HttpOnly` cookie
   - `mobile`: returns an access token
5. Python queues a background task to request a toast from `node-ai`.
6. The frontend polls `GET /me/toast` as the authenticated user.
7. The frontend displays the toast when it becomes available.

### Login

1. The user submits email and password.
2. Python verifies the password hash stored in MongoDB.
3. Python returns the authenticated result using the same client-specific auth mode.
4. The frontend can then access protected endpoints such as `GET /me`.

## Main Backend Responsibilities

The `python-server/` service is responsible for:

- receiving register and login requests
- validating submitted data
- hashing and verifying passwords
- saving users in MongoDB
- creating and validating web sessions
- issuing and validating mobile access tokens
- exposing protected user endpoints
- calling the Node.js AI service after successful registration
- storing the generated toast with the user document
- reading deployment settings from environment variables

Current endpoints:

- `GET /health`
- `POST /register`
- `POST /login`
- `POST /logout`
- `GET /me`
- `GET /me/toast`

## AI Toast Service

The `node-ai/` service is responsible for:

- generating short welcome toast messages
- calling OpenAI when configured
- falling back to predefined messages if OpenAI is unavailable
- exposing a health endpoint for deployment checks

Current endpoints:

- `GET /health`
- `GET /toast-message`

## Database Layer

MongoDB stores:

- user email
- password hash
- phone and full name
- generated toast message
- created date
- server-side web sessions

## Deployment

The deployed stack uses:

- `web/` as a static React build served by Nginx
- `python-server/` as the main FastAPI backend
- `node-ai/` as the toast-message service
- MongoDB Atlas as the managed database

Production planning includes:

- env-based secret management
- CORS with credentials enabled for the web client
- `SESSION_COOKIE_SECURE=true` in Azure
- auth secrets configured through Azure-managed environment variables

## Testing Strategy

The test strategy is split by service:

- `python-server/tests/`
  - `/health`
  - `/register`
  - `/login`
  - `/logout`
  - `/me`
  - `/me/toast`
  - toast-fetch fallback and retry behavior
- `node-ai/tests/`
  - `/health`
  - `/toast-message`
  - CORS preflight
  - 404 handling
- `web/src/test/`
  - auth mode switching
  - registration validation
  - authenticated register + toast polling flow

## Design Clarification

The assignment asks for a registration interface, while the Figma is login-oriented. The implementation follows the provided design language while supporting both auth modes.

## Current Direction

The project is now past the initial demo-auth stage.

The current architecture goal is:

- secure browser auth with `HttpOnly` cookies
- standard mobile auth with bearer tokens
- authenticated user-owned data access
- production-friendly Azure deployment settings
