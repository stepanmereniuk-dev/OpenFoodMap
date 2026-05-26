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
def events(request):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    db = get_db()

    if request.method == 'GET':
        all_events = list(db.events.find({}, {'_id': 0}))
        return cors(request, JsonResponse({'events': all_events}))

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return cors(request, JsonResponse({'error': 'Invalid JSON'}, status=400))

        title = body.get('title', '').strip()
        description = body.get('description', '').strip()
        location = body.get('location', '').strip()
        start_date = body.get('start_date', '').strip()
        end_date = body.get('end_date', '').strip()
        organizer = body.get('organizer', '').strip()

        if not title or not start_date:
            return cors(request, JsonResponse({'error': 'title and start_date are required'}, status=400))

        db.events.insert_one({
            'title': title,
            'description': description,
            'location': location,
            'start_date': start_date,
            'end_date': end_date,
            'organizer': organizer,
        })
        return cors(request, JsonResponse({'message': f'Event "{title}" created'}, status=201))

    return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))
