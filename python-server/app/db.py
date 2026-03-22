import atexit
import logging

import certifi
from pymongo import MongoClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

from app import config


logger = logging.getLogger(__name__)

mongodb_client_options = {
    "serverSelectionTimeoutMS": 5000,
}

if config.MONGODB_URI.startswith("mongodb+srv://"):
    mongodb_client_options["tlsCAFile"] = certifi.where()

client = MongoClient(config.MONGODB_URI, **mongodb_client_options)
atexit.register(client.close)
database = client[config.MONGODB_DB_NAME]
users_collection = database[config.USERS_COLLECTION_NAME]
refresh_sessions_collection = database[config.REFRESH_SESSIONS_COLLECTION_NAME]


def ensure_indexes():
    try:
        if hasattr(users_collection, "create_index"):
            users_collection.create_index("email", unique=True)

        if hasattr(refresh_sessions_collection, "create_index"):
            refresh_sessions_collection.create_index("sessionId", unique=True)
            refresh_sessions_collection.create_index("userEmail")
            refresh_sessions_collection.create_index("expiresAt")
            refresh_sessions_collection.create_index("tokenFamilyId")
    except (PyMongoError, ServerSelectionTimeoutError) as error:
        logger.warning("Skipping MongoDB index creation during startup: %s", error)


def ping_database() -> str:
    try:
        client.admin.command("ping")
        return "ok"
    except ServerSelectionTimeoutError:
        return "unreachable"
