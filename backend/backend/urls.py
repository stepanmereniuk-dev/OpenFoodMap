from django.contrib import admin
from .api import test_url, test_mongodb_connection
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/test-url/', test_url),
    path('api/test-mongodb-connection/', test_mongodb_connection),
    path('api/products/', include('products.urls')),
]
