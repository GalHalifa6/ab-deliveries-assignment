import json
import unittest
from unittest.mock import patch
from urllib.error import URLError

import main


class FakeHttpResponse:
    def __init__(self, payload):
        self.payload = payload

    def read(self):
        return self.payload.encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class ToastMessageUnitTests(unittest.TestCase):
    def test_fetch_toast_message_returns_message_from_node_ai(self):
        payload = json.dumps({"toastMessage": "Industry standard toast"})

        with patch.object(main, "urlopen", return_value=FakeHttpResponse(payload)):
            message = main.fetch_toast_message()

        self.assertEqual(message, "Industry standard toast")

    def test_fetch_toast_message_returns_fallback_on_url_error(self):
        with patch.object(main, "urlopen", side_effect=URLError("boom")):
            message = main.fetch_toast_message()

        self.assertEqual(
            message,
            "Welcome aboard. We are getting your first delivery update ready.",
        )

    def test_fetch_toast_message_returns_fallback_on_invalid_json(self):
        with patch.object(main, "urlopen", return_value=FakeHttpResponse("not-json")):
            message = main.fetch_toast_message()

        self.assertEqual(
            message,
            "Welcome aboard. We are getting your first delivery update ready.",
        )

    def test_fetch_toast_message_retries_before_returning_fallback(self):
        with (
            patch.object(main, "urlopen", side_effect=[URLError("boom"), FakeHttpResponse(json.dumps({"toastMessage": "Retry success"}))]),
            patch.object(main.time, "sleep"),
        ):
            message = main.fetch_toast_message()

        self.assertEqual(message, "Retry success")
