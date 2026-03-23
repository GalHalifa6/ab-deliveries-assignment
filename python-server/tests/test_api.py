import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

import main
from app import config
from app.services import auth_service, chatbot_service, toast_service, whatsapp_service


class FakeUserRepository:
    def __init__(self):
        self.documents = {}

    def get_by_email(self, email):
        return self.documents.get(email.lower())

    def create_user(self, document):
        self.documents[document["email"]] = dict(document)
        return SimpleNamespace(inserted_id=document["email"])

    def update_toast_message(self, email, toast_message):
        document = self.documents.get(email.lower())

        if not document:
            return SimpleNamespace(matched_count=0, modified_count=0)

        document["toastMessage"] = toast_message
        return SimpleNamespace(matched_count=1, modified_count=1)


class FakeRefreshSessionRepository:
    def __init__(self):
        self.documents = {}

    def create_session(self, document):
        self.documents[document["sessionId"]] = dict(document)
        return SimpleNamespace(inserted_id=document["sessionId"])

    def get_session(self, session_id):
        return self.documents.get(session_id)

    def rotate_session(self, session_id, refresh_token_hash, expires_at, last_used_at):
        document = self.documents.get(session_id)

        if not document:
            return SimpleNamespace(matched_count=0, modified_count=0)

        document.update(
            {
                "refreshTokenHash": refresh_token_hash,
                "expiresAt": expires_at,
                "lastUsedAt": last_used_at,
            }
        )
        return SimpleNamespace(matched_count=1, modified_count=1)

    def revoke_session(self, session_id, revoked_at):
        document = self.documents.get(session_id)

        if not document:
            return SimpleNamespace(matched_count=0, modified_count=0)

        document["revokedAt"] = revoked_at
        return SimpleNamespace(matched_count=1, modified_count=1)

    def revoke_all_sessions(self, user_email, revoked_at):
        modified_count = 0

        for document in self.documents.values():
            if document.get("userEmail") != user_email.lower():
                continue

            if document.get("revokedAt") is not None:
                continue

            document["revokedAt"] = revoked_at
            modified_count += 1

        return SimpleNamespace(matched_count=modified_count, modified_count=modified_count)


class PythonServerApiIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.fake_user_repository = FakeUserRepository()
        self.fake_refresh_session_repository = FakeRefreshSessionRepository()

        self.original_auth_user_repository = auth_service.user_repository
        self.original_auth_refresh_session_repository = auth_service.refresh_session_repository
        self.original_generate_chatbot_reply = chatbot_service.generate_chatbot_reply
        self.original_toast_user_repository = toast_service.user_repository
        self.original_fetch_toast_message = toast_service.fetch_toast_message
        self.original_handle_incoming_whatsapp_message = whatsapp_service.handle_incoming_whatsapp_message

        auth_service.user_repository = self.fake_user_repository
        auth_service.refresh_session_repository = self.fake_refresh_session_repository
        chatbot_service.generate_chatbot_reply = lambda **kwargs: {
            "channel": kwargs["channel"],
            "customer": {
                "name": kwargs.get("customer_name"),
                "phone": kwargs["customer_phone"],
            },
            "shipment": None,
            "shipmentCandidates": [],
            "reply": "שלום, איך אפשר לעזור עם המשלוח?",
            "intent": "general",
        }
        whatsapp_service.handle_incoming_whatsapp_message = lambda **kwargs: {
            "reply": "שלום, איך אפשר לעזור עם המשלוח?",
            "twiml": '<?xml version="1.0" encoding="UTF-8"?><Response><Message>שלום, איך אפשר לעזור עם המשלוח?</Message></Response>',
            "result": {
                "channel": "whatsapp",
                "customer": {
                    "name": kwargs.get("profile_name"),
                    "phone": kwargs["from_number"],
                },
                "shipment": None,
                "shipmentCandidates": [],
                "reply": "שלום, איך אפשר לעזור עם המשלוח?",
                "intent": "general",
            },
        }
        toast_service.user_repository = self.fake_user_repository
        toast_service.fetch_toast_message = lambda: "Test toast message"

        self.client = TestClient(main.app)

    def tearDown(self):
        auth_service.user_repository = self.original_auth_user_repository
        auth_service.refresh_session_repository = self.original_auth_refresh_session_repository
        chatbot_service.generate_chatbot_reply = self.original_generate_chatbot_reply
        whatsapp_service.handle_incoming_whatsapp_message = self.original_handle_incoming_whatsapp_message
        toast_service.user_repository = self.original_toast_user_repository
        toast_service.fetch_toast_message = self.original_fetch_toast_message

    def create_user(self, email="gal@example.com", password="welcome123", full_name="Gal Halifa"):
        self.fake_user_repository.documents[email] = {
            "fullName": full_name,
            "phone": "0501234567",
            "email": email,
            "passwordHash": auth_service.pwd_context.hash(password),
            "toastMessage": "Stored toast",
            "createdAt": 1,
        }

    def login_mobile(self, email="gal@example.com", password="welcome123"):
        return self.client.post(
            "/login",
            headers={"X-Client-Type": "mobile"},
            json={
                "email": email,
                "password": password,
            },
        )

    def test_health_check_returns_service_metadata(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertEqual(response.json()["service"], "python-server")
        self.assertIn("databaseStatus", response.json())

    def test_register_success_persists_user_sets_web_refresh_cookie_and_toast_message(self):
        payload = {
            "fullName": "Gal Halifa",
            "phone": "0501234567",
            "email": "gal@example.com",
            "password": "secure123",
        }

        response = self.client.post("/register", json=payload)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertTrue(body["toastPending"])
        self.assertEqual(body["auth"]["clientType"], "web")
        self.assertIn("accessToken", body["auth"])
        self.assertIn(config.REFRESH_COOKIE_NAME, response.cookies)

        stored_user = self.fake_user_repository.documents["gal@example.com"]
        self.assertEqual(stored_user["toastMessage"], "Test toast message")
        self.assertNotEqual(stored_user["passwordHash"], payload["password"])
        self.assertTrue(auth_service.pwd_context.verify(payload["password"], stored_user["passwordHash"]))
        self.assertEqual(len(self.fake_refresh_session_repository.documents), 1)

        session = next(iter(self.fake_refresh_session_repository.documents.values()))
        self.assertEqual(session["userEmail"], "gal@example.com")
        self.assertNotEqual(session["refreshTokenHash"], response.cookies.get(config.REFRESH_COOKIE_NAME))

    def test_register_keeps_toast_empty_when_generation_fails(self):
        toast_service.fetch_toast_message = lambda: None

        response = self.client.post(
            "/register",
            json={
                "fullName": "Gal Halifa",
                "phone": "0501234567",
                "email": "pending@example.com",
                "password": "secure123",
            },
        )

        self.assertEqual(response.status_code, 200)
        stored_user = self.fake_user_repository.documents["pending@example.com"]
        self.assertIsNone(stored_user["toastMessage"])

    def test_register_mobile_returns_access_and_refresh_tokens(self):
        response = self.client.post(
            "/register",
            headers={"X-Client-Type": "mobile"},
            json={
                "fullName": "Gal Halifa",
                "phone": "0501234567",
                "email": "mobile@example.com",
                "password": "secure123",
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["auth"]["clientType"], "mobile")
        self.assertIn("accessToken", body["auth"])
        self.assertIn("refreshToken", body)
        self.assertEqual(len(self.fake_refresh_session_repository.documents), 1)

    def test_me_toast_returns_ready_for_authenticated_access_token(self):
        self.create_user()
        login_response = self.login_mobile()
        access_token = login_response.json()["auth"]["accessToken"]

        response = self.client.get("/me/toast", headers={"Authorization": f"Bearer {access_token}"})

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ready"])
        self.assertEqual(response.json()["toastMessage"], "Stored toast")

    def test_me_returns_current_user_for_mobile_access_token(self):
        self.create_user()

        login_response = self.login_mobile()
        access_token = login_response.json()["auth"]["accessToken"]

        response = self.client.get("/me", headers={"Authorization": f"Bearer {access_token}"})

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["authenticated"])
        self.assertEqual(response.json()["user"]["email"], "gal@example.com")

    def test_stream_session_sets_short_lived_stream_cookie_for_authenticated_user(self):
        self.create_user()
        login_response = self.client.post(
            "/login",
            json={
                "email": "gal@example.com",
                "password": "welcome123",
            },
        )
        access_token = login_response.json()["auth"]["accessToken"]

        response = self.client.post(
            "/me/toast/stream-session",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertIn(config.STREAM_COOKIE_NAME, response.cookies)

    def test_stream_endpoint_reads_stream_cookie_instead_of_bearer_auth(self):
        self.create_user()
        login_response = self.client.post(
            "/login",
            json={
                "email": "gal@example.com",
                "password": "welcome123",
            },
        )
        access_token = login_response.json()["auth"]["accessToken"]

        stream_session_response = self.client.post(
            "/me/toast/stream-session",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        stream_cookie = stream_session_response.cookies.get(config.STREAM_COOKIE_NAME)

        response = self.client.get(
            "/me/toast/stream",
            cookies={config.STREAM_COOKIE_NAME: stream_cookie},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("toast-ready", response.text)
        self.assertIn("Stored toast", response.text)

    def test_register_rejects_duplicate_email(self):
        self.fake_user_repository.documents["gal@example.com"] = {
            "fullName": "Gal Halifa",
            "phone": "0501234567",
            "email": "gal@example.com",
            "passwordHash": auth_service.pwd_context.hash("existing123"),
            "toastMessage": "Existing toast",
            "createdAt": 1,
        }

        response = self.client.post(
            "/register",
            json={
                "fullName": "Gal Halifa",
                "phone": "0501234567",
                "email": "gal@example.com",
                "password": "secure123",
            },
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["detail"], "A user with this email already exists.")

    def test_register_rejects_short_password(self):
        response = self.client.post(
            "/register",
            json={
                "fullName": "Short Pass",
                "phone": "0500000000",
                "email": "short@example.com",
                "password": "1234567",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Password must be at least 8 characters long.")

    def test_login_returns_user_details_for_valid_web_credentials_and_cookie(self):
        self.create_user(password="welcome123")

        response = self.client.post(
            "/login",
            json={
                "email": "gal@example.com",
                "password": "welcome123",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["user"]["email"], "gal@example.com")
        self.assertEqual(response.json()["auth"]["clientType"], "web")
        self.assertIn("accessToken", response.json()["auth"])
        self.assertIn(config.REFRESH_COOKIE_NAME, response.cookies)

    def test_login_rejects_invalid_password(self):
        self.create_user(password="correct-password")

        response = self.client.post(
            "/login",
            json={
                "email": "gal@example.com",
                "password": "wrong-password",
            },
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid email or password.")

    def test_refresh_rotates_web_refresh_cookie_and_returns_new_access_token(self):
        self.create_user()
        login_response = self.client.post(
            "/login",
            json={
                "email": "gal@example.com",
                "password": "welcome123",
            },
        )
        original_refresh_token = login_response.cookies.get(config.REFRESH_COOKIE_NAME)
        self.client.cookies.set(config.REFRESH_COOKIE_NAME, original_refresh_token)

        response = self.client.post("/refresh")

        self.assertEqual(response.status_code, 200)
        self.assertIn("accessToken", response.json()["auth"])
        self.assertNotEqual(response.cookies.get(config.REFRESH_COOKIE_NAME), original_refresh_token)

    def test_refresh_rotates_mobile_refresh_token(self):
        self.create_user()
        login_response = self.login_mobile()
        original_refresh_token = login_response.json()["refreshToken"]

        response = self.client.post(
            "/refresh",
            headers={"X-Client-Type": "mobile"},
            json={"refreshToken": original_refresh_token},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("accessToken", response.json()["auth"])
        self.assertIn("refreshToken", response.json())
        self.assertNotEqual(response.json()["refreshToken"], original_refresh_token)

    def test_old_refresh_token_fails_after_rotation(self):
        self.create_user()
        login_response = self.login_mobile()
        original_refresh_token = login_response.json()["refreshToken"]

        refresh_response = self.client.post(
            "/refresh",
            headers={"X-Client-Type": "mobile"},
            json={"refreshToken": original_refresh_token},
        )
        self.assertEqual(refresh_response.status_code, 200)

        replay_response = self.client.post(
            "/refresh",
            headers={"X-Client-Type": "mobile"},
            json={"refreshToken": original_refresh_token},
        )

        self.assertEqual(replay_response.status_code, 401)
        self.assertEqual(replay_response.json()["detail"], "Refresh token is invalid.")

    def test_logout_revokes_mobile_refresh_session(self):
        self.create_user()
        login_response = self.login_mobile()
        refresh_token = login_response.json()["refreshToken"]

        response = self.client.post(
            "/logout",
            headers={"X-Client-Type": "mobile"},
            json={"refreshToken": refresh_token},
        )

        self.assertEqual(response.status_code, 200)

        refresh_response = self.client.post(
            "/refresh",
            headers={"X-Client-Type": "mobile"},
            json={"refreshToken": refresh_token},
        )

        self.assertEqual(refresh_response.status_code, 401)

    def test_logout_all_revokes_all_sessions_for_user(self):
        self.create_user()
        first_login = self.login_mobile()
        second_login = self.login_mobile()
        access_token = first_login.json()["auth"]["accessToken"]
        second_refresh_token = second_login.json()["refreshToken"]

        response = self.client.post(
            "/logout-all",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        self.assertEqual(response.status_code, 200)

        refresh_response = self.client.post(
            "/refresh",
            headers={"X-Client-Type": "mobile"},
            json={"refreshToken": second_refresh_token},
        )

        self.assertEqual(refresh_response.status_code, 401)
        self.assertEqual(refresh_response.json()["detail"], "Refresh session is invalid or has expired.")

    def test_me_requires_authentication(self):
        response = self.client.get("/me")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Authentication is required.")

    def test_chatbot_messages_returns_orchestrated_response(self):
        response = self.client.post(
            "/chatbot/messages",
            json={
                "channel": "local-test",
                "customerName": "גל חליפה",
                "customerPhone": "0501234567",
                "message": "איפה המשלוח שלי?",
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["channel"], "local-test")
        self.assertEqual(body["customer"]["name"], "גל חליפה")
        self.assertEqual(body["customer"]["phone"], "0501234567")
        self.assertEqual(body["reply"], "שלום, איך אפשר לעזור עם המשלוח?")
        self.assertEqual(body["intent"], "general")
        self.assertTrue(response.headers.get("x-request-id"))

    def test_chatbot_messages_echoes_request_id_header(self):
        response = self.client.post(
            "/chatbot/messages",
            headers={"X-Request-ID": "python-test-request-id"},
            json={
                "channel": "local-test",
                "customerName": "Gal Halifa",
                "customerPhone": "0501234567",
                "message": "Where is AB1001?",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("x-request-id"), "python-test-request-id")

    def test_chatbot_messages_requires_phone_and_message(self):
        response = self.client.post(
            "/chatbot/messages",
            json={
                "channel": "local-test",
                "customerName": "גל חליפה",
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_whatsapp_webhook_returns_twiml_response(self):
        response = self.client.post(
            "/chatbot/webhooks/whatsapp",
            data={
                "From": "whatsapp:+972501234567",
                "Body": "איפה המשלוח שלי?",
                "ProfileName": "גל חליפה",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("application/xml", response.headers["content-type"])
        self.assertIn("<Response><Message>שלום, איך אפשר לעזור עם המשלוח?</Message></Response>", response.text)

    def test_whatsapp_webhook_requires_sender_and_body(self):
        response = self.client.post(
            "/chatbot/webhooks/whatsapp",
            data={
                "ProfileName": "גל חליפה",
            },
        )

        self.assertEqual(response.status_code, 422)
