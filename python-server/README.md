# Python Server

Local development:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Environment variables:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `USERS_COLLECTION_NAME`
- `REFRESH_SESSIONS_COLLECTION_NAME`
- `NODE_AI_URL`
- `NODE_AI_TIMEOUT_SECONDS`
- `NODE_AI_RETRY_COUNT`
- `ALLOWED_ORIGINS`
- `JWT_ACCESS_TOKEN_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS`
- `STREAM_TOKEN_SECRET`
- `STREAM_TOKEN_TTL_SECONDS`
- `ACCESS_TOKEN_REQUIRE_ACTIVE_SESSION`
- `REFRESH_COOKIE_NAME`
- `REFRESH_COOKIE_SECURE`
- `REFRESH_COOKIE_SAMESITE`
- `STREAM_COOKIE_NAME`
- `STREAM_COOKIE_SECURE`
- `STREAM_COOKIE_SAMESITE`

Use `python-server/.env.example` as the starting point for local or Azure configuration.

Docker:

```bash
docker build -t ab-deliveries-python ./python-server
docker run --env-file python-server/.env -p 8000:8000 ab-deliveries-python
```

Docker Compose note:

- In the full local Docker stack, this service is wired to:
  - `mongodb://mongo:27017`
  - `http://node-ai:3001/toast-message`
- Those service-to-service values are set in `docker-compose.yml`

Tests:

```bash
python -m unittest discover -s tests -v
```

What is covered:

- `GET /health`
- `POST /register`
- `POST /login`
- `POST /refresh`
- `POST /logout`
- `POST /logout-all`
- `GET /me`
- `GET /me/toast`
- `POST /me/toast/stream-session`
- `GET /me/toast/stream`
- toast message fetch success, retry handling, and the no-fake-fallback behavior

CI:

- This service is included in `.github/workflows/tests.yml`
- Its tests run automatically on every push and pull request

Implementation notes:

- Logging uses Python `logging` instead of raw `print(...)`
- Runtime configuration is env-based for local and Azure deployment
- Web and mobile share the same user data model but use different auth transports

Available endpoints:

- `GET /health`
- `POST /register`
- `POST /login`
- `POST /refresh`
- `POST /logout`
- `POST /logout-all`
- `GET /me`
- `GET /me/toast`
- `POST /me/toast/stream-session`
- `GET /me/toast/stream`

Behavior notes:

- registration saves the user immediately, then fetches the toast in a background task
- the backend uses short-lived JWT access tokens plus long-lived refresh tokens
- refresh-token sessions are stored server-side in MongoDB and rotated on refresh
- `web` stores the access token in memory, uses an `HttpOnly` refresh cookie, and uses a short-lived stream cookie for SSE
- `mobile` stores both access and refresh tokens securely when `X-Client-Type: mobile` is sent
- private user data is now read through authenticated endpoints instead of email query parameters
- `web` delivers the toast through an authenticated SSE stream instead of repeated polling
- `mobile` uses a two-step fallback read of `GET /me/toast` after registration
- toast fetches retry, but if generation still fails the user stays saved and `toastMessage` remains empty
