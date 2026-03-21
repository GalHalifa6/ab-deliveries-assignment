import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

import main


class FakeUsersCollection:
    def __init__(self):
        self.documents = {}

    def create_index(self, *args, **kwargs):
        return None

    def find_one(self, query):
        return self.documents.get(query["email"])

    def insert_one(self, document):
        self.documents[document["email"]] = dict(document)
        return SimpleNamespace(inserted_id=document["email"])

    def update_one(self, query, update):
        document = self.documents.get(query["email"])

        if not document:
            return SimpleNamespace(matched_count=0, modified_count=0)

        document.update(update.get("$set", {}))
        return SimpleNamespace(matched_count=1, modified_count=1)


class FakeSessionsCollection:
    def __init__(self):
        self.documents = {}

    def create_index(self, *args, **kwargs):
        return None

    def find_one(self, query):
        return self.documents.get(query["sessionId"])

    def insert_one(self, document):
        self.documents[document["sessionId"]] = dict(document)
        return SimpleNamespace(inserted_id=document["sessionId"])

    def delete_one(self, query):
        existed = self.documents.pop(query["sessionId"], None)
        return SimpleNamespace(deleted_count=1 if existed else 0)


class PythonServerApiIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.fake_users_collection = FakeUsersCollection()
        self.fake_sessions_collection = FakeSessionsCollection()
        self.original_users_collection = main.users_collection
        self.original_sessions_collection = main.sessions_collection
        main.users_collection = self.fake_users_collection
        main.sessions_collection = self.fake_sessions_collection
        self.toast_patch = patch.object(main, "fetch_toast_message", return_value="Test toast message")
        self.toast_patch.start()
        self.client = TestClient(main.app)

    def tearDown(self):
        self.toast_patch.stop()
        main.users_collection = self.original_users_collection
        main.sessions_collection = self.original_sessions_collection

    def test_health_check_returns_service_metadata(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertEqual(response.json()["service"], "python-server")

    def test_register_success_persists_user_sets_web_session_and_toast_message(self):
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
        self.assertTrue(body["auth"]["sessionCookie"])
        self.assertIn(main.session_cookie_name, response.cookies)

        stored_user = self.fake_users_collection.documents["gal@example.com"]
        self.assertEqual(stored_user["toastMessage"], "Test toast message")
        self.assertNotEqual(stored_user["passwordHash"], payload["password"])
        self.assertTrue(main.pwd_context.verify(payload["password"], stored_user["passwordHash"]))
        self.assertEqual(len(self.fake_sessions_collection.documents), 1)

    def test_register_mobile_returns_access_token(self):
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
        self.assertEqual(response.json()["auth"]["clientType"], "mobile")
        self.assertIn("accessToken", response.json()["auth"])
        self.assertEqual(len(self.fake_sessions_collection.documents), 0)

    def test_me_toast_returns_ready_for_authenticated_web_session(self):
        self.fake_users_collection.documents["gal@example.com"] = {
            "fullName": "Gal Halifa",
            "phone": "0501234567",
            "email": "gal@example.com",
            "passwordHash": "hash",
            "toastMessage": "Stored toast",
            "createdAt": 1,
        }
        self.fake_sessions_collection.documents["session-1"] = {
            "sessionId": "session-1",
            "email": "gal@example.com",
            "expiresAt": 9999999999,
        }

        response = self.client.get("/me/toast", cookies={main.session_cookie_name: "session-1"})

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ready"])
        self.assertEqual(response.json()["toastMessage"], "Stored toast")

    def test_me_returns_current_user_for_mobile_access_token(self):
        password = "welcome123"
        self.fake_users_collection.documents["gal@example.com"] = {
            "fullName": "Gal Halifa",
            "phone": "0501234567",
            "email": "gal@example.com",
            "passwordHash": main.pwd_context.hash(password),
            "toastMessage": "Stored toast",
            "createdAt": 1,
        }

        login_response = self.client.post(
            "/login",
            headers={"X-Client-Type": "mobile"},
            json={
                "email": "gal@example.com",
                "password": password,
            },
        )

        access_token = login_response.json()["auth"]["accessToken"]

        response = self.client.get("/me", headers={"Authorization": f"Bearer {access_token}"})

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["authenticated"])
        self.assertEqual(response.json()["user"]["email"], "gal@example.com")

    def test_register_rejects_duplicate_email(self):
        existing_password_hash = main.pwd_context.hash("existing123")
        self.fake_users_collection.documents["gal@example.com"] = {
            "fullName": "Gal Halifa",
            "phone": "0501234567",
            "email": "gal@example.com",
            "passwordHash": existing_password_hash,
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

    def test_login_returns_user_details_for_valid_web_credentials(self):
        password = "welcome123"
        self.fake_users_collection.documents["gal@example.com"] = {
            "fullName": "Gal Halifa",
            "phone": "0501234567",
            "email": "gal@example.com",
            "passwordHash": main.pwd_context.hash(password),
            "toastMessage": "Stored toast",
            "createdAt": 1,
        }

        response = self.client.post(
            "/login",
            json={
                "email": "gal@example.com",
                "password": password,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["user"]["email"], "gal@example.com")
        self.assertEqual(response.json()["auth"]["clientType"], "web")
        self.assertIn(main.session_cookie_name, response.cookies)

    def test_login_rejects_invalid_password(self):
        self.fake_users_collection.documents["gal@example.com"] = {
            "fullName": "Gal Halifa",
            "phone": "0501234567",
            "email": "gal@example.com",
            "passwordHash": main.pwd_context.hash("correct-password"),
            "toastMessage": "Stored toast",
            "createdAt": 1,
        }

        response = self.client.post(
            "/login",
            json={
                "email": "gal@example.com",
                "password": "wrong-password",
            },
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid email or password.")

    def test_logout_clears_active_web_session(self):
        self.fake_sessions_collection.documents["session-1"] = {
            "sessionId": "session-1",
            "email": "gal@example.com",
            "expiresAt": 9999999999,
        }

        response = self.client.post("/logout", cookies={main.session_cookie_name: "session-1"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["success"], True)
        self.assertEqual(self.fake_sessions_collection.documents, {})

    def test_me_requires_authentication(self):
        response = self.client.get("/me")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Authentication is required.")
