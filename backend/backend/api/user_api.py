import json
import hashlib
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from pymongo import MongoClient


def get_db():
    client = MongoClient(settings.MONGO_URI)
    return client[settings.MONGO_DB]


def cors(response):
    response['Access-Control-Allow-Origin'] = 'http://localhost:3000'
    response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


@csrf_exempt
def create_user(request):
    if request.method == 'OPTIONS':
        return cors(JsonResponse({}))

    if request.method != 'POST':
        return cors(JsonResponse({'error': 'Method not allowed'}, status=405))

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return cors(JsonResponse({'error': 'Invalid JSON'}, status=400))

    username = body.get('username', '').strip()
    email = body.get('email', '').strip()
    password = body.get('password', '').strip()

    if not username or not email or not password:
        return cors(JsonResponse({'error': 'username, email and password are required'}, status=400))

    db = get_db()

    if db.users.find_one({'$or': [{'username': username}, {'email': email}]}):
        return cors(JsonResponse({'error': 'Username or email already exists'}, status=409))

    hashed = hashlib.sha256(password.encode()).hexdigest()

    db.users.insert_one({
        'username': username,
        'email': email,
        'password': hashed,
    })

    return cors(JsonResponse({'message': f'User {username} created successfully'}, status=201))
