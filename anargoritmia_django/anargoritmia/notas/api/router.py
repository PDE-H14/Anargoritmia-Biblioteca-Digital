from rest_framework.routers import DefaultRouter
from .views import NotaViewSet
from .correcciones import CorreccionViewSet

router = DefaultRouter()
router.register(prefix='notas', viewset=NotaViewSet, basename='notas')
router.register(prefix='correcciones', viewset=CorreccionViewSet, basename='correcciones')

urlpatterns = router.urls
