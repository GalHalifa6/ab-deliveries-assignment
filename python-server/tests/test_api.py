import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

import main


class FakeUsersCollection:
    def __init__(self):
        self.documents = {}

    def find_one(self, query):
        return self.documents.get(query["email"])

    def insert_one(self, document):
        self.documents[document["email"]] = dict(document)
        return SimpleNamespace(inserted_id=document["email"])


class PythonServerApiIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.fake_collection = FakeUsersCollection()
        self.original_collection = main.users_collection
        main.users_collection = self.fake_collection
        self.toast_patch = patch.object(main, "fetch_toast_message", return_value="Test toast message")
        self.toast_patch.start()
        self.client = TestClient(main.app)

    def tearDown(self):
        self.toast_patch.stop()
        main.users_collection = self.original_collection

    def test_health_check_returns_service_metadata(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertEqual(response.json()["service"], "python-server")

    def test_register_success_persists_user_and_toast_message(self):
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
        self.assertEqual(body["toastMessage"], "Test toast message")

        stored_user = self.fake_collection.documents["gal@example.com"]
        self.assertEqual(stored_user["toastMessage"], "Test toast message")
        self.assertNotEqual(stored_user["passwordHash"], payload["password"])
        self.assertTrue(main.pwd_context.verify(payload["password"], stored_user["passwordHash"]))

    def test_register_rejects_duplicate_email(self):
        existing_password_hash = main.pwd_context.hash("existing123")
        self.fake_collection.documents["gal@example.com"] = {
            "fullName": "Gal Halifa",
            "phone": "0501234567",
            "email": "gal@example.com",
            "passwordHash": existing_password_hash,
            "toastMessage": "Existing toast",
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
                "password": "123",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Password must be at least 6 characters long.")

    def test_login_returns_user_details_for_valid_credentials(self):
        password = "welcome123"
        self.fake_collection.documents["gal@example.com"] = {
            "fullName": "Gal Halifa",
            "phone": "0501234567",
            "email": "gal@example.com",
            "passwordHash": main.pwd_context.hash(password),
            "toastMessage": "Stored toast",
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

    def test_login_rejects_invalid_password(self):
        self.fake_collection.documents["gal@example.com"] = {
            "fullName": "Gal Halifa",
            "phone": "0501234567",
            "email": "gal@example.com",
            "passwordHash": main.pwd_context.hash("correct-password"),
            "toastMessage": "Stored toast",
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
