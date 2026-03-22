from app.db import refresh_sessions_collection


class RefreshSessionRepository:
    def __init__(self, collection):
        self.collection = collection

    def create_session(self, session_document: dict):
        return self.collection.insert_one(session_document)

    def get_session(self, session_id: str):
        return self.collection.find_one({"sessionId": session_id})

    def rotate_session(self, session_id: str, refresh_token_hash: str, expires_at: int, last_used_at: int):
        return self.collection.update_one(
            {"sessionId": session_id},
            {
                "$set": {
                    "refreshTokenHash": refresh_token_hash,
                    "expiresAt": expires_at,
                    "lastUsedAt": last_used_at,
                }
            },
        )

    def revoke_session(self, session_id: str, revoked_at: int):
        return self.collection.update_one(
            {"sessionId": session_id},
            {"$set": {"revokedAt": revoked_at}},
        )

    def revoke_all_sessions(self, user_email: str, revoked_at: int):
        return self.collection.update_many(
            {"userEmail": user_email.lower(), "revokedAt": None},
            {"$set": {"revokedAt": revoked_at}},
        )


refresh_session_repository = RefreshSessionRepository(refresh_sessions_collection)

__all__ = ["RefreshSessionRepository", "refresh_session_repository"]
