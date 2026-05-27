from django.contrib import admin
from django.urls import path, include
from .api import test_url, test_mongodb_connection, create_user, login_user, commenters, events, comments

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/test-url/', test_url),
    path('api/test-mongodb-connection/', test_mongodb_connection),
    path('api/products/', include('products.urls')),
    path('api/users/create/', create_user),
    path('api/users/login/', login_user),
    path('api/commenters/', commenters),
    path('api/events/', events),
    path('api/comments/', comments),
]
