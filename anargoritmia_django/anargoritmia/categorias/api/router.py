from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet

router = DefaultRouter()
router.register(prefix='categorias', viewset=CategoriaViewSet, basename='notas')

urlpatterns = router.urls