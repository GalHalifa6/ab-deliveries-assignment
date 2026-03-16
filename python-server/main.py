from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr


class RegistrationRequest(BaseModel):
    fullName: str
    phone: str
    email: EmailStr
    password: str


app = FastAPI(title="A.B Deliveries Python Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/register")
def register(payload: RegistrationRequest):
    print(f"Registration request received for email: {payload.email}")

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    return {
        "success": True,
        "message": f"Welcome aboard, {payload.fullName}! Your registration was received.",
        "user": {
            "fullName": payload.fullName,
            "phone": payload.phone,
            "email": payload.email,
        },
    }
