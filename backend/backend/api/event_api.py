import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .cors_utils import cors
from .mongo import collection_documents, get_db, new_id


@csrf_exempt
def events(request):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    db = get_db()

    if request.method == 'GET':
        all_events = collection_documents('events')
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
        lat = body.get('lat')
        lng = body.get('lng')

        if not title or not start_date:
            return cors(request, JsonResponse({'error': 'title and start_date are required'}, status=400))

        event = {
            'id': new_id(),
            'title': title,
            'description': description,
            'location': location,
            'start_date': start_date,
            'end_date': end_date,
            'organizer': organizer,
        }

        if lat is not None and lng is not None:
            try:
                event['lat'] = float(lat)
                event['lng'] = float(lng)
            except (ValueError, TypeError):
                pass

        db.events.insert_one(event)
        return cors(request, JsonResponse({'message': f'Event "{title}" created', 'id': event['id']}, status=201))

    return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))
