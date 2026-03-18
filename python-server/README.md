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
- `NODE_AI_URL`
- `ALLOWED_ORIGINS`

Use `python-server/.env.example` as the starting point for local or Azure configuration.

Docker:

```bash
docker build -t ab-deliveries-python ./python-server
docker run --env-file python-server/.env -p 8000:8000 ab-deliveries-python
```

Tests:

```bash
python -m unittest discover -s tests -v
```

What is covered:

- `GET /health`
- `POST /register`
- `POST /login`
- toast message fetch success and fallback handling

CI:

- This service is included in `.github/workflows/tests.yml`
- Its tests run automatically on every push and pull request

Implementation notes:

- Logging uses Python `logging` instead of raw `print(...)`
- Runtime configuration is env-based for local and Azure deployment

Available endpoints:

- `GET /health`
- `POST /register`
- `POST /login`
