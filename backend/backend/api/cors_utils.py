import os
from django.conf import settings


ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://10.10.32.177:3000',
    *[origin.strip() for origin in os.environ.get('FRONTEND_URL', '').split(',') if origin.strip()],
]


def cors(request, response):
    origin = request.META.get('HTTP_ORIGIN', '')
    allowed = (
        settings.DEBUG
        or origin in ALLOWED_ORIGINS
        or (origin and origin.endswith('.onrender.com'))
        or (origin and origin.endswith('.vercel.app'))
    )
    response['Access-Control-Allow-Origin'] = (origin if origin else '*') if allowed else ''
    response['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, PUT, DELETE, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type'
    return response
