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
- `node-ai/` as the toast-message backend
- MongoDB Atlas as the external database

## Auth Behavior In Production

### Web

- the browser authenticates with an `HttpOnly` cookie issued by `python-server`
- the frontend must call the API with `credentials: 'include'`
- the Python API must keep `allow_credentials=True` in CORS
- `SESSION_COOKIE_SECURE` should be `true` in Azure so the cookie is sent only over HTTPS

### Mobile

- the mobile app sends `X-Client-Type: mobile` on login and register
- the Python API returns a bearer access token
- the mobile app stores that token locally and sends it in the `Authorization` header for protected requests

### Protected Routes

Private user data now loads from:

- `GET /me`
- `GET /me/toast`
- `GET /me/toast/stream`
- `POST /logout`

The old email-query-based private fetch flow should not be used in production.

## Flow In Production

1. The browser or mobile app loads the client UI.
2. The client sends register or login requests to the Python API.
3. The Python API verifies credentials and authenticates the user:
   - `web`: sets a session cookie
   - `mobile`: returns an access token
4. On registration, Python saves the user immediately.
5. Python requests a toast message from the deployed `node-ai` service asynchronously.
6. Python stores the generated toast message with the user record.
7. `web` opens a single authenticated SSE request to `GET /me/toast/stream` and waits for the toast event.
8. `mobile` performs two low-noise fallback checks against `GET /me/toast` after registration.

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

## Required Azure App Settings

The Python backend now needs these auth-related settings in Azure in addition to the database and Node AI settings:

- `AUTH_TOKEN_SECRET`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS`
- `SESSION_COOKIE_NAME`
- `SESSION_COOKIE_SECURE=true`
- `SESSION_COOKIE_SAMESITE=lax`
- `SESSION_COOKIE_TTL_SECONDS`
- `SESSIONS_COLLECTION_NAME`
- `ALLOWED_ORIGINS`

Recommended notes:

- use a strong random value for `AUTH_TOKEN_SECRET`
- keep `SESSION_COOKIE_SECURE=true` in Azure
- if the deployment topology changes to a truly cross-site setup, re-check the `SameSite` strategy

## Current Known Limitations

- The Hebrew chatbot and conversation logging are not implemented yet
- MongoDB credentials used during testing should be rotated after deployment
- Mobile currently uses an access-token flow without refresh-token rotation
- Mobile toast delivery is intentionally simpler than web and can still miss very late toast writes

## Recommended Next Steps

1. Rotate the MongoDB Atlas password and update the Azure app setting
2. Verify the web login flow with browser dev tools and HTTPS cookies
3. Decide whether mobile needs one more delayed toast check or a richer real-time channel later
4. Add a password-reset flow when the core auth migration is stable
