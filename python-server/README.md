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
- `SESSIONS_COLLECTION_NAME`
- `NODE_AI_URL`
- `NODE_AI_TIMEOUT_SECONDS`
- `NODE_AI_RETRY_COUNT`
- `ALLOWED_ORIGINS`
- `AUTH_TOKEN_SECRET`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS`
- `SESSION_COOKIE_NAME`
- `SESSION_COOKIE_SECURE`
- `SESSION_COOKIE_SAMESITE`
- `SESSION_COOKIE_TTL_SECONDS`

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
- `POST /logout`
- `GET /me`
- `GET /me/toast`
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
- `POST /logout`
- `GET /me`
- `GET /me/toast`
- `GET /me/toast/stream`

Behavior notes:

- registration saves the user immediately, then fetches the toast in a background task
- `web` auth uses an `HttpOnly` session cookie
- `mobile` auth uses a bearer access token when `X-Client-Type: mobile` is sent
- private user data is now read through authenticated endpoints instead of email query parameters
- `web` delivers the toast through an authenticated SSE stream instead of repeated polling
- `mobile` uses a two-step fallback read of `GET /me/toast` after registration
- toast fetches retry, but if generation still fails the user stays saved and `toastMessage` remains empty
