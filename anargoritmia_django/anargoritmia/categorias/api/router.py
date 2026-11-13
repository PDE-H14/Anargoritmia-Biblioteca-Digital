from django.urls import re_path
from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet, servir_imagen

router = DefaultRouter()
router.register(prefix='categorias', viewset=CategoriaViewSet, basename='categorias')

urlpatterns = router.urls + [
    # Portadas guardadas en MongoDB (categorias/imagenes.py)
    re_path(r"^imagenes/(?P<id_imagen>[0-9a-f]{32})\.webp$", servir_imagen, name="imagen"),
]