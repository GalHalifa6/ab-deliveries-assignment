import json
import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.services import chatbot_service


class ChatbotServiceUnitTests(unittest.TestCase):
    def test_extract_tracking_number_returns_normalized_match(self):
        tracking_number = chatbot_service.extract_tracking_number("שלום, מה הסטטוס של ab123456?")

        self.assertEqual(tracking_number, "AB123456")

    @patch("app.services.chatbot_service.shipment_repository")
    def test_build_chatbot_context_uses_single_phone_match_when_tracking_missing(self, shipment_repository_mock):
        shipment_repository_mock.get_by_tracking_number.return_value = None
        shipment_repository_mock.get_recent_by_phone.return_value = [
            {
                "trackingNumber": "AB100001",
                "customerName": "Gal Halifa",
                "phone": "+972501234567",
                "status": "out_for_delivery",
                "statusLabel": "בדרך למסירה",
                "estimatedDelivery": "2026-03-23T15:00:00Z",
                "destinationCity": "Haifa",
            }
        ]

        context = chatbot_service.build_chatbot_context(
            "whatsapp",
            "+972501234567",
            "איפה החבילה שלי?",
        )

        self.assertEqual(context["customer"]["name"], "Gal Halifa")
        self.assertEqual(context["shipment"]["trackingNumber"], "AB100001")

    @patch("app.services.chatbot_service.urlopen")
    def test_fetch_chatbot_reply_returns_reply_and_intent(self, urlopen_mock):
        response_mock = MagicMock()
        response_mock.read.return_value = json.dumps(
            {
                "success": True,
                "reply": "החבילה בדרך למסירה 🙂",
                "intent": "tracking",
            }
        ).encode("utf-8")
        urlopen_mock.return_value.__enter__.return_value = response_mock

        result = chatbot_service.fetch_chatbot_reply({"userMessage": "איפה החבילה שלי?"})

        self.assertEqual(
            result,
            {
                "reply": "החבילה בדרך למסירה 🙂",
                "intent": "tracking",
            },
        )

    @patch("app.services.chatbot_service.urlopen")
    def test_fetch_chatbot_reply_rejects_incomplete_payload(self, urlopen_mock):
        response_mock = MagicMock()
        response_mock.read.return_value = json.dumps({"success": True, "reply": ""}).encode("utf-8")
        urlopen_mock.return_value.__enter__.return_value = response_mock

        with self.assertRaises(HTTPException) as error:
            chatbot_service.fetch_chatbot_reply({"userMessage": "שלום"})

        self.assertEqual(error.exception.status_code, 503)

    def test_build_chatbot_log_entry_includes_assignment_fields(self):
        entry = chatbot_service.build_chatbot_log_entry(
            {
                "channel": "whatsapp",
                "customer": {
                    "name": "Gal Halifa",
                    "phone": "+972501234567",
                },
                "shipment": {
                    "trackingNumber": "AB100001",
                    "status": "out_for_delivery",
                    "statusLabel": "בדרך למסירה",
                },
                "userMessage": "איפה החבילה שלי?",
            },
            {
                "reply": "החבילה בדרך למסירה 🙂",
                "intent": "tracking",
            },
        )

        self.assertEqual(entry["channel"], "whatsapp")
        self.assertEqual(entry["customerName"], "Gal Halifa")
        self.assertEqual(entry["phone"], "+972501234567")
        self.assertEqual(entry["trackingNumber"], "AB100001")
        self.assertEqual(entry["shipmentStatus"], "בדרך למסירה")
        self.assertEqual(entry["userMessage"], "איפה החבילה שלי?")
        self.assertEqual(entry["assistantReply"], "החבילה בדרך למסירה 🙂")
        self.assertEqual(entry["intent"], "tracking")
        self.assertTrue(entry["timestamp"])

    @patch("app.services.chatbot_service.google_sheets_service.append_chatbot_log_entry")
    @patch("app.services.chatbot_service.fetch_chatbot_reply")
    @patch("app.services.chatbot_service.build_chatbot_context")
    def test_generate_chatbot_reply_logs_exchange(self, build_context_mock, fetch_reply_mock, append_log_mock):
        build_context_mock.return_value = {
            "channel": "whatsapp",
            "customer": {
                "name": "Gal Halifa",
                "phone": "+972501234567",
            },
            "shipment": {
                "trackingNumber": "AB100001",
                "status": "out_for_delivery",
                "statusLabel": "בדרך למסירה",
            },
            "shipmentCandidates": [],
            "userMessage": "איפה החבילה שלי?",
        }
        fetch_reply_mock.return_value = {
            "reply": "החבילה בדרך למסירה 🙂",
            "intent": "tracking",
        }

        result = chatbot_service.generate_chatbot_reply(
            "whatsapp",
            "+972501234567",
            "איפה החבילה שלי?",
            "Gal Halifa",
        )

        append_log_mock.assert_called_once()
        self.assertEqual(result["reply"], "החבילה בדרך למסירה 🙂")
        self.assertEqual(result["intent"], "tracking")
