import json
from datetime import datetime, timezone
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from pymongo import MongoClient
from .cors_utils import cors


def get_db():
    client = MongoClient(settings.MONGO_URI)
    return client[settings.MONGO_DB]


@csrf_exempt
def comments(request):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    db = get_db()

    if request.method == 'GET':
        event_id = request.GET.get('event_id', '').strip()
        if not event_id:
            return cors(request, JsonResponse({'error': 'event_id is required'}, status=400))
        result = list(db.comments.find({'event_id': event_id}, {'_id': 0}))
        return cors(request, JsonResponse({'comments': result}))

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return cors(request, JsonResponse({'error': 'Invalid JSON'}, status=400))

        event_id = body.get('event_id', '').strip()
        username = body.get('username', '').strip()
        text = body.get('text', '').strip()

        if not event_id or not username or not text:
            return cors(request, JsonResponse({'error': 'event_id, username and text are required'}, status=400))

        db.comments.insert_one({
            'event_id': event_id,
            'username': username,
            'text': text,
            'created_at': datetime.now(timezone.utc).isoformat(),
        })
        return cors(request, JsonResponse({'message': 'Comment added'}, status=201))

    return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))
