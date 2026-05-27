from django.contrib import admin
from django.urls import path, include
from .api import (
    comments,
    commenters,
    create_user,
    events,
    login_user,
    off_collection,
    off_item,
    off_state,
    test_mongodb_connection,
    test_url,
)

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
    path('api/off/state/', off_state),
    path('api/off/<str:collection_name>/', off_collection),
    path('api/off/<str:collection_name>/<str:item_id>/', off_item),
]
