import unittest

from fastapi import Response

from app import config
from app.services import auth_cookies


class AuthCookiesUnitTests(unittest.TestCase):
    def test_set_refresh_cookie_writes_expected_cookie_attributes(self):
        response = Response()

        auth_cookies.set_refresh_cookie(response, "refresh-token-123")

        header = response.headers.get("set-cookie", "")
        self.assertIn(f"{config.REFRESH_COOKIE_NAME}=refresh-token-123", header)
        self.assertIn("HttpOnly", header)
        self.assertIn("Path=/", header)

    def test_clear_refresh_cookie_sets_deletion_header(self):
        response = Response()

        auth_cookies.clear_refresh_cookie(response)

        header = response.headers.get("set-cookie", "")
        self.assertIn(f"{config.REFRESH_COOKIE_NAME}=\"\"", header)
        self.assertIn("Max-Age=0", header)

    def test_set_stream_cookie_uses_stream_path(self):
        response = Response()

        auth_cookies.set_stream_cookie(response, "stream-token-123")

        header = response.headers.get("set-cookie", "")
        self.assertIn(f"{config.STREAM_COOKIE_NAME}=stream-token-123", header)
        self.assertIn("Path=/me/toast/stream", header)

