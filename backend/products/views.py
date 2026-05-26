import json
from django.conf import settings
from django.http import JsonResponse
from pymongo import MongoClient


client = MongoClient(settings.MONGO_URI)
db = client[settings.MONGO_DB]


def get_products(request):
    products = list(db.products.find({}, {'_id': 0}).limit(20))
    return JsonResponse(products, safe=False)


def get_product(request, barcode):
    product = db.products.find_one({'code': barcode}, {'_id': 0})
    if product is None:
        return JsonResponse({'error': 'Product not found'}, status=404)
    return JsonResponse(product)
