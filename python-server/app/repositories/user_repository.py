from pymongo.errors import DuplicateKeyError, PyMongoError

from app.db import users_collection


class UserRepository:
    def __init__(self, collection):
        self.collection = collection

    def get_by_email(self, email: str):
        return self.collection.find_one({"email": email.lower()})

    def create_user(self, user_document: dict):
        return self.collection.insert_one(user_document)

    def update_toast_message(self, email: str, toast_message: str):
        return self.collection.update_one(
            {"email": email.lower()},
            {"$set": {"toastMessage": toast_message}},
        )

    def update_google_profile(self, email: str, full_name: str, picture: str | None = None):
        update_fields = {
            "fullName": full_name,
            "authProvider": "google",
        }

        if picture:
            update_fields["avatarUrl"] = picture

        return self.collection.update_one(
            {"email": email.lower()},
            {"$set": update_fields},
        )

    def update_profile_phone(self, email: str, phone: str):
        return self.collection.update_one(
            {"email": email.lower()},
            {"$set": {"phone": phone.strip()}},
        )


user_repository = UserRepository(users_collection)

__all__ = ["DuplicateKeyError", "PyMongoError", "UserRepository", "user_repository"]
