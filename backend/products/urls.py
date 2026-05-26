from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_products),
    path('<str:barcode>/', views.get_product),
]
