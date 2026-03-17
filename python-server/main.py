import os
from urllib.error import URLError
from urllib.request import urlopen

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from pymongo.errors import PyMongoError
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
mongodb_name = os.getenv("MONGODB_DB_NAME", "ab_deliveries")
node_ai_url = os.getenv("NODE_AI_URL", "http://127.0.0.1:3001/toast-message")

client = MongoClient(mongodb_uri)
database = client[mongodb_name]
users_collection = database["users"]


def fetch_toast_message():
    fallback_message = "Run the node-ai (Node.js) server first to see the toast messages."

    try:
        with urlopen(node_ai_url, timeout=3) as response:
            payload = response.read().decode("utf-8")
    except URLError:
        return fallback_message

    import json

    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return fallback_message

    return data.get("toastMessage", fallback_message)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/register")
def register(payload: RegistrationRequest):
    print(f"Registration request received for email: {payload.email}")

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    existing_user = users_collection.find_one({"email": payload.email.lower()})
    if existing_user:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")

    hashed_password = pwd_context.hash(payload.password)

    user_document = {
        "fullName": payload.fullName.strip(),
        "phone": payload.phone.strip(),
        "email": payload.email.lower(),
        "passwordHash": hashed_password,
    }

    try:
        users_collection.insert_one(user_document)
    except PyMongoError as error:
        raise HTTPException(status_code=500, detail=f"Database error: {error}") from error

    toast_message = fetch_toast_message()

    return {
        "success": True,
        "message": f"Welcome aboard, {payload.fullName}! Your registration was saved.",
        "toastMessage": toast_message,
        "user": {
            "fullName": payload.fullName,
            "phone": payload.phone,
            "email": payload.email,
        },
    }


@app.post("/login")
def login(payload: LoginRequest):
    print(f"Login request received for email: {payload.email}")

    user = users_collection.find_one({"email": payload.email.lower()})

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
