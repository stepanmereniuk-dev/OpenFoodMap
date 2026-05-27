from functools import lru_cache
from uuid import uuid4

from bson import ObjectId
from django.conf import settings
from pymongo import MongoClient


@lru_cache(maxsize=1)
def get_client():
    return MongoClient(settings.MONGO_URI)


def get_db():
    return get_client()[settings.MONGO_DB]


def new_id():
    return str(uuid4())


def json_value(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [json_value(item) for item in value]
    if isinstance(value, dict):
        return {str(key): json_value(item) for key, item in value.items()}
    return value


def json_document(document):
    if not document:
        return document
    return {key: json_value(value) for key, value in document.items() if key != '_id'}


def collection_documents(name, query=None):
    return [json_document(document) for document in get_db()[name].find(query or {})]
