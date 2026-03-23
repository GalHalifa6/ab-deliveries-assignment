import unittest

from fastapi.testclient import TestClient

import main


class ClientTelemetryApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def test_client_telemetry_route_accepts_structured_event(self):
        response = self.client.post(
            "/telemetry/client",
            headers={"X-Request-ID": "telemetry-test-request"},
            json={
                "event": "auth_submit_started",
                "client": "web",
                "platform": "browser",
                "mode": "login",
                "endpoint": "/login",
                "email": "gal@example.com",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["event"], "auth_submit_started")
        self.assertEqual(response.headers.get("x-request-id"), "telemetry-test-request")
