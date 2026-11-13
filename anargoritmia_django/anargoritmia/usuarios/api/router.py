from django.urls import path, include
from rest_framework.routers import DefaultRouter

from usuarios.api.views import AccesoView, RegistroView, RenovarView, SalirView, UserApiViewSet, UserView

router_user = DefaultRouter()
router_user.register(
    prefix="usuarios", basename="usuarios", viewset=UserApiViewSet
)

# Unificamos las rutas personalizadas de autenticación con las del CRUD en un solo punto de exportación
urlpatterns = [
    path("auth/login/", AccesoView.as_view(), name="token_obtain_pair"),
    # Renovación (rota el token de renovación) y salida (lo revoca); ver usuarios/sesiones.py
    path("auth/renovar/", RenovarView.as_view(), name="token_renovar"),
    path("auth/salir/", SalirView.as_view(), name="token_salir"),
    path("auth/registro/", RegistroView.as_view(), name="registro"),
    path("auth/me/", UserView.as_view()),
    path("", include(router_user.urls)),
]
