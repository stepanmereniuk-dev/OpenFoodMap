from django.http import JsonResponse
from backend.api.mongo import get_db, json_document


def get_products(request):
    products = [json_document(product) for product in get_db().products.find({}).limit(20)]
    return JsonResponse(products, safe=False)


def get_product(request, barcode):
    product = json_document(get_db().products.find_one({'code': barcode}))
    if product is None:
        return JsonResponse({'error': 'Product not found'}, status=404)
    return JsonResponse(product)
