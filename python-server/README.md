# Python Server

Local development:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Available endpoints:

- `GET /health`
- `POST /register`
