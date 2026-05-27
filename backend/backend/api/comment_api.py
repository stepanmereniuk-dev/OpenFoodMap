import json
from datetime import datetime, timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .cors_utils import cors
from .mongo import get_db, json_document, new_id


@csrf_exempt
def comments(request):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    db = get_db()

    if request.method == 'GET':
        event_id = request.GET.get('event_id', '').strip()
        if not event_id:
            return cors(request, JsonResponse({'error': 'event_id is required'}, status=400))
        result = [json_document(comment) for comment in db.comments.find({'event_id': event_id})]
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
            'id': new_id(),
            'event_id': event_id,
            'username': username,
            'text': text,
            'created_at': datetime.now(timezone.utc).isoformat(),
        })
        return cors(request, JsonResponse({'message': 'Comment added'}, status=201))

    return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))
