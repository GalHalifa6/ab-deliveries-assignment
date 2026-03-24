# Azure Deployment Notes

This document records the Azure deployment shape that is currently working for the A.B Deliveries assignment and the additional auth settings required by the new web and mobile security flow.

## Current Azure Resources

- Resource group: `ab-deliveries-rg`
- Region used for Container Apps: `northeurope`
- Azure Container Registry: `abdeliveriesgalha2026.azurecr.io`
- Container Apps environment: `ab-deliveries-env-ne`

## Live URLs

- Web: `https://ab-web.salmonmoss-0b293592.northeurope.azurecontainerapps.io`
- Python API: `https://ab-python-server.salmonmoss-0b293592.northeurope.azurecontainerapps.io`
- Node AI: `https://ab-node-ai.salmonmoss-0b293592.northeurope.azurecontainerapps.io`

## Architecture Used In Azure

The deployed stack uses:

- `web/` as a static React build served by Nginx
- `python-server/` as the main FastAPI backend
- `node-ai/` as the toast-message and chatbot-reply backend
- MongoDB Atlas as the external database

## Auth Behavior In Production

### Web

- the browser keeps the short-lived access token in memory
- the Python API sets the refresh token in an `HttpOnly` cookie
- the frontend calls normal API routes with `Authorization: Bearer <accessToken>`
- the frontend calls refresh and stream-cookie endpoints with `credentials: 'include'`
- the Python API must keep `allow_credentials=True` in CORS
- `REFRESH_COOKIE_SECURE` and `STREAM_COOKIE_SECURE` should be `true` in Azure so cookies are sent only over HTTPS

### Mobile

- the mobile app sends `X-Client-Type: mobile` on login and register
- the Python API returns both an access token and a refresh token
- the mobile app stores both tokens securely and sends the access token in the `Authorization` header for protected requests
- mobile refreshes with the stored refresh token when the access token expires

### Protected Routes

Private user data now loads from:

- `GET /me`
- `PATCH /me/profile`
- `GET /me/toast`
- `GET /me/toast/stream`
- `POST /refresh`
- `POST /logout`
- `POST /logout-all`
- `POST /me/toast/stream-session`

The old email-query-based private fetch flow should not be used in production.

## Flow In Production

1. The browser or mobile app loads the client UI.
2. The client sends register or login requests to the Python API.
3. The Python API verifies credentials and authenticates the user:
   - `web`: returns an access token and sets a refresh cookie
   - `mobile`: returns an access token and a refresh token
4. On registration, Python saves the user immediately.
5. Python requests a toast message from the deployed `node-ai` service asynchronously.
6. Python stores the generated toast message with the user record.
7. `web` silently restores access with `POST /refresh` when needed and uses `POST /me/toast/stream-session` to obtain a short-lived stream cookie for SSE.
8. `web` opens a single authenticated SSE request to `GET /me/toast/stream` and waits for the toast event.
9. `mobile` refreshes tokens when needed and performs two low-noise fallback checks against `GET /me/toast` after registration.

## Google Web Login In Production

The deployed Google sign-in flow needs:

1. a Google OAuth client with allowed origins:
   - `http://localhost:5173`
   - `https://ab-web.salmonmoss-0b293592.northeurope.azurecontainerapps.io`
2. Python runtime env:
   - `GOOGLE_OAUTH_WEB_CLIENT_ID`
3. web build-time env:
   - `VITE_GOOGLE_CLIENT_ID`

Important:

- `VITE_GOOGLE_CLIENT_ID` must be available during the Docker build, not only as a runtime Container App variable
- the GitHub deploy workflow now passes it into the `web` image build from a GitHub Actions secret

## Deployment Sequence Used

The working deployment was created in this order:

1. Log in to Azure CLI
2. Create the resource group
3. Register the missing Azure providers
4. Create Azure Container Registry
5. Create the Azure Container Apps environment
6. Build and push the `node-ai` image
7. Deploy `node-ai`
8. Build and push the `python-server` image
9. Deploy `python-server`
10. Build and push the `web` image with the live Python API URL baked in
11. Deploy `web`
12. Update Python CORS for the live web URL
13. Add OpenAI environment variables to `ab-node-ai`

## GitHub Actions CI/CD

The repository now supports a gated GitHub Actions deployment flow:

1. `Tests` runs on every push and pull request.
2. The workflow runs four suites independently:
   - `python-server`
   - `node-ai`
   - `web`
   - `mobile`
