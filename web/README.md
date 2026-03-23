# Web App

React + Vite frontend for the A.B Deliveries assignment.

Local development:

```bash
npm install
npm run dev
```

Environment variables:

- `VITE_API_BASE_URL`

Use `web/.env.example` for local setup.

Build:

```bash
npm run build
```

Tests:

```bash
npm test
```

What the web app currently does:

- renders the login and registration UI based on the assignment Figma direction
- calls the Python API for login and registration
- shows the immediate success/error state from the backend
- stores the short-lived access token in memory only
- sends protected API requests with `Authorization: Bearer <accessToken>`
- uses `credentials: 'include'` for refresh and stream-cookie requests
- receives an `HttpOnly` refresh cookie for silent auth recovery
- requests a short-lived stream cookie before opening SSE
- opens a single SSE connection to `GET /me/toast/stream` after registration so delayed toast messages can be shown without noisy polling

Production note:

- the Azure deployment is built as a static bundle and served through Nginx
- the production image must be built with `VITE_API_BASE_URL=<live-python-api-url>` so the browser does not fall back to `localhost`
