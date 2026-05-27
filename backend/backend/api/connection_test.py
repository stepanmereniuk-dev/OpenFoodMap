from django.conf import settings
from django.http import JsonResponse
from pymongo import MongoClient

def test_url(request):
    return JsonResponse({'message': 'Connection successful'})

def test_mongodb_connection(request):
    client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=3000)
    db = client[settings.MONGO_DB]  
    db.command('ping')
    collections = db.list_collection_names()
    return JsonResponse({'status': 'connected', 'collections': collections})    