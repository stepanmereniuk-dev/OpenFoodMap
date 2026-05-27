import json
import hashlib
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from pymongo import MongoClient
from .cors_utils import cors


def get_db():
    client = MongoClient(settings.MONGO_URI)
    return client[settings.MONGO_DB]


@csrf_exempt
def create_user(request):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    if request.method != 'POST':
        return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return cors(request, JsonResponse({'error': 'Invalid JSON'}, status=400))

    username = body.get('username', '').strip()
    email = body.get('email', '').strip()
    password = body.get('password', '').strip()

    if not username or not email or not password:
        return cors(request, JsonResponse({'error': 'username, email and password are required'}, status=400))

    db = get_db()

    if db.users.find_one({'$or': [{'username': username}, {'email': email}]}):
        return cors(request, JsonResponse({'error': 'Username or email already exists'}, status=409))

    hashed = hashlib.sha256(password.encode()).hexdigest()
    db.users.insert_one({'username': username, 'email': email, 'password': hashed})

    return cors(request, JsonResponse({'message': f'User {username} created successfully', 'username': username}, status=201))


@csrf_exempt
def login_user(request):
    if request.method == 'OPTIONS':
        return cors(request, JsonResponse({}))

    if request.method != 'POST':
        return cors(request, JsonResponse({'error': 'Method not allowed'}, status=405))

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return cors(request, JsonResponse({'error': 'Invalid JSON'}, status=400))

    username = body.get('username', '').strip()
    password = body.get('password', '').strip()

    if not username or not password:
        return cors(request, JsonResponse({'error': 'username and password are required'}, status=400))

    db = get_db()
    hashed = hashlib.sha256(password.encode()).hexdigest()
    user = db.users.find_one({'username': username, 'password': hashed})

    if not user:
        return cors(request, JsonResponse({'error': 'Invalid username or password'}, status=401))

    return cors(request, JsonResponse({'message': 'Login successful', 'username': username}))
