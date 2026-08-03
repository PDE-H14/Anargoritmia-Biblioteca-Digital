from rest_framework.routers import DefaultRouter
from .views import NotaViewSet

router = DefaultRouter()
router.register(prefix='notas', viewset=NotaViewSet, basename='notas')

urlpatterns = router.urls