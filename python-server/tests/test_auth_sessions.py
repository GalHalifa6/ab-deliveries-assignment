import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from pymongo.errors import PyMongoError

from app.services import auth_sessions


class AuthSessionsUnitTests(unittest.TestCase):
    @patch("app.services.auth_sessions.time.time", return_value=1000)
    @patch("app.services.auth_sessions.secrets.token_urlsafe", side_effect=["session-token", "family-token"])
    @patch("app.services.auth_sessions.token_service.hash_refresh_token", return_value="hashed-refresh-token")
    @patch("app.services.auth_sessions.token_service.generate_refresh_token", return_value="refresh-token")
    @patch("app.services.auth_sessions.refresh_session_repository.create_session")
    def test_create_refresh_session_builds_and_persists_session_document(
        self,
        create_session_mock,
        generate_refresh_token_mock,
        hash_refresh_token_mock,
        _token_urlsafe_mock,
        _time_mock,
    ):
        session, refresh_token = auth_sessions.create_refresh_session("Gal@Example.com", "web")

        self.assertEqual(refresh_token, "refresh-token")
        self.assertEqual(session["sessionId"], "session-token")
        self.assertEqual(session["userEmail"], "gal@example.com")
        self.assertEqual(session["clientType"], "web")
        self.assertEqual(session["refreshTokenHash"], "hashed-refresh-token")
        generate_refresh_token_mock.assert_called_once_with("session-token")
        hash_refresh_token_mock.assert_called_once_with("refresh-token")
        create_session_mock.assert_called_once()

    @patch("app.services.auth_sessions.refresh_session_repository.create_session", side_effect=PyMongoError("boom"))
    def test_create_refresh_session_converts_repository_errors(self, _create_session_mock):
        with self.assertRaises(HTTPException) as error:
            auth_sessions.create_refresh_session("gal@example.com", "web")

        self.assertEqual(error.exception.status_code, 500)

    @patch("app.services.auth_sessions.refresh_session_repository.get_session", return_value={"sessionId": "abc"})
    def test_get_refresh_session_returns_repository_result(self, get_session_mock):
        result = auth_sessions.get_refresh_session("abc")

        self.assertEqual(result, {"sessionId": "abc"})
        get_session_mock.assert_called_once_with("abc")

    @patch("app.services.auth_sessions.time.time", return_value=2000)
    @patch("app.services.auth_sessions.token_service.hash_refresh_token", return_value="hashed-refresh-token")
    @patch("app.services.auth_sessions.refresh_session_repository.rotate_session")
    def test_rotate_refresh_session_updates_hash_and_expiry(self, rotate_session_mock, hash_refresh_token_mock, _time_mock):
        auth_sessions.rotate_refresh_session("session-id", "new-refresh-token")

        hash_refresh_token_mock.assert_called_once_with("new-refresh-token")
        rotate_session_mock.assert_called_once()
        args = rotate_session_mock.call_args.args
        self.assertEqual(args[0], "session-id")
        self.assertEqual(args[1], "hashed-refresh-token")

    @patch("app.services.auth_sessions.time.time", return_value=3000)
    @patch("app.services.auth_sessions.refresh_session_repository.revoke_all_sessions")
    def test_revoke_all_refresh_sessions_uses_lower_level_repository(self, revoke_all_mock, _time_mock):
        auth_sessions.revoke_all_refresh_sessions("gal@example.com")

        revoke_all_mock.assert_called_once()
        self.assertEqual(revoke_all_mock.call_args.args[0], "gal@example.com")

