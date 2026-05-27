import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .cors_utils import cors
from .mongo import collection_documents, get_db, json_document, new_id


OFF_COLLECTIONS = {
    'audit_logs',
    'channels',
    'events',
    'messages',
    'profiles',
    'reports',
    'threads',
    'users',
}


def parse_body(request):
    try:
        return json.loads(request.body or b'{}')
    except json.JSONDecodeError:
        return None


@csrf_exempt
def off_state(request):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    if request.method != 'GET':
        return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))

    state = {
        collection: collection_documents(collection)
        for collection in OFF_COLLECTIONS
        if collection != 'messages'
    }
    state['messages'] = []

    return cors(request, JsonResponse(state))


@csrf_exempt
def off_collection(request, collection_name):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    if collection_name not in OFF_COLLECTIONS:
        return cors(request, JsonResponse({'error': 'Unknown collection'}, status=404))

    collection = get_db()[collection_name]

    if request.method == 'GET':
        query = {}

        if collection_name == 'messages':
            target_type = request.GET.get('targetType', '').strip()
            target_id = request.GET.get('targetId', '').strip()

            if not target_type or not target_id:
                return cors(request, JsonResponse({collection_name: []}))

            query = {
                'targetType': target_type,
                'targetId': target_id,
            }

        return cors(request, JsonResponse({collection_name: collection_documents(collection_name, query)}))

    if request.method == 'POST':
        body = parse_body(request)
        if body is None:
            return cors(request, JsonResponse({'error': 'Invalid JSON'}, status=400))

        item = dict(body)
        item['id'] = item.get('id') or new_id()
        collection.insert_one(item)
        saved_item = json_document(item)

        return cors(request, JsonResponse({'item': saved_item}, status=201))

    return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))


@csrf_exempt
def off_item(request, collection_name, item_id):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    if collection_name not in OFF_COLLECTIONS:
        return cors(request, JsonResponse({'error': 'Unknown collection'}, status=404))

    collection = get_db()[collection_name]
    try:
        numeric_item_id = int(item_id)
    except ValueError:
        numeric_item_id = None
    query = {'$or': [{'id': item_id}, {'id': numeric_item_id}]} if numeric_item_id is not None else {'id': item_id}

    if request.method == 'GET':
        item = collection.find_one(query)
        if not item:
            return cors(request, JsonResponse({'error': 'Not found'}, status=404))
        return cors(request, JsonResponse({'item': json_document(item)}))

    if request.method in {'PATCH', 'PUT'}:
        body = parse_body(request)
        if body is None:
            return cors(request, JsonResponse({'error': 'Invalid JSON'}, status=400))

        updates = dict(body)
        updates.pop('_id', None)
        updates['id'] = numeric_item_id if numeric_item_id is not None else item_id
        result = collection.update_one(query, {'$set': updates})
        if result.matched_count == 0:
            return cors(request, JsonResponse({'error': 'Not found'}, status=404))

        saved_item = json_document(collection.find_one(query))

        return cors(request, JsonResponse({'item': saved_item}))

    if request.method == 'DELETE':
        result = collection.delete_one(query)
        if result.deleted_count == 0:
            return cors(request, JsonResponse({'error': 'Not found'}, status=404))
        return cors(request, JsonResponse({'ok': True}))

    return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))
