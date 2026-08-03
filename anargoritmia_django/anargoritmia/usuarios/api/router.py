from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from usuarios.api.views import UserApiViewSet, UserView

router_user = DefaultRouter()
router_user.register(
    prefix="usuarios", basename="usuarios", viewset=UserApiViewSet
)

# Unificamos las rutas personalizadas de autenticación con las del CRUD en un solo punto de exportación
urlpatterns = [
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/me/", UserView.as_view()),
    path("", include(router_user.urls)),
]