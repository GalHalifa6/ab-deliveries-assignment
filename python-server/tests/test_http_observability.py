import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.http_observability import attach_request_observability


class HttpObservabilityUnitTests(unittest.TestCase):
    def test_middleware_sets_request_id_header_and_logs_start_and_completion(self):
        app = FastAPI()

        @app.get("/demo")
        def demo():
            return {"ok": True}

        with patch("app.http_observability.build_request_id", return_value="generated-request-id"), patch(
            "app.http_observability.log_event"
        ) as log_event_mock:
            attach_request_observability(app, logger=object())
            client = TestClient(app)

            response = client.get("/demo")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("x-request-id"), "generated-request-id")
        self.assertEqual(log_event_mock.call_count, 2)
        self.assertEqual(log_event_mock.call_args_list[0].args[1], "http_request_started")
        self.assertEqual(log_event_mock.call_args_list[1].args[1], "http_request_completed")

    def test_middleware_preserves_incoming_request_id(self):
        app = FastAPI()

        @app.get("/demo")
        def demo():
            return {"ok": True}

        with patch("app.http_observability.log_event"):
            attach_request_observability(app, logger=object())
            client = TestClient(app)
            response = client.get("/demo", headers={"X-Request-ID": "incoming-id"})

        self.assertEqual(response.headers.get("x-request-id"), "incoming-id")
