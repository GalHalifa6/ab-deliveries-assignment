import logging
import os
import time
from typing import List
from urllib.error import URLError
from urllib.request import urlopen

import certifi
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError
from passlib.context import CryptContext


class RegistrationRequest(BaseModel):
    fullName: str
    phone: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


app = FastAPI(title="A.B Deliveries Python Server")
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
logger = logging.getLogger(__name__)


def get_allowed_origins() -> List[str]:
    configured_origins = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://127.0.0.1:8081",
    )
    return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
mongodb_name = os.getenv("MONGODB_DB_NAME", "ab_deliveries")
users_collection_name = os.getenv("USERS_COLLECTION_NAME", "users")
node_ai_url = os.getenv("NODE_AI_URL", "http://127.0.0.1:3001/toast-message")
node_ai_timeout_seconds = float(os.getenv("NODE_AI_TIMEOUT_SECONDS", "7"))
node_ai_retry_count = int(os.getenv("NODE_AI_RETRY_COUNT", "3"))

mongodb_client_options = {
    "serverSelectionTimeoutMS": 5000,
}

if mongodb_uri.startswith("mongodb+srv://"):
    mongodb_client_options["tlsCAFile"] = certifi.where()

client = MongoClient(mongodb_uri, **mongodb_client_options)
database = client[mongodb_name]
users_collection = database[users_collection_name]


def fetch_toast_message():
    fallback_message = "Welcome aboard. We are getting your first delivery update ready."

    for attempt in range(1, node_ai_retry_count + 1):
        try:
            with urlopen(node_ai_url, timeout=node_ai_timeout_seconds) as response:
                payload = response.read().decode("utf-8")

            import json

            data = json.loads(payload)
            toast_message = data.get("toastMessage")

            if toast_message:
                return toast_message

            logger.warning("Node AI response did not include toastMessage on attempt %s.", attempt)
        except (TimeoutError, URLError) as error:
            logger.warning("Node AI request failed on attempt %s: %s", attempt, error)
        except json.JSONDecodeError as error:
            logger.warning("Node AI returned invalid JSON on attempt %s: %s", attempt, error)

        if attempt < node_ai_retry_count:
            time.sleep(attempt * 0.5)

    return fallback_message


def generate_and_store_toast_message(email: str):
    toast_message = fetch_toast_message()

    users_collection.update_one(
        {"email": email.lower()},
        {"$set": {"toastMessage": toast_message}},
    )


@app.get("/health")
def health_check():
    database_status = "ok"

    try:
        client.admin.command("ping")
    except ServerSelectionTimeoutError:
        database_status = "unreachable"

    return {
        "status": "ok",
        "service": "python-server",
        "nodeAiUrl": node_ai_url,
        "nodeAiTimeoutSeconds": node_ai_timeout_seconds,
        "nodeAiRetryCount": node_ai_retry_count,
        "database": mongodb_name,
        "usersCollection": users_collection_name,
        "databaseStatus": database_status,
    }


@app.post("/register")
def register(payload: RegistrationRequest, background_tasks: BackgroundTasks):
    logger.info("Registration request received for email: %s", payload.email)

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    try:
        existing_user = users_collection.find_one({"email": payload.email.lower()})
    except ServerSelectionTimeoutError as error:
        raise HTTPException(status_code=503, detail="Database connection is currently unavailable.") from error

    if existing_user:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")

    hashed_password = pwd_context.hash(payload.password)

    user_document = {
        "fullName": payload.fullName.strip(),
        "phone": payload.phone.strip(),
        "email": payload.email.lower(),
        "passwordHash": hashed_password,
        "toastMessage": None,
    }

    try:
        users_collection.insert_one(user_document)
    except PyMongoError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {error}") from error

    background_tasks.add_task(generate_and_store_toast_message, payload.email)

    return {
        "success": True,
        "message": f"Welcome aboard, {payload.fullName}! Your registration was saved.",
        "toastPending": True,
        "user": {
            "fullName": payload.fullName,
            "phone": payload.phone,
            "email": payload.email,
        },
    }


@app.get("/user-toast")
def get_user_toast(email: EmailStr):
    user = users_collection.find_one({"email": email.lower()})

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    toast_message = user.get("toastMessage")

    return {
        "ready": bool(toast_message),
        "toastMessage": toast_message,
    }


@app.post("/login")
def login(payload: LoginRequest):
    logger.info("Login request received for email: %s", payload.email)

    try:
        user = users_collection.find_one({"email": payload.email.lower()})
    except ServerSelectionTimeoutError as error:
        raise HTTPException(status_code=503, detail="Database connection is currently unavailable.") from error

    if not user or not pwd_context.verify(payload.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {
        "success": True,
        "message": f"Welcome back, {user['fullName']}!",
        "user": {
            "fullName": user["fullName"],
            "phone": user["phone"],
            "email": user["email"],
        },
    }