3. `Deploy to Azure` runs automatically only after `Tests` completes successfully on `main`.
4. The deploy workflow:
   - logs into Azure
   - logs into Azure Container Registry
   - detects which deployable service paths changed
   - builds and pushes only the affected Docker images
   - updates only the affected Azure Container Apps
   - verifies the live health endpoints for the services that were deployed
   - skips deployment entirely when a push changes only non-deployable files such as documentation

Path behavior:

- changes under `python-server/` deploy only `ab-python-server`
- changes under `node-ai/` deploy only `ab-node-ai`
- changes under `web/` deploy only `ab-web`
- manual workflow dispatch deploys all three services

Workflow files:

- `.github/workflows/tests.yml`
- `.github/workflows/deploy-azure.yml`
- `.github/workflows/secret-scan.yml`

### Required GitHub Secret

The deployment workflow expects this repository secret:

- `AZURE_CREDENTIALS`

This should contain the Azure service principal JSON used by `azure/login@v2`.

### Recommended GitHub Branch Settings

To make GitHub reject untested changes before they reach production:

- protect the `main` branch
- require the `Tests` workflow to pass before merge
- require the `Secret Scan` workflow to pass before merge
- optionally require pull requests before allowing changes into `main`

## Important Azure Notes

- `westeurope` initially failed due to Azure capacity constraints for Container Apps, so the working Container Apps environment was created in `northeurope`
- `az acr build` was not allowed in the subscription, so Docker images were built locally and pushed with `docker push`
- The Python backend required a fresh revision suffix during updates to force Container Apps to pick up the rebuilt image
- Azure Container Apps use Azure-managed environment variables, so local `.env` files are not used directly in production

## Runtime Fixes Applied

The following fixes were required during deployment:

- MongoDB Atlas access had to allow Azure traffic through the Atlas IP access list
- The Python backend was updated to use `certifi` and an explicit `tlsCAFile` when using `mongodb+srv://`
- The Python Docker image was moved to `python:3.12-slim` and given system CA certificates
- The Python backend health endpoint was updated to expose `databaseStatus`
- The Python backend was updated to handle Node AI timeouts gracefully
- `node-ai` now uses OpenAI through `OPENAI_API_KEY` and `OPENAI_MODEL`
- The deployed model is currently `gpt-5-mini`
- The registration flow saves the user first and stores the toast asynchronously
- The chatbot prompt was copied into `node-ai/` so the container can load it directly in Azure
- Google Sheets logging in Azure uses a base64-encoded service-account JSON secret to avoid CLI JSON escaping issues

## Required Azure App Settings

The Python backend now needs these auth-related settings in Azure in addition to the database and Node AI settings:

- `JWT_ACCESS_TOKEN_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS`
- `STREAM_TOKEN_SECRET`
- `STREAM_TOKEN_TTL_SECONDS`
- `ACCESS_TOKEN_REQUIRE_ACTIVE_SESSION`
- `REFRESH_COOKIE_NAME`
- `REFRESH_COOKIE_SECURE=true`
- `REFRESH_COOKIE_SAMESITE=lax`
- `STREAM_COOKIE_NAME`
- `STREAM_COOKIE_SECURE=true`
- `STREAM_COOKIE_SAMESITE=lax`
- `REFRESH_SESSIONS_COLLECTION_NAME`
- `ALLOWED_ORIGINS`

Chatbot-related Azure settings:

- `NODE_AI_CHATBOT_URL`
- `SHIPMENTS_COLLECTION_NAME`
- `GOOGLE_SHEETS_LOGGING_ENABLED`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_SHEET_NAME`
- one of:
  - `GOOGLE_SERVICE_ACCOUNT_JSON`
  - `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`
  - `GOOGLE_SERVICE_ACCOUNT_FILE`
- `TWILIO_WHATSAPP_NUMBER`
- `TWILIO_VALIDATE_SIGNATURE`
- `TWILIO_WHATSAPP_WEBHOOK_URL`

Google auth Azure/GitHub settings:

- `GOOGLE_OAUTH_WEB_CLIENT_ID` on `ab-python-server`
- `VITE_GOOGLE_CLIENT_ID` as a GitHub Actions secret for the `web` build

Recommended notes:

- use strong random values for `JWT_ACCESS_TOKEN_SECRET` and `STREAM_TOKEN_SECRET`
- keep `REFRESH_COOKIE_SECURE=true` and `STREAM_COOKIE_SECURE=true` in Azure
- keep `ACCESS_TOKEN_REQUIRE_ACTIVE_SESSION=false` unless you intentionally want DB-backed access-token revocation checks
- if the deployment topology changes to a truly cross-site setup, re-check the `SameSite` strategy
