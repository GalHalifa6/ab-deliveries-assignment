import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app.services import whatsapp_service


class WhatsAppServiceUnitTests(unittest.TestCase):
    def test_normalize_whatsapp_phone_removes_prefix(self):
        self.assertEqual(
            whatsapp_service.normalize_whatsapp_phone("whatsapp:+972501234567"),
            "+972501234567",
        )

    def test_build_twiml_response_escapes_xml_characters(self):
        twiml = whatsapp_service.build_twiml_response("שלום & תודה")

        self.assertIn("<Message>שלום &amp; תודה</Message>", twiml)

    @patch("app.services.whatsapp_service.config")
    def test_validate_twilio_request_signature_accepts_matching_signature(self, config_mock):
        config_mock.TWILIO_VALIDATE_SIGNATURE = True
        config_mock.TWILIO_AUTH_TOKEN = "secret"

        form_fields = {
            "From": "whatsapp:+972501234567",
            "Body": "איפה המשלוח שלי?",
        }
        signature = whatsapp_service.build_twilio_signature("https://example.com/webhook", form_fields)

        whatsapp_service.validate_twilio_request_signature(
            url="https://example.com/webhook",
            form_fields=form_fields,
            signature=signature,
        )

    @patch("app.services.whatsapp_service.config")
    def test_validate_twilio_request_signature_rejects_invalid_signature(self, config_mock):
        config_mock.TWILIO_VALIDATE_SIGNATURE = True
        config_mock.TWILIO_AUTH_TOKEN = "secret"

        with self.assertRaises(HTTPException) as error:
            whatsapp_service.validate_twilio_request_signature(
                url="https://example.com/webhook",
                form_fields={"Body": "שלום"},
                signature="invalid",
            )

        self.assertEqual(error.exception.status_code, 403)

    @patch("app.services.whatsapp_service.chatbot_service.generate_chatbot_reply")
    def test_handle_incoming_whatsapp_message_delegates_to_chatbot_service(self, generate_reply_mock):
        generate_reply_mock.return_value = {
            "reply": "החבילה בדרך למסירה 🙂",
            "intent": "tracking",
            "channel": "whatsapp",
            "customer": {
                "name": "Gal Halifa",
                "phone": "+972501234567",
            },
            "shipment": None,
            "shipmentCandidates": [],
        }

        result = whatsapp_service.handle_incoming_whatsapp_message(
            from_number="whatsapp:+972501234567",
            message_text="איפה החבילה שלי?",
            profile_name="גל חליפה",
        )

        generate_reply_mock.assert_called_once_with(
            channel="whatsapp",
            customer_phone="+972501234567",
            message_text="איפה החבילה שלי?",
            customer_name="גל חליפה",
        )
        self.assertEqual(result["reply"], "החבילה בדרך למסירה 🙂")
        self.assertIn("<Message>החבילה בדרך למסירה 🙂</Message>", result["twiml"])
