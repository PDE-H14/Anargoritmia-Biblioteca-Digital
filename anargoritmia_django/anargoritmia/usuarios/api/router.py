from django.urls import path
from rest_framework.routers import DefaultRouter
from usuarios.api.views import UserApiViewSet

router_user = DefaultRouter()
router_user.register(
    prefix = "usuarios", basename = "usuarios", viewset = UserApiViewSet
)