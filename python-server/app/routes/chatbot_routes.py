from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel

from app.services import chatbot_service, whatsapp_service


router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class ChatbotMessageRequest(BaseModel):
    channel: str = "local-test"
    customerName: Optional[str] = None
    customerPhone: str
    message: str


@router.post("/messages")
def create_chatbot_message(payload: ChatbotMessageRequest, request: Request):
    return chatbot_service.generate_chatbot_reply(
        channel=payload.channel,
        customer_phone=payload.customerPhone,
        message_text=payload.message,
        customer_name=payload.customerName,
        request_id=request.state.request_id,
    )


@router.post("/webhooks/whatsapp")
async def handle_whatsapp_webhook(
    request: Request,
    x_twilio_signature: Optional[str] = Header(default=None, alias="X-Twilio-Signature"),
):
    form = await request.form()
    form_fields = {key: str(value) for key, value in form.items()}
    whatsapp_service.validate_twilio_request_signature(
        url=whatsapp_service.build_webhook_url(str(request.url)),
        form_fields=form_fields,
        signature=x_twilio_signature,
    )

    from_number = form_fields.get("From")
    message_text = form_fields.get("Body")
    profile_name = form_fields.get("ProfileName")

    if not from_number or not message_text:
        raise HTTPException(status_code=422, detail="From and Body are required.")

    whatsapp_result = whatsapp_service.handle_incoming_whatsapp_message(
        from_number=from_number,
        message_text=message_text,
        profile_name=profile_name,
        request_id=request.state.request_id,
    )

    return Response(
        content=whatsapp_result["twiml"],
        media_type="application/xml",
        headers={"X-Request-ID": request.state.request_id},
    )
