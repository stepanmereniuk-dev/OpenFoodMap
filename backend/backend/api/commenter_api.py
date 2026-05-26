import json
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from pymongo import MongoClient
from .cors_utils import cors


def get_db():
    client = MongoClient(settings.MONGO_URI)
    return client[settings.MONGO_DB]


@csrf_exempt
def commenters(request):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    db = get_db()

    if request.method == 'GET':
        all_commenters = list(db.commenters.find({}, {'_id': 0}))
        return cors(request, JsonResponse({'commenters': all_commenters}))

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return cors(request, JsonResponse({'error': 'Invalid JSON'}, status=400))

        username = body.get('username', '').strip()
        bio = body.get('bio', '').strip()

        if not username:
            return cors(request, JsonResponse({'error': 'username is required'}, status=400))

        if not db.users.find_one({'username': username}):
            return cors(request, JsonResponse({'error': 'User not found'}, status=404))

        if db.commenters.find_one({'username': username}):
            return cors(request, JsonResponse({'error': 'Commenter profile already exists'}, status=409))

        db.commenters.insert_one({'username': username, 'bio': bio})
        return cors(request, JsonResponse({'message': f'Commenter {username} created'}, status=201))

    return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))
