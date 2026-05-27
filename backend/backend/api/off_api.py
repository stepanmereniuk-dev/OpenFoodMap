import json
from queue import Empty, Full, Queue
from threading import Event, Lock, Thread

from django.http import JsonResponse, StreamingHttpResponse
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
SUBSCRIBERS = set()
SUBSCRIBERS_LOCK = Lock()


def parse_body(request):
    try:
        return json.loads(request.body or b'{}')
    except json.JSONDecodeError:
        return None


def sse_event(event_name, data):
    return f'event: {event_name}\ndata: {json.dumps(data)}\n\n'


def subscribe():
    subscriber = Queue(maxsize=100)

    with SUBSCRIBERS_LOCK:
        SUBSCRIBERS.add(subscriber)

    return subscriber


def unsubscribe(subscriber):
    with SUBSCRIBERS_LOCK:
        SUBSCRIBERS.discard(subscriber)


def queue_event(subscriber, event_name, data):
    try:
        subscriber.put_nowait(sse_event(event_name, data))
    except Full:
        unsubscribe(subscriber)


def publish_event(event_name, data):
    with SUBSCRIBERS_LOCK:
        subscribers = list(SUBSCRIBERS)

    for subscriber in subscribers:
        queue_event(subscriber, event_name, data)


def publish_message(item, operation):
    publish_event('off-message', {
        'item': json_document(item),
        'operation': operation,
    })


def watch_messages(subscriber, stop_event):
    pipeline = [{'$match': {'operationType': {'$in': ['insert', 'replace', 'update']}}}]

    try:
        with get_db().messages.watch(pipeline, full_document='updateLookup', max_await_time_ms=10000) as changes:
            while not stop_event.is_set():
                change = changes.try_next()

                if change is None:
                    continue

                document = change.get('fullDocument')
                if document:
                    queue_event(subscriber, 'off-message', {
                        'item': json_document(document),
                        'operation': change.get('operationType'),
                    })
    except Exception as error:
        if not stop_event.is_set():
            queue_event(subscriber, 'off-error', {'error': str(error)})


@csrf_exempt
def off_state(request):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    if request.method != 'GET':
        return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))

    return cors(request, JsonResponse({
        collection: collection_documents(collection)
        for collection in OFF_COLLECTIONS
    }))


@csrf_exempt
def off_stream(request):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    if request.method != 'GET':
        return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))

    def stream_changes():
        subscriber = subscribe()
        stop_event = Event()
        watcher = Thread(target=watch_messages, args=(subscriber, stop_event), daemon=True)
        watcher.start()

        yield sse_event('ready', {'ok': True})

        try:
            while True:
                try:
                    yield subscriber.get(timeout=20)
                except Empty:
                    yield ': keepalive\n\n'
        finally:
            stop_event.set()
            unsubscribe(subscriber)

    response = StreamingHttpResponse(stream_changes(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return cors(request, response)


@csrf_exempt
def off_collection(request, collection_name):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    if collection_name not in OFF_COLLECTIONS:
        return cors(request, JsonResponse({'error': 'Unknown collection'}, status=404))

    collection = get_db()[collection_name]

    if request.method == 'GET':
        return cors(request, JsonResponse({collection_name: collection_documents(collection_name)}))

    if request.method == 'POST':
        body = parse_body(request)
        if body is None:
            return cors(request, JsonResponse({'error': 'Invalid JSON'}, status=400))

        item = dict(body)
        item['id'] = item.get('id') or new_id()
        collection.insert_one(item)
        saved_item = json_document(item)

        if collection_name == 'messages':
            publish_message(saved_item, 'insert')

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

        if collection_name == 'messages':
            publish_message(saved_item, 'update')

        return cors(request, JsonResponse({'item': saved_item}))

    if request.method == 'DELETE':
        result = collection.delete_one(query)
        if result.deleted_count == 0:
            return cors(request, JsonResponse({'error': 'Not found'}, status=404))
        return cors(request, JsonResponse({'ok': True}))

    return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))
