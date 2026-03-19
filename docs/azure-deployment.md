# Azure Deployment Notes

This document records the Azure deployment that is currently working for the A.B Deliveries assignment.

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

The deployed stack currently uses:

- `web/` as a static React build served by Nginx
- `python-server/` as the main FastAPI backend
- `node-ai/` as the toast-message backend
- MongoDB Atlas as the external database

Flow in production:

1. The browser loads the deployed React app.
2. The React app sends register/login requests to the deployed Python API.
3. The Python API connects to MongoDB Atlas.
4. On registration, Python saves the user immediately.
5. Python requests a toast message from the deployed `node-ai` service asynchronously.
6. Python stores the generated toast message with the user record.
7. The frontend can show the toast after the message becomes available.

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
14. Rebuild and redeploy `node-ai` with the OpenAI integration
15. Rebuild and redeploy `python-server` and `web` for the delayed-toast flow

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
- The registration flow now saves the user first and stores the toast asynchronously
- The Python backend now retries toast fetches before storing the friendly fallback message

## Current Known Limitations

- The Hebrew chatbot and conversation logging are not implemented yet
- MongoDB credentials used during testing should be rotated after deployment
- The delayed toast delivery UX still needs final polish

## Recommended Next Steps

1. Rotate the MongoDB Atlas password and update the Azure app setting
2. Polish the delayed toast delivery UX after registration
3. Add the Hebrew chatbot and conversation logging flow
4. Optionally move `node-ai` to internal-only service-to-service access after the current flow is finalized
