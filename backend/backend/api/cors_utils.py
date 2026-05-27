def cors(request, response):
    origin = request.META.get('HTTP_ORIGIN', '')
    response['Access-Control-Allow-Origin'] = origin or '*'
    response['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, PUT, DELETE, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type'
    response['Access-Control-Max-Age'] = '86400'
    return response
