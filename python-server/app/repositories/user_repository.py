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


user_repository = UserRepository(users_collection)

__all__ = ["DuplicateKeyError", "PyMongoError", "UserRepository", "user_repository"]
