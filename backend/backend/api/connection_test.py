from django.http import JsonResponse
from .mongo import get_db

def test_url(request):
    return JsonResponse({'message': 'Connection successful'})

def test_mongodb_connection(request):
    db = get_db()
    db.command('ping')
    collections = db.list_collection_names()
    return JsonResponse({'status': 'connected', 'collections': collections})    
