from django.conf import settings


ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://10.10.32.177:3000',
]


def cors(request, response):
    origin = request.META.get('HTTP_ORIGIN', '')
    allowed = settings.DEBUG or origin in ALLOWED_ORIGINS
    response['Access-Control-Allow-Origin'] = (origin if origin else '*') if allowed else ''
    response['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type'
    return response
